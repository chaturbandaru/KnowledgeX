"""
Barter service for detecting 3-way skill exchange cycles.
"""

from typing import List, Dict, Any, Set, Tuple, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from models.user import UserInDB
from services.storage_service import StorageService

logger = logging.getLogger(__name__)


class BarterService:
    """Detect and manage barter cycles (3-way exchanges)."""
    
    def __init__(self, db: AsyncIOMotorDatabase, storage_service: StorageService):
        self.db = db
        self.storage = storage_service
        logger.info("BarterService initialized")
    
    async def detect_3way_cycles(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Detect 3-way barter cycles involving the given user.
        
        A 3-way cycle is: A helps B, B helps C, C helps A
        
        Args:
            user_id: User to find cycles for
            
        Returns:
            List of detected 3-way cycles
        """
        user = await self.storage.get_user_by_id(user_id)
        if not user or not user.skills_needed or not user.skills_offered:
            return []
        
        # Get all active users
        all_users = await self.storage.get_active_users(limit=200)
        
        cycles = []
        
        # For each need of the user, try to find a cycle
        for user_need in user.skills_needed:
            # Find users who can help the current user (B candidates)
            b_candidates = self._find_helpers(user, user_need, all_users)
            
            for b_user in b_candidates:
                if not b_user.skills_needed:
                    continue
                
                # For each need of B, find users who can help B (C candidates)
                for b_need in b_user.skills_needed:
                    c_candidates = self._find_helpers(b_user, b_need, all_users)
                    
                    for c_user in c_candidates:
                        # Check if C can help A (completing the cycle)
                        if self._can_help(c_user, user, user_need):
                            cycle = self._create_cycle(user, b_user, c_user, user_need, b_need)
                            if cycle:
                                cycles.append(cycle)
        
        logger.info(f"Found {len(cycles)} 3-way cycles for user {user_id}")
        return cycles
    
    def _find_helpers(
        self,
        seeker: UserInDB,
        need,
        all_users: List[UserInDB]
    ) -> List[UserInDB]:
        """Find users who can help with a specific need."""
        helpers = []
        
        for user in all_users:
            if user.id == seeker.id:
                continue
            
            if self._can_help(user, seeker, need):
                helpers.append(user)
        
        return helpers
    
    def _can_help(self, helper: UserInDB, seeker: UserInDB, need) -> bool:
        """Check if helper can assist with seeker's need."""
        if not helper.skills_offered:
            return False
        
        need_lower = need.name.lower()
        
        for skill in helper.skills_offered:
            skill_lower = skill.name.lower()
            
            # Simple keyword matching
            if (
                need_lower in skill_lower or
                skill_lower in need_lower or
                self._keywords_match(need.name, skill.name)
            ):
                return True
        
        return False
    
    def _keywords_match(self, need: str, skill: str) -> bool:
        """Check if keywords match between need and skill."""
        skill_groups = {
            "python": ["python", "django", "flask", "fastapi"],
            "react": ["react", "reactjs", "next.js", "nextjs"],
            "javascript": ["javascript", "js", "typescript", "ts"],
            "ml": ["ml", "machine learning", "deep learning", "ai"],
        }
        
        need_lower = need.lower()
        skill_lower = skill.lower()
        
        for group, keywords in skill_groups.items():
            if any(k in need_lower for k in keywords) and any(k in skill_lower for k in keywords):
                return True
        
        return False
    
    def _create_cycle(
        self,
        user_a: UserInDB,
        user_b: UserInDB,
        user_c: UserInDB,
        a_need,
        b_need
    ) -> Optional[Dict[str, Any]]:
        """Create a cycle data structure."""
        
        # Find what C needs that A offers
        c_need = None
        for need in user_c.skills_needed:
            if self._can_help(user_a, user_c, need):
                c_need = need
                break
        
        if not c_need:
            return None
        
        # Find the specific skills being exchanged
        a_to_c_skill = self._find_matching_skill(user_a, c_need)
        b_to_a_skill = self._find_matching_skill(user_b, a_need)
        c_to_b_skill = self._find_matching_skill(user_c, b_need)
        
        # Calculate fairness score (simplified)
        fairness_score = self._calculate_fairness([
            (a_to_c_skill, c_need),
            (b_to_a_skill, a_need),
            (c_to_b_skill, b_need)
        ])
        
        return {
            "cycle_type": "three_way",
            "participants": [
                {
                    "user_id": user_a.id,
                    "username": user_a.username,
                    "offers": a_to_c_skill.name if a_to_c_skill else "Unknown",
                    "receives": b_to_a_skill.name if b_to_a_skill else "Unknown"
                },
                {
                    "user_id": user_b.id,
                    "username": user_b.username,
                    "offers": b_to_a_skill.name if b_to_a_skill else "Unknown",
                    "receives": c_to_b_skill.name if c_to_b_skill else "Unknown"
                },
                {
                    "user_id": user_c.id,
                    "username": user_c.username,
                    "offers": c_to_b_skill.name if c_to_b_skill else "Unknown",
                    "receives": a_to_c_skill.name if a_to_c_skill else "Unknown"
                }
            ],
            "exchanges": [
                {
                    "from_user_id": user_a.id,
                    "to_user_id": user_c.id,
                    "skill": a_to_c_skill.name if a_to_c_skill else "Unknown"
                },
                {
                    "from_user_id": user_b.id,
                    "to_user_id": user_a.id,
                    "skill": b_to_a_skill.name if b_to_a_skill else "Unknown"
                },
                {
                    "from_user_id": user_c.id,
                    "to_user_id": user_b.id,
                    "skill": c_to_b_skill.name if c_to_b_skill else "Unknown"
                }
            ],
            "fairness_score": fairness_score,
            "explanation": f"{user_a.username} helps {user_c.username}, {user_b.username} helps {user_a.username}, {user_c.username} helps {user_b.username}"
        }
    
    def _find_matching_skill(self, helper: UserInDB, need):
        """Find the specific skill that matches a need."""
        if not helper.skills_offered:
            return None
        
        for skill in helper.skills_offered:
            if self._can_help(helper, None, need):
                return skill
        
        return None
    
    def _calculate_fairness(self, exchanges: List[Tuple]) -> float:
        """Calculate fairness score for a barter cycle."""
        # Simplified: Check if proficiency levels are balanced
        # More sophisticated: Consider skill value, time commitment, etc.
        return 0.85  # Placeholder


# Factory function
def create_barter_service(db: AsyncIOMotorDatabase) -> BarterService:
    """Create barter service instance."""
    storage_service = StorageService(db)
    return BarterService(db=db, storage_service=storage_service)