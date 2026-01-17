"""
User model and schemas for authentication and user management.
"""

from datetime import datetime
from typing import Optional, List, Annotated
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, BeforeValidator
from bson import ObjectId


# Pydantic v2 compatible ObjectId validator
def validate_object_id(v: any) -> str:
    """Validate and convert ObjectId to string."""
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str):
        if ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")
    raise ValueError("Invalid ObjectId type")


# Type alias for ObjectId fields
PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]


class SkillItem(BaseModel):
    """Skill item for skills offered or needed."""
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    proficiency_level: Optional[str] = None  # beginner, intermediate, advanced, expert
    tags: List[str] = Field(default_factory=list)


# ==================== Request/Response Schemas ====================

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8, max_length=100)
    skills_offered: List[SkillItem] = Field(default_factory=list)
    skills_needed: List[SkillItem] = Field(default_factory=list)


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    skills_offered: Optional[List[SkillItem]] = None
    skills_needed: Optional[List[SkillItem]] = None


class UserResponse(UserBase):
    """Public user data response (no password)."""
    id: str = Field(alias="_id")
    skills_offered: List[SkillItem] = Field(default_factory=list)
    skills_needed: List[SkillItem] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    is_verified: bool = False
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class UserInDB(UserBase):
    """User model as stored in database."""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    hashed_password: str
    skills_offered: List[SkillItem] = Field(default_factory=list)
    skills_needed: List[SkillItem] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True
    is_verified: bool = False
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


# ==================== Authentication Schemas ====================

class Token(BaseModel):
    """JWT token response."""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenData(BaseModel):
    """JWT token payload data."""
    user_id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response with user data and token."""
    user: UserResponse
    token: Token


class RegisterResponse(BaseModel):
    """Registration response with user data and token."""
    user: UserResponse
    token: Token
