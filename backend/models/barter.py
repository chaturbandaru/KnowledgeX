"""
Barter model for skill exchange cycles.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId
from enum import Enum


class BarterStatus(str, Enum):
    """Barter status enum."""
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BarterType(str, Enum):
    """Barter type enum."""
    DIRECT = "direct"  # 1:1 exchange
    THREE_WAY = "three_way"  # A->B->C->A cycle
    MULTI_WAY = "multi_way"  # Complex n-way cycle


class ExchangeItem(BaseModel):
    """Item being exchanged in a barter."""
    from_user_id: str
    to_user_id: str
    skill: str
    estimated_hours: Optional[float] = None
    description: Optional[str] = None


class BarterSession(BaseModel):
    """Individual session within a barter."""
    date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: str = "scheduled"  # scheduled, completed, cancelled
    notes: Optional[str] = None


class BarterBase(BaseModel):
    """Base barter schema."""
    participants: List[str] = Field(min_length=2)  # List of user IDs
    exchanges: List[ExchangeItem] = Field(min_length=1)
    barter_type: BarterType = BarterType.DIRECT
    fairness_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    description: Optional[str] = None


class BarterCreate(BarterBase):
    """Schema for creating a barter."""
    pass


class BarterUpdate(BaseModel):
    """Schema for updating a barter."""
    status: Optional[BarterStatus] = None
    sessions: Optional[List[BarterSession]] = None
    notes: Optional[str] = None


class BarterResponse(BarterBase):
    """Barter response schema."""
    id: str = Field(alias="_id")
    status: BarterStatus = BarterStatus.PROPOSED
    sessions: List[BarterSession] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )


class BarterInDB(BarterBase):
    """Barter model as stored in database."""
    id: Optional[str] = Field(default=None, alias="_id")
    status: BarterStatus = BarterStatus.PROPOSED
    sessions: List[BarterSession] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
