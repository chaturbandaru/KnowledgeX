"""
Match model for skill matching between users.
"""

from datetime import datetime
from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId
from enum import Enum
from .user import UserResponse


class MatchStatus(str, Enum):
    """Match status enum."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class MatchBase(BaseModel):
    """Base match schema."""
    user_id: str  # User who needs the skill
    matched_user_id: str  # User who offers the skill
    skill_offered: str  # Skill being offered
    skill_needed: str  # Skill being sought
    match_score: float = Field(ge=0.0, le=1.0)  # 0-1 similarity score
    confidence: float = Field(ge=0.0, le=1.0)  # LLM confidence score
    explanation: Optional[str] = None  # LLM explanation
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MatchCreate(MatchBase):
    """Schema for creating a match."""
    pass


class MatchUpdate(BaseModel):
    """Schema for updating a match."""
    status: Optional[MatchStatus] = None
    feedback: Optional[str] = None


class MatchResponse(MatchBase):
    """Match response schema."""
    id: str = Field(alias="_id")
    status: MatchStatus = MatchStatus.PENDING
    created_at: datetime
    updated_at: datetime
    is_reciprocal: bool = False  # True if both users match each other
    profile: Optional[UserResponse] = None
    
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class MatchInDB(MatchBase):
    """Match model as stored in database."""
    id: Optional[str] = Field(default=None, alias="_id")
    status: MatchStatus = MatchStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_reciprocal: bool = False
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
