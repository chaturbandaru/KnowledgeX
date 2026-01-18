"""
Barter routes for 3-way cycle detection.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from core.database import get_database
from models.user import UserInDB
from api.middleware.auth import get_current_active_user
from services.barter_service import create_barter_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/barters", tags=["Barters"])


@router.get("/cycles")
async def detect_barter_cycles(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Detect 3-way barter cycles involving the current user.
    
    A 3-way cycle allows three users to help each other:
    - User A helps User C
    - User B helps User A
    - User C helps User B
    
    This ensures everyone gives and receives value.
    """
    try:
        barter_service = create_barter_service(db)
        
        cycles = await barter_service.detect_3way_cycles(current_user.id)
        
        return {
            "message": f"Found {len(cycles)} barter cycles",
            "total_cycles": len(cycles),
            "cycles": cycles
        }
        
    except Exception as e:
        logger.error(f"Error detecting barter cycles: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to detect barter cycles"
        )