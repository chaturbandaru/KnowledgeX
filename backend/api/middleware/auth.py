"""
Authentication middleware for JWT token validation.
Provides FastAPI dependencies for protected routes.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from models.user import UserInDB, TokenData
from utils.auth_utils import verify_token
import logging

logger = logging.getLogger(__name__)

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> UserInDB:
    """
    Get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer credentials
        db: Database instance
        
    Returns:
        Current user from database
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Extract token
        token = credentials.credentials
        
        # Verify and decode token
        payload = verify_token(token, token_type="access")
        
        if payload is None:
            raise credentials_exception
        
        # Extract user ID from payload
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # Get user from database
        user_data = await db.users.find_one({"_id": user_id})
        
        if user_data is None:
            raise credentials_exception
        
        # Convert to UserInDB model
        user = UserInDB(**user_data)
        return user
        
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise credentials_exception


async def get_current_active_user(
    current_user: UserInDB = Depends(get_current_user)
) -> UserInDB:
    """
    Ensure current user is active.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Active user
        
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_current_verified_user(
    current_user: UserInDB = Depends(get_current_active_user)
) -> UserInDB:
    """
    Ensure current user is verified (optional, for features requiring verification).
    
    Args:
        current_user: Current active user
        
    Returns:
        Verified user
        
    Raises:
        HTTPException: If user is not verified
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email verification required"
        )
    return current_user


# Optional: Parse token without requiring valid user (for refresh tokens)
async def get_token_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TokenData:
    """
    Get token payload without validating user exists.
    Useful for refresh token endpoint.
    
    Args:
        credentials: HTTP Bearer credentials
        
    Returns:
        Token payload
        
    Raises:
        HTTPException: If token is invalid
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = verify_token(token, token_type="refresh")
        
        if payload is None:
            raise credentials_exception
        
        return TokenData(
            user_id=payload.get("sub"),
            username=payload.get("username"),
            email=payload.get("email")
        )
        
    except Exception as e:
        logger.error(f"Error parsing token: {e}")
        raise credentials_exception
