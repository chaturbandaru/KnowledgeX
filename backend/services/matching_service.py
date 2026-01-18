"""
Matching service - Hybrid approach with embeddings and LLM re-ranking.
Phase 1: Embedding-based candidate retrieval
Phase 2: LLM-based intelligent re-ranking
"""

from typing import List, Dict, Any, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from models.user import UserInDB, SkillItem
from models.match import MatchCreate
from services.embedding_service import EmbeddingService
from services.llm_service import LLMService
from services.storage_service import StorageService
from utils.similarity import batch_cosine_similarity
from core.types import MatchResult, MatchCandidate, MIN_EMBEDDING_SIMILARITY, MIN_MATCH_SCORE

logger = logging.getLogger(__name__)


class MatchingService:
    """
    Hybrid matching service combining embeddings and LLM analysis.
    """
    
    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        embedding_service: EmbeddingService,
        llm_service: LLMService,
        storage_service: StorageService
    ):
        self.db = db
        self.embedding_service = embedding_service
        self.llm_service = llm_service
        self.storage = storage_service
        
        logger.info("MatchingService initialized")
    
    async def find_matches_for_user(
        self,
        user_id: str,
        top_k: int = 10,
        use_llm: bool = True
    ) -> List[MatchResult]:
        """
        Find matches for a user's needs.
        
        Args:
            user_id: User ID to find matches for
            top_k: Number of matches to return
            use_llm: Whether to use LLM re-ranking (set False for faster, simpler matching)
            
        Returns:
            List of match results
        """
        # Get user
        user = await self.storage.get_user_by_id(user_id)
        if not user:
            logger.error(f"User {user_id} not found")
            return []
        
        if not user.skills_needed:
            logger.info(f"User {user_id} has no needs")
            return []
        
        # Phase 1: Embedding-based candidate retrieval
        candidates = await self._retrieve_candidates(user, top_k=top_k * 2)
        
        if not candidates:
            logger.info(f"No candidates found for user {user_id}")
            return []
        
        # Phase 2: LLM re-ranking (if enabled)
        if use_llm:
            matches = await self._rerank_with_llm(user, candidates, top_k=top_k)
        else:
            matches = self._convert_candidates_to_matches(candidates, top_k=top_k)
        
        # Phase 3: Check reciprocity
        matches = await self._check_reciprocity(user, matches)
        
        return matches
    
    async def _retrieve_candidates(
        self,
        user: UserInDB,
        top_k: int = 20
    ) -> List[MatchCandidate]:
        """
        Phase 1: Retrieve candidate matches using embeddings.
        
        Args:
            user: User seeking help
            top_k: Number of candidates to retrieve
            
        Returns:
            List of candidate matches
        """
        logger.info(f"Retrieving candidates for user {user.id}")
        
        # Get all active users except the current user
        potential_helpers = await self.storage.get_active_users(
            limit=200,
            exclude_user_id=user.id
        )
        
        if not potential_helpers:
            return []
        
        candidates = []
        
        # For each need, find matching skills
        for need in user.skills_needed:
            need_text = f"{need.name}. {need.description or ''}"
            
            # Generate embedding for the need
            need_embedding = await self.embedding_service.get_or_create(
                owner_user_id=user.id,
                item_type="need",
                ref_id=need.name,  # Use skill name as ref_id
                text=need_text
            )
            
            # Get embeddings for all helper skills
            for helper in potential_helpers:
                if not helper.skills_offered:
                    continue
                
                for skill in helper.skills_offered:
                    skill_text = f"{skill.name}. {skill.description or ''}"
                    
                    # Generate embedding for the skill
                    skill_embedding = await self.embedding_service.get_or_create(
                        owner_user_id=helper.id,
                        item_type="skill",
                        ref_id=skill.name,
                        text=skill_text
                    )
                    
                    # Compute similarity
                    similarity = self.embedding_service.cosine_similarity(
                        need_embedding,
                        skill_embedding
                    )
                    
                    # Filter by minimum threshold
                    if similarity >= MIN_EMBEDDING_SIMILARITY:
                        candidates.append({
                            "user_id": user.id,
                            "matched_user_id": helper.id,
                            "skill_offered": skill.name,
                            "skill_offered_description": skill.description,
                            "skill_needed": need.name,
                            "skill_needed_description": need.description,
                            "embedding_score": similarity,
                            "helper": helper,
                            "helper_skill_obj": skill,  # Store the SkillItem object
                            "seeker_need_obj": need,    # Store the SkillItem object
                            "metadata": {
                                "helper_proficiency": skill.proficiency_level,
                                "seeker_level": need.proficiency_level
                            }
                        })
        
        # Sort by similarity and take top-K
        candidates.sort(key=lambda x: x["embedding_score"], reverse=True)
        top_candidates = candidates[:top_k]
        
        logger.info(f"Retrieved {len(top_candidates)} candidates")
        return top_candidates
    
    async def _rerank_with_llm(
        self,
        user: UserInDB,
        candidates: List[MatchCandidate],
        top_k: int = 10
    ) -> List[MatchResult]:
        """
        Phase 2: Re-rank candidates using LLM analysis.
        
        Args:
            user: User seeking help
            candidates: Candidate matches from embedding phase
            top_k: Number of final matches to return
            
        Returns:
            List of re-ranked matches
        """
        logger.info(f"Re-ranking {len(candidates)} candidates with LLM")
        
        matches = []
        
        for candidate in candidates:
            helper = candidate["helper"]
            
            # Access Pydantic model attributes correctly
            seeker_need_obj = candidate.get("seeker_need_obj")
            helper_skill_obj = candidate.get("helper_skill_obj")
            
            # Build context
            seeker_context = {
                "need_level": seeker_need_obj.proficiency_level if seeker_need_obj else None,
                "need_description": candidate.get("skill_needed_description")
            }
            
            helper_context = {
                "skill_level": helper_skill_obj.proficiency_level if helper_skill_obj else None,
                "skill_description": candidate.get("skill_offered_description")
            }
            
            # Get all helper skills (for better context)
            helper_skills = [
                f"{s.name}" + (f" ({s.proficiency_level})" if s.proficiency_level else "")
                for s in helper.skills_offered
            ]
            
            try:
                # LLM analysis
                analysis = await self.llm_service.analyze_match(
                    seeker_need=f"{candidate['skill_needed']}: {candidate.get('skill_needed_description', '')}",
                    helper_skills=helper_skills,
                    seeker_context=seeker_context,
                    helper_context=helper_context,
                    embedding_score=candidate["embedding_score"]
                )
                
                # Only include if LLM says they can help
                if analysis["can_help"]:
                    matches.append({
                        "user_id": user.id,
                        "matched_user_id": helper.id,
                        "skill_offered": candidate["skill_offered"],
                        "skill_needed": candidate["skill_needed"],
                        "match_score": analysis["adjusted_score"],
                        "confidence": analysis["confidence"],
                        "explanation": analysis["explanation"],
                        "is_reciprocal": False,  # Will be checked later
                        "metadata": {
                            **candidate["metadata"],
                            "embedding_score": candidate["embedding_score"],
                            "llm_reasoning": analysis["reasoning"],
                            "prerequisites_met": analysis.get("prerequisites_met", True),
                            "skill_level_match": analysis.get("skill_level_match", True)
                        }
                    })
                    
            except Exception as e:
                logger.error(f"LLM analysis failed for candidate: {e}")
                # Fallback: Use embedding score
                matches.append({
                    "user_id": user.id,
                    "matched_user_id": helper.id,
                    "skill_offered": candidate["skill_offered"],
                    "skill_needed": candidate["skill_needed"],
                    "match_score": candidate["embedding_score"],
                    "confidence": 0.5,
                    "explanation": f"This helper has skills in {candidate['skill_offered']} which may help with your need.",
                    "is_reciprocal": False,
                    "metadata": candidate["metadata"]
                })
        
        # Sort by adjusted score
        matches.sort(key=lambda x: x["match_score"], reverse=True)
        
        # Take top-K
        top_matches = matches[:top_k]
        
        logger.info(f"Re-ranked to {len(top_matches)} matches")
        return top_matches
    
    def _convert_candidates_to_matches(
        self,
        candidates: List[MatchCandidate],
        top_k: int = 10
    ) -> List[MatchResult]:
        """Convert candidates to matches (without LLM)."""
        matches = []
        
        for candidate in candidates[:top_k]:
            matches.append({
                "user_id": candidate["user_id"],
                "matched_user_id": candidate["matched_user_id"],
                "skill_offered": candidate["skill_offered"],
                "skill_needed": candidate["skill_needed"],
                "match_score": candidate["embedding_score"],
                "confidence": 0.7,  # Medium confidence without LLM
                "explanation": f"Based on semantic similarity, this helper's skills in {candidate['skill_offered']} align with your need for {candidate['skill_needed']}.",
                "is_reciprocal": False,
                "metadata": candidate["metadata"]
            })
        
        return matches
    
    async def _check_reciprocity(
        self,
        user: UserInDB,
        matches: List[MatchResult]
    ) -> List[MatchResult]:
        """
        Phase 3: Check if any matches are reciprocal (symmetric).
        A match is reciprocal if both users can help each other.
        
        Args:
            user: Current user
            matches: List of matches
            
        Returns:
            Matches with reciprocity flag updated
        """
        for match in matches:
            # Get the helper
            helper = await self.storage.get_user_by_id(match["matched_user_id"])
            
            if not helper or not helper.skills_needed or not user.skills_offered:
                continue
            
            # Check if user can help the helper (reverse direction)
            can_help_back = False
            reverse_match_info = None
            
            for helper_need in helper.skills_needed:
                for user_skill in user.skills_offered:
                    # Check if skill names overlap
                    helper_need_lower = helper_need.name.lower()
                    user_skill_lower = user_skill.name.lower()
                    
                    if (
                        helper_need_lower in user_skill_lower or
                        user_skill_lower in helper_need_lower or
                        self._skills_are_similar(helper_need.name, user_skill.name)
                    ):
                        can_help_back = True
                        reverse_match_info = {
                            "helper_needs": helper_need.name,
                            "helper_needs_description": helper_need.description,
                            "user_offers": user_skill.name,
                            "user_offers_description": user_skill.description,
                            "helper_proficiency": helper_need.proficiency_level,
                            "user_proficiency": user_skill.proficiency_level
                        }
                        break
                
                if can_help_back:
                    break
            
            # Mark as reciprocal if mutual help is possible
            if can_help_back:
                match["is_reciprocal"] = True
                match["metadata"]["reverse_match"] = reverse_match_info
                logger.info(
                    f"Reciprocal match found: {user.id} ↔ {helper.id} "
                    f"({match['skill_needed']} ↔ {reverse_match_info['helper_needs']})"
                )
        
        return matches
    
    def _skills_are_similar(self, skill1: str, skill2: str) -> bool:
        """
        Check if two skill names are similar enough to be considered a match.
        Simple keyword matching for now.
        """
        # Normalize
        s1 = skill1.lower().strip()
        s2 = skill2.lower().strip()
        
        # Exact match
        if s1 == s2:
            return True
        
        # Common keywords for related skills
        skill_keywords = {
            "python": ["python", "django", "flask", "fastapi"],
            "react": ["react", "reactjs", "next.js", "nextjs"],
            "javascript": ["javascript", "js", "typescript", "ts"],
            "machine learning": ["ml", "machine learning", "deep learning", "ai"],
            "data": ["data", "analytics", "analysis", "visualization"],
        }
        
        # Check if both skills share a keyword group
        for keyword, variations in skill_keywords.items():
            if any(v in s1 for v in variations) and any(v in s2 for v in variations):
                return True
        
        return False


# Factory function
def create_matching_service(
    db: AsyncIOMotorDatabase,
    embedding_service: EmbeddingService,
    llm_service: LLMService
) -> MatchingService:
    """
    Create matching service instance.
    
    Args:
        db: MongoDB database
        embedding_service: Embedding service
        llm_service: LLM service
        
    Returns:
        Configured MatchingService
    """
    storage_service = StorageService(db)
    
    return MatchingService(
        db=db,
        embedding_service=embedding_service,
        llm_service=llm_service,
        storage_service=storage_service
    )