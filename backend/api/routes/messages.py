"""
Messaging routes for user-to-user communication.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime

from core.database import get_database
from models.user import UserInDB
from models.message import (
    MessageCreate, MessageResponse, MessageRequest,
    MessageRequestStatus, MessageRequestResponse
)
from api.middleware.auth import get_current_active_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.post("/request")
async def send_message_request(
    to_user_id: str = Query(..., description="ID of user to send request to"),
    match_id: str = Query(..., description="Associated match ID"),
    initial_message: str = Query(..., description="Initial message content"),
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Send a message request to a matched user.
    
    The recipient must accept before you can chat.
    """
    try:
        # Check if request already exists
        existing = await db.message_requests.find_one({
            "from_user_id": current_user.id,
            "to_user_id": to_user_id,
            "status": {"$ne": MessageRequestStatus.REJECTED}
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message request already sent"
            )
        
        # Create request
        request = {
            "_id": str(ObjectId()),
            "from_user_id": current_user.id,
            "to_user_id": to_user_id,
            "match_id": match_id,
            "initial_message": initial_message,
            "status": MessageRequestStatus.PENDING,
            "created_at": datetime.utcnow()
        }
        
        await db.message_requests.insert_one(request)
        
        logger.info(f"Message request sent from {current_user.id} to {to_user_id}")
        
        return {
            "message": "Message request sent",
            "request_id": request["_id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message request"
        )


@router.get("/requests/incoming", response_model=List[MessageRequestResponse])
async def get_incoming_requests(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get pending message requests sent to you."""
    try:
        cursor = db.message_requests.find({
            "to_user_id": current_user.id,
            "status": MessageRequestStatus.PENDING
        }).sort("created_at", -1)
        
        requests = await cursor.to_list(length=100)
        
        # Enrich with sender info
        result = []
        for req in requests:
            sender = await db.users.find_one({"_id": req["from_user_id"]})
            result.append(MessageRequestResponse(
                **req,
                from_user_name=sender.get("username", "Unknown") if sender else "Unknown"
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting incoming requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get requests"
        )


@router.put("/requests/{request_id}/accept")
async def accept_message_request(
    request_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Accept a message request."""
    try:
        request = await db.message_requests.find_one({"_id": request_id})
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        if request["to_user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not your request to accept"
            )
        
        # Update status
        await db.message_requests.update_one(
            {"_id": request_id},
            {"$set": {"status": MessageRequestStatus.ACCEPTED}}
        )
        
        # Create initial message in conversation
        message = {
            "_id": str(ObjectId()),
            "from_user_id": request["from_user_id"],
            "to_user_id": current_user.id,
            "match_id": request["match_id"],
            "content": request["initial_message"],
            "created_at": request["created_at"],
            "is_read": True  # Recipient has seen it by accepting
        }
        
        await db.messages.insert_one(message)
        
        logger.info(f"Message request {request_id} accepted")
        
        return {"message": "Request accepted. You can now chat!"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept request"
        )


@router.put("/requests/{request_id}/reject")
async def reject_message_request(
    request_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Reject a message request."""
    try:
        request = await db.message_requests.find_one({"_id": request_id})
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found"
            )
        
        if request["to_user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not your request to reject"
            )
        
        # Update status to REJECTED
        await db.message_requests.update_one(
            {"_id": request_id},
            {"$set": {"status": MessageRequestStatus.REJECTED}}
        )
        
        logger.info(f"Message request {request_id} rejected")
        
        return {"message": "Request declined"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject request"
        )



class SendMessageRequest(BaseModel):
    to_user_id: str
    content: str
    match_id: Optional[str] = None


@router.post("/send")
async def send_message(
    message_data: SendMessageRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Send a message to a user (only if request was accepted).
    """
    try:
        # Check if connection exists
        request = await db.message_requests.find_one({
            "$or": [
                {"from_user_id": current_user.id, "to_user_id": message_data.to_user_id},
                {"from_user_id": message_data.to_user_id, "to_user_id": current_user.id}
            ],
            "status": MessageRequestStatus.ACCEPTED
        })
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No accepted connection with this user"
            )
        
        # Use existing match_id if not provided
        match_id = message_data.match_id or request.get("match_id")
        
        # Create message
        message = {
            "_id": str(ObjectId()),
            "from_user_id": current_user.id,
            "to_user_id": message_data.to_user_id,
            "match_id": match_id,
            "content": message_data.content,
            "created_at": datetime.utcnow(),
            "is_read": False
        }
        
        await db.messages.insert_one(message)
        
        return {"message": "Message sent", "message_id": message["_id"]}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )


@router.get("/conversations")
async def get_conversations(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get all conversations for the current user.
    
    Returns list of unique conversation partners with:
    - Last message
    - Unread count
    - Latest timestamp
    """
    try:
        # Get all accepted requests involving current user
        accepted_requests = await db.message_requests.find({
            "$or": [
                {"from_user_id": current_user.id, "status": MessageRequestStatus.ACCEPTED},
                {"to_user_id": current_user.id, "status": MessageRequestStatus.ACCEPTED}
            ]
        }).to_list(length=None)
        
        # Get all messages involving current user
        messages_cursor = db.messages.find({
            "$or": [
                {"from_user_id": current_user.id},
                {"to_user_id": current_user.id}
            ]
        }).sort("created_at", -1)
        
        all_messages = await messages_cursor.to_list(length=None)
        
        # Build conversations from both requests and messages
        conversations_map = {}
        
        for req in accepted_requests:
            other_user_id = req["to_user_id"] if req["from_user_id"] == current_user.id else req["from_user_id"]
            if other_user_id not in conversations_map:
                conversations_map[other_user_id] = {
                    "user_id": other_user_id,
                    "last_message": req.get("initial_message", ""),
                    "last_message_time": req.get("created_at"),
                    "unread_count": 0
                }
        
        # Add message data to conversations
        for msg in all_messages:
            other_user_id = msg["to_user_id"] if msg["from_user_id"] == current_user.id else msg["from_user_id"]
            
            if other_user_id not in conversations_map:
                conversations_map[other_user_id] = {
                    "user_id": other_user_id,
                    "last_message": msg.get("content", ""),
                    "last_message_time": msg.get("created_at"),
                    "unread_count": 0
                }
            else:
                # Update with latest message if more recent
                if msg.get("created_at") > conversations_map[other_user_id]["last_message_time"]:
                    conversations_map[other_user_id]["last_message"] = msg.get("content", "")
                    conversations_map[other_user_id]["last_message_time"] = msg.get("created_at")
            
            # Count unread messages from this user
            if msg["to_user_id"] == current_user.id and not msg.get("is_read", False):
                conversations_map[other_user_id]["unread_count"] += 1
        
        # Enrich conversations with user info
        result = []
        for user_id, conv_data in conversations_map.items():
            user_data = await db.users.find_one({"_id": user_id})
            if user_data:
                result.append({
                    **conv_data,
                    "user_name": user_data.get("username", "Unknown"),
                    "user_full_name": user_data.get("full_name", ""),
                    "user_avatar": user_data.get("avatar_url")
                })
        
        # Sort by last message time
        result.sort(key=lambda x: x["last_message_time"] or datetime.utcnow(), reverse=True)
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversations"
        )


@router.get("/conversation/{other_user_id}", response_model=List[MessageResponse])
async def get_conversation(
    other_user_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get conversation with another user."""
    try:
        cursor = db.messages.find({
            "$or": [
                {"from_user_id": current_user.id, "to_user_id": other_user_id},
                {"from_user_id": other_user_id, "to_user_id": current_user.id}
            ]
        }).sort("created_at", 1)
        
        messages = await cursor.to_list(length=1000)
        
        # Mark as read
        await db.messages.update_many(
            {
                "from_user_id": other_user_id,
                "to_user_id": current_user.id,
                "is_read": False
            },
            {"$set": {"is_read": True}}
        )
        
        from models.message import MessageInDB
        return [MessageResponse(**MessageInDB(**m).model_dump(by_alias=True)) for m in messages]
        
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversation"
        )

