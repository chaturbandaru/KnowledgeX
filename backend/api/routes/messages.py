"""
Messaging routes for user-to-user communication.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
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
    to_user_id: str,
    match_id: str,
    initial_message: str,
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


@router.post("/send")
async def send_message(
    to_user_id: str,
    content: str,
    match_id: str,
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
                {"from_user_id": current_user.id, "to_user_id": to_user_id},
                {"from_user_id": to_user_id, "to_user_id": current_user.id}
            ],
            "status": MessageRequestStatus.ACCEPTED
        })
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No accepted connection with this user"
            )
        
        # Create message
        message = {
            "_id": str(ObjectId()),
            "from_user_id": current_user.id,
            "to_user_id": to_user_id,
            "match_id": match_id,
            "content": content,
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

