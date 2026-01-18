"""
Message model for user-to-user communication.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


class MessageRequestStatus(str, Enum):
    """Status of a message request."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class MessageBase(BaseModel):
    """Base message schema."""
    from_user_id: str
    to_user_id: str
    content: str
    match_id: Optional[str] = None  # Link to the match that initiated this


class MessageCreate(MessageBase):
    """Schema for creating a message."""
    pass


class MessageResponse(MessageBase):
    """Message response schema."""
    id: str = Field(alias="_id")
    created_at: datetime
    is_read: bool = False
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )


class MessageInDB(MessageBase):
    """Message as stored in database."""
    id: Optional[str] = Field(default=None, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True
    )


class MessageRequest(BaseModel):
    """Message request (first contact)."""
    from_user_id: str
    to_user_id: str
    match_id: str
    initial_message: str
    status: MessageRequestStatus = MessageRequestStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MessageRequestResponse(BaseModel):
    """Message request response."""
    id: str = Field(alias="_id")
    from_user_id: str
    to_user_id: str
    from_user_name: str  # For display
    match_id: str
    initial_message: str
    status: MessageRequestStatus
    created_at: datetime
    
    model_config = ConfigDict(populate_by_name=True)