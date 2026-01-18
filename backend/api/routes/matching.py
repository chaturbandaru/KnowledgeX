"""
Matching routes for finding skill matches.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from core.config import settings
from models.user import UserInDB, UserResponse
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
        
        
        # Get user profiles
        target_ids = [m.matched_user_id for m in matches]
        users_cursor = db.users.find({"_id": {"$in": target_ids}})
        users_list = await users_cursor.to_list(length=len(target_ids))
        users_map = {str(u["_id"]): u for u in users_list}
        
        response = []
        for m in matches:
            resp = MatchResponse(**m.model_dump(by_alias=True))
            if m.matched_user_id in users_map:
                resp.profile = UserResponse(**users_map[m.matched_user_id])
            response.append(resp)
            
        return response
        
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
        
        # Get user profiles (seekers)
        target_ids = [m.user_id for m in matches]
        users_cursor = db.users.find({"_id": {"$in": target_ids}})
        users_list = await users_cursor.to_list(length=len(target_ids))
        users_map = {str(u["_id"]): u for u in users_list}
        
        response = []
        from models.user import UserResponse
        
        for m in matches:
            resp = MatchResponse(**m.model_dump(by_alias=True))
            if m.user_id in users_map:
                resp.profile = UserResponse(**users_map[m.user_id])
            response.append(resp)
            
        return response
        
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


@router.post("/connect")
async def connect_with_user(
    matched_user_id: str = Query(..., description="ID of user to connect with"),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Send a connection request to another user.
    
    This creates a match record between the current user and the target user.
    The match will have a PENDING status and must be accepted by the target user.
    """
    try:
        # Check if target user exists
        target_user_data = await db.users.find_one({"_id": matched_user_id})
        if not target_user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if already connected
        existing_match = await db.matches.find_one({
            "$or": [
                {"user_id": current_user.id, "matched_user_id": matched_user_id},
                {"user_id": matched_user_id, "matched_user_id": current_user.id}
            ]
        })
        
        if existing_match:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Connection already exists with this user"
            )
        
        # Create connection match
        from models.match import MatchCreate
        storage_service = StorageService(db)
        
        match_create = MatchCreate(
            user_id=current_user.id,
            matched_user_id=matched_user_id,
            skill_offered="Any",
            skill_needed="Any",
            match_score=0.5,
            confidence=0.5,
            explanation="User initiated connection",
            metadata={"connection_type": "manual"}
        )
        
        created_match = await storage_service.create_match(match_create)
        
        if not created_match:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create connection"
            )
        
        logger.info(f"User {current_user.id} connected with {matched_user_id}")
        
        return {
            "message": "Connection request sent",
            "match_id": created_match.id,
            "status": created_match.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating connection: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create connection"
        )


@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=1, description="Search query for users or skills"),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Search for users by name, bio, or skills offered.
    
    Excludes current user and returns matching users with their skills.
    """
    try:
        search_lower = q.lower().strip()
        
        # Build search query - search in username, full_name, bio, and skills
        search_query = {
            "_id": {"$ne": current_user.id},  # Exclude current user
            "is_active": {"$ne": False},
            "$or": [
                {"username": {"$regex": search_lower, "$options": "i"}},
                {"full_name": {"$regex": search_lower, "$options": "i"}},
                {"bio": {"$regex": search_lower, "$options": "i"}},
                {"skills_offered.name": {"$regex": search_lower, "$options": "i"}},
            ]
        }
        
        cursor = db.users.find(search_query).limit(20)
        users = await cursor.to_list(length=20)
        
        # Convert to response format
        from models.user import UserResponse
        results = [
            UserResponse(**user) for user in users
        ]
        
        logger.info(f"User {current_user.id} searched for '{q}' - found {len(results)} results")
        
        return results
        
    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed"
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