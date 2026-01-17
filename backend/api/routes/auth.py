"""
Authentication routes for user registration, login, and token management.
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from core.database import get_database
from core.config import settings
from models.user import (
    UserCreate, UserResponse, UserInDB,
    LoginRequest, LoginResponse, RegisterResponse,
    Token, TokenData
)
from utils.auth_utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token
)
from api.middleware.auth import get_current_active_user, get_token_payload
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Register a new user.
    
    - Validates email and username uniqueness
    - Hashes password
    - Creates user in database
    - Returns user data and access token
    """
    try:
        # Check if email already exists
        existing_email = await db.users.find_one({"email": user_data.email})
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if username already exists
        existing_username = await db.users.find_one({"username": user_data.username})
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Prepare user document
        user_dict = user_data.model_dump(exclude={"password"})
        user_dict["hashed_password"] = hashed_password
        user_dict["_id"] = str(ObjectId())
        
        # Create user in database
        user_in_db = UserInDB(**user_dict)
        
        # Get document to insert with all fields
        doc_to_insert = user_in_db.model_dump(by_alias=True, exclude_none=False)
        
        # Debug logging
        logger.info(f"Inserting user document with fields: {list(doc_to_insert.keys())}")
        logger.info(f"Has hashed_password: {'hashed_password' in doc_to_insert}")
        
        await db.users.insert_one(doc_to_insert)
        
        # Create access and refresh tokens
        token_data = {
            "sub": user_in_db.id,
            "username": user_in_db.username,
            "email": user_in_db.email
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Prepare response
        user_response = UserResponse(**user_in_db.model_dump(by_alias=True))
        token_response = Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        logger.info(f"New user registered: {user_in_db.username} ({user_in_db.email})")
        
        return RegisterResponse(user=user_response, token=token_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Authenticate user and return access token.
    
    - Validates credentials
    - Returns user data and tokens
    """
    try:
        # Find user by email
        user_data = await db.users.find_one({"email": login_data.email})
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user = UserInDB(**user_data)
        
        # Verify password
        if not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # Create tokens
        token_data = {
            "sub": user.id,
            "username": user.username,
            "email": user.email
        }
        
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        # Prepare response
        user_response = UserResponse(**user.model_dump(by_alias=True))
        token_response = Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        logger.info(f"User logged in: {user.username}")
        
        return LoginResponse(user=user_response, token=token_response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenData = Depends(get_token_payload),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Refresh access token using refresh token.
    
    - Validates refresh token
    - Issues new access token
    """
    try:
        if not token_data.user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Verify user still exists and is active
        user_data = await db.users.find_one({"_id": token_data.user_id})
        if not user_data or not user_data.get("is_active"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new access token
        new_token_data = {
            "sub": token_data.user_id,
            "username": token_data.username,
            "email": token_data.email
        }
        
        access_token = create_access_token(new_token_data)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Get current authenticated user's profile.
    
    Requires valid access token.
    """
    return UserResponse(**current_user.model_dump(by_alias=True))


@router.post("/logout")
async def logout(
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Logout current user.
    
    Note: With JWT, actual logout is handled client-side by removing the token.
    This endpoint exists for consistency and potential future server-side token blacklisting.
    """
    logger.info(f"User logged out: {current_user.username}")
    
    return {
        "message": "Successfully logged out",
        "detail": "Please remove the token from client storage"
    }
