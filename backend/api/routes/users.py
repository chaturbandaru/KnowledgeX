"""
User management routes.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime

from core.database import get_database
from models.user import UserInDB, UserResponse, UserUpdate
from api.middleware.auth import get_current_active_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get current user's profile."""
    return UserResponse(**current_user.model_dump(by_alias=True))


@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    updates: UserUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Update current user's profile.
    
    Only updates fields that are provided (partial update).
    """
    try:
        # Prepare update data (exclude None values)
        update_data = updates.model_dump(exclude_unset=True, exclude_none=True)
        
        if not update_data:
            return UserResponse(**current_user.model_dump(by_alias=True))
        
        # Add updated timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        # Update user in database
        result = await db.users.update_one(
            {"_id": current_user.id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            logger.warning(f"No changes made to user {current_user.id}")
        
        # Fetch updated user
        updated_user_data = await db.users.find_one({"_id": current_user.id})
        updated_user = UserInDB(**updated_user_data)
        
        logger.info(f"User profile updated: {current_user.username}")
        
        return UserResponse(**updated_user.model_dump(by_alias=True))
        
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


@router.delete("/me")
async def delete_my_account(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Deactivate current user's account.
    
    Soft delete - sets is_active to False instead of removing from database.
    """
    try:
        await db.users.update_one(
            {"_id": current_user.id},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
        )
        
        logger.info(f"User account deactivated: {current_user.username}")
        
        return {
            "message": "Account successfully deactivated",
            "detail": "Your account has been deactivated and will no longer be visible to other users"
        }
        
    except Exception as e:
        logger.error(f"Error deactivating account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate account"
        )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get public profile of a user by ID.
    
    Requires authentication to prevent abuse.
    """
    try:
        user_data = await db.users.find_one({"_id": user_id, "is_active": True})
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user = UserInDB(**user_data)
        return UserResponse(**user.model_dump(by_alias=True))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user"
        )


@router.get("/", response_model=List[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    List users with optional search.
    
    - Supports pagination
    - Search by username or full name
    - Only returns active users
    """
    try:
        # Build query filter
        query_filter = {"is_active": True}
        
        if search:
            query_filter["$or"] = [
                {"username": {"$regex": search, "$options": "i"}},
                {"full_name": {"$regex": search, "$options": "i"}}
            ]
        
        # Fetch users
        cursor = db.users.find(query_filter).skip(skip).limit(limit)
        users_data = await cursor.to_list(length=limit)
        
        # Convert to response models
        users = [
            UserResponse(**UserInDB(**user_data).model_dump(by_alias=True))
            for user_data in users_data
        ]
        
        return users
        
    except Exception as e:
        logger.error(f"Error listing users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )
