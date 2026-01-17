"""
Skill model for knowledge and expertise offered/needed.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId


class SkillBase(BaseModel):
    """Base skill schema."""
    user_id: str
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, max_length=50)
    proficiency_level: str = Field(default="intermediate")  # beginner, intermediate, advanced, expert
    tags: List[str] = Field(default_factory=list)
    is_offered: bool = True  # True = offering, False = seeking


class SkillCreate(SkillBase):
    """Schema for creating a skill."""
    pass


class SkillUpdate(BaseModel):
    """Schema for updating a skill."""
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[str] = Field(None, max_length=50)
    proficiency_level: Optional[str] = None
    tags: Optional[List[str]] = None
    is_offered: Optional[bool] = None


class SkillResponse(SkillBase):
    """Skill response schema."""
    id: str = Field(alias="_id")
    embedding: Optional[List[float]] = None  # Vector embedding for matching
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class SkillInDB(SkillBase):
    """Skill model as stored in database."""
    id: Optional[str] = Field(default=None, alias="_id")
    embedding: Optional[List[float]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
