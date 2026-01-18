"""
Matching routes for finding skill matches.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.config import settings
from models.user import UserInDB
from models.match import MatchResponse, MatchCreate, MatchUpdate, MatchStatus
from api.middleware.auth import get_current_active_user
from services.embedding_service import create_openrouter_embedding_service
from services.llm_service import create_llm_service
from services.matching_service import create_matching_service
from services.storage_service import StorageService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/matches", tags=["Matching"])


# Dependency to get matching service
async def get_matching_service(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get configured matching service."""
    embed_service = create_openrouter_embedding_service(
        db=db,
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.EMBEDDING_MODEL
    )
    
    llm_service = create_llm_service(
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.LLM_MODEL,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS
    )
    
    return create_matching_service(
        db=db,
        embedding_service=embed_service,
        llm_service=llm_service
    )


@router.post("/compute", status_code=status.HTTP_200_OK)
async def compute_matches(
    top_k: int = Query(10, ge=1, le=50, description="Number of matches to return"),
    use_llm: bool = Query(True, description="Use LLM for intelligent re-ranking"),
    current_user: UserInDB = Depends(get_current_active_user),
    matching_service = Depends(get_matching_service),
    storage_service: StorageService = Depends(lambda db=Depends(get_database): StorageService(db))
):
    """
    Compute matches for the current user's needs.
    
    This endpoint:
    1. Finds potential helpers using embeddings
    2. Re-ranks with LLM analysis (if enabled)
    3. Checks for reciprocal matches
    4. Stores matches in database
    
    Returns the top-K matches.
    """
    try:
        logger.info(f"Computing matches for user {current_user.id}")
        
        # Check if user has needs
        if not current_user.skills_needed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must add skills you need help with before finding matches"
            )
        
        # Find matches
        matches = await matching_service.find_matches_for_user(
            user_id=current_user.id,
            top_k=top_k,
            use_llm=use_llm
        )
        
        # Store matches in database
        stored_matches = []
        for match in matches:
            # Check if match already exists
            existing = await storage_service.check_existing_match(
                user_id=current_user.id,
                matched_user_id=match["matched_user_id"]
            )
            
            if existing:
                # Update existing match
                logger.info(f"Updating existing match {existing.id}")
                updated = await storage_service.update_match_status(
                    match_id=existing.id,
                    status=MatchStatus.PENDING
                )
                if updated:
                    stored_matches.append(updated)
            else:
                # Create new match
                match_create = MatchCreate(
                    user_id=match["user_id"],
                    matched_user_id=match["matched_user_id"],
                    skill_offered=match["skill_offered"],
                    skill_needed=match["skill_needed"],
                    match_score=match["match_score"],
                    confidence=match["confidence"],
                    explanation=match["explanation"],
                    metadata=match["metadata"]
                )
                
                created = await storage_service.create_match(match_create)
                if created:
                    stored_matches.append(created)
        
        logger.info(f"Stored {len(stored_matches)} matches for user {current_user.id}")
        
        return {
            "message": f"Found {len(matches)} matches",
            "total_matches": len(matches),
            "stored_matches": len(stored_matches),
            "matches": [
                {
                    "match_id": m.id,
                    "matched_user_id": m.matched_user_id,
                    "skill_offered": m.skill_offered,
                    "skill_needed": m.skill_needed,
                    "match_score": m.match_score,
                    "confidence": m.confidence,
                    "explanation": m.explanation,
                    "is_reciprocal": m.is_reciprocal,
                    "status": m.status,
                    "metadata": m.metadata
                }
                for m in stored_matches
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error computing matches: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to compute matches"
        )


@router.get("/", response_model=List[MatchResponse])
async def get_my_matches(
    status_filter: Optional[MatchStatus] = Query(None, description="Filter by match status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get current user's matches.
    
    Returns matches where the user is the seeker (needs help).
    """
    try:
        storage_service = StorageService(db)
        
        matches = await storage_service.get_matches_for_user(
            user_id=current_user.id,
            status=status_filter,
            skip=skip,
            limit=limit
        )
        
        return [MatchResponse(**m.model_dump(by_alias=True)) for m in matches]
        
    except Exception as e:
        logger.error(f"Error getting matches: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve matches"
        )


@router.get("/incoming", response_model=List[MatchResponse])
async def get_incoming_matches(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get incoming matches where others need help from current user.
    
    Returns matches where the user is the helper (offers help).
    """
    try:
        # Find matches where current user is the matched_user (helper)
        cursor = db.matches.find({
            "matched_user_id": current_user.id,
            "status": MatchStatus.PENDING
        }).skip(skip).limit(limit)
        
        matches_data = await cursor.to_list(length=limit)
        
        from models.match import MatchInDB
        matches = [MatchInDB(**m) for m in matches_data]
        
        return [MatchResponse(**m.model_dump(by_alias=True)) for m in matches]
        
    except Exception as e:
        logger.error(f"Error getting incoming matches: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve incoming matches"
        )


@router.put("/{match_id}/status", response_model=MatchResponse)
async def update_match_status(
    match_id: str,
    update: MatchUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update match status (accept/reject).
    
    Both the seeker and helper can update the status.
    """
    try:
        storage_service = StorageService(db)
        
        # Get the match
        match_data = await db.matches.find_one({"_id": match_id})
        if not match_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        from models.match import MatchInDB
        match = MatchInDB(**match_data)
        
        # Check authorization (either seeker or helper can update)
        if match.user_id != current_user.id and match.matched_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this match"
            )
        
        # Update status
        updated_match = await storage_service.update_match_status(
            match_id=match_id,
            status=update.status,
            feedback=update.feedback
        )
        
        if not updated_match:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update match"
            )
        
        logger.info(f"Match {match_id} updated to {update.status} by user {current_user.id}")
        
        return MatchResponse(**updated_match.model_dump(by_alias=True))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating match status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update match status"
        )


@router.get("/{match_id}", response_model=MatchResponse)
async def get_match_by_id(
    match_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get a specific match by ID."""
    try:
        match_data = await db.matches.find_one({"_id": match_id})
        
        if not match_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        from models.match import MatchInDB
        match = MatchInDB(**match_data)
        
        # Check authorization
        if match.user_id != current_user.id and match.matched_user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this match"
            )
        
        return MatchResponse(**match.model_dump(by_alias=True))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting match: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve match"
        )


@router.delete("/{match_id}")
async def delete_match(
    match_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Delete a match.
    Only the seeker (user who created the match) can delete it.
    """
    try:
        match_data = await db.matches.find_one({"_id": match_id})
        
        if not match_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        from models.match import MatchInDB
        match = MatchInDB(**match_data)
        
        # Only the seeker can delete
        if match.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the match creator can delete it"
            )
        
        await db.matches.delete_one({"_id": match_id})
        
        logger.info(f"Match {match_id} deleted by user {current_user.id}")
        
        return {"message": "Match deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting match: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete match"
        )