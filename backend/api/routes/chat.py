"""
Chat routes for conversational skill extraction.
"""

from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from core.database import get_database
from core.config import settings
from models.user import UserInDB, SkillItem
from api.middleware.auth import get_current_active_user
from services.chat_service import create_chat_service
from services.llm_service import create_llm_service
import logging
import re
import tokenc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])

# ✅ ADD THIS - Initialize token compression client (singleton)
_token_client = None

def get_token_client():
    """Get or create token compression client."""
    global _token_client
    if _token_client is None:
        api_key = os.getenv("TTC_API_KEY") or settings.TTC_API_KEY  # Add to your config
        if api_key:
            _token_client = tokenc.TokenClient(api_key=api_key)
        else:
            logger.warning("TTC_API_KEY not set - token compression disabled")
    return _token_client


# ✅ ADD THIS HELPER FUNCTION
def compress_text_if_needed(text: str, aggressiveness: float = 0.5, min_words: int = 100) -> str:
    """
    Compress text if it exceeds minimum length.
    
    Args:
        text: Text to compress
        aggressiveness: Compression level (0.0-1.0)
        min_words: Minimum word count before compression kicks in
    
    Returns:
        Compressed or original text
    """
    if not text or len(text.split()) < min_words:
        return text
    
    client = get_token_client()
    if not client:
        return text  # No compression if client not available
    
    try:
        result = client.compress_input(input=text, aggressiveness=aggressiveness)
        
        original_words = len(text.split())
        compressed_words = len(result.output.split())
        reduction = ((original_words - compressed_words) / original_words) * 100
        
        logger.info(f"[Token Compression] {original_words} → {compressed_words} words ({reduction:.1f}% reduction)")
        
        return result.output
    except Exception as e:
        logger.warning(f"[Token Compression Error] {e}. Using original text.")
        return text


# ✅ ADD THIS HELPER FUNCTION
def compress_chat_history(
    history: List[Dict[str, str]], 
    keep_recent: int = 3,
    aggressiveness: float = 0.6
) -> List[Dict[str, str]]:
    """
    Compress older messages in chat history while keeping recent ones intact.
    
    Args:
        history: List of message dicts with 'role' and 'content'
        keep_recent: Number of recent messages to keep uncompressed
        aggressiveness: Compression level for older messages
    
    Returns:
        List of messages with older ones compressed
    """
    if not history:
        return []
    
    compressed = []
    total = len(history)
    
    for i, msg in enumerate(history):
        # Keep recent messages uncompressed
        if i >= total - keep_recent:
            compressed.append(msg)
        else:
            # Compress older messages
            compressed_content = compress_text_if_needed(
                msg.get('content', ''),
                aggressiveness=aggressiveness,
                min_words=50  # Lower threshold for old messages
            )
            compressed.append({
                'role': msg['role'],
                'content': compressed_content
            })
    
    return compressed


class ChatMessage(BaseModel):
    """Chat message from user."""
    message: str


class MatchedUser(BaseModel):
    """Matched user from database."""
    id: str
    username: str
    full_name: str
    bio: Optional[str] = None
    skills_offered: List[dict] = []
    match_score: float = 0.0


class ChatResponse(BaseModel):
    """Chat response from AI."""
    response: str
    needs_extraction_ready: bool
    extracted_needs: List[dict] = []
    matched_users: List[MatchedUser] = []


async def find_matching_users_in_db(
    db: AsyncIOMotorDatabase,
    needed_skills: List[Dict[str, str]],
    current_user_id: str,
    limit: int = 5
) -> List[MatchedUser]:
    """
    Find real registered users from database who offer the needed skills.
    
    Args:
        db: Database connection
        needed_skills: List of skill dictionaries with 'name' and 'description'
        current_user_id: ID of the user requesting matches (to exclude from results)
        limit: Maximum number of users to return
    
    Returns:
        List of MatchedUser objects with actual database records
    """
    if not needed_skills:
        return []
    
    matched_users = []
    
    try:
        # Extract skill names (lowercase for case-insensitive matching)
        needed_skill_names = [skill.get("name", "").lower().strip() for skill in needed_skills if skill.get("name")]
        
        if not needed_skill_names:
            return []
        
        # Query database for users who offer these skills
        query = {
            "_id": {"$ne": current_user_id},  # Exclude current user
            "skills_offered": {"$exists": True, "$ne": []},
            "is_active": {"$ne": False}  # Only active users
        }
        
        cursor = db.users.find(query).limit(limit * 3)  # Get more than needed for filtering
        all_users = await cursor.to_list(length=limit * 3)
        
        # Score and filter users based on skill matching
        scored_users = []
        for user in all_users:
            offered_skills = user.get("skills_offered", [])
            if not offered_skills:
                continue
            
            # Calculate match score
            match_count = 0
            offered_skill_names = []
            
            for skill in offered_skills:
                skill_name = skill.get("name", "").lower().strip() if isinstance(skill, dict) else str(skill).lower().strip()
                offered_skill_names.append(skill_name)
                
                # Direct match
                if skill_name in needed_skill_names:
                    match_count += 1
                # Partial match (e.g., "python" matches "python programming")
                else:
                    for needed_skill in needed_skill_names:
                        if skill_name in needed_skill or needed_skill in skill_name:
                            match_count += 0.5
                            break
            
            if match_count > 0:
                match_score = min(match_count / len(needed_skill_names), 1.0)
                scored_users.append({
                    "user": user,
                    "score": match_score,
                    "match_count": match_count
                })
        
        # Sort by score (descending) and take top results
        scored_users.sort(key=lambda x: x["score"], reverse=True)
        
        for scored_user in scored_users[:limit]:
            user = scored_user["user"]
            matched_users.append(
                MatchedUser(
                    id=str(user.get("_id", "")),
                    username=user.get("username", "Unknown"),
                    full_name=user.get("full_name", ""),
                    bio=user.get("bio"),
                    skills_offered=user.get("skills_offered", []),
                    match_score=scored_user["score"]
                )
            )
    
    except Exception as e:
        logger.error(f"Error finding matching users: {e}", exc_info=True)
        # Return empty list on error to prevent hallucination
        return []
    
    return matched_users


@router.post("/message", response_model=ChatResponse)
async def send_chat_message(
    chat_msg: ChatMessage,
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Send a message in the skill extraction chat.
    
    The AI will ask follow-up questions to understand what you want to learn.
    Once it has enough info, it will extract your learning needs.
    
    IMPORTANT: Only returns real registered users from the database who match the extracted skills.
    NO AI-HALLUCINATED MATCHES - all matches are verified against the database.
    """
    try:
        # Get user's chat history
        user_data = await db.users.find_one({"_id": current_user.id})
        chat_history = user_data.get("chat_history", [])
        
        # ✅ COMPRESS CHAT HISTORY BEFORE SENDING TO LLM
        # This saves 40-60% tokens on conversation context
        compressed_history = compress_chat_history(
            history=chat_history,
            keep_recent=3,  # Keep last 3 messages uncompressed for context quality
            aggressiveness=0.6  # Aggressive compression for old messages
        )
        
        logger.info(f"Original history: {len(chat_history)} messages, Compressed history prepared")
        
        # ✅ OPTIONALLY COMPRESS USER MESSAGE (only if very long)
        # Most user messages are short, but compress verbose ones
        compressed_user_message = compress_text_if_needed(
            text=chat_msg.message,
            aggressiveness=0.3,  # Light compression - preserve user intent
            min_words=80  # Only compress if message is > 80 words
        )
        
        # Create services
        llm_service = create_llm_service(
            api_key=settings.OPENROUTER_API_KEY,
            model=settings.LLM_MODEL
        )
        
        chat_service = create_chat_service(
            api_key=settings.OPENROUTER_API_KEY,
            model=settings.LLM_MODEL,
            llm_service=llm_service
        )
        
        # ✅ PASS COMPRESSED DATA TO CHAT SERVICE
        # Get AI response with compressed history
        result = await chat_service.chat_response(
            user_message=compressed_user_message,  # Use compressed version
            chat_history=compressed_history  # Use compressed history
        )
        
        # ✅ SAVE ORIGINAL (NOT COMPRESSED) TO DATABASE
        # Store original messages for user's benefit
        chat_history.append({"role": "user", "content": chat_msg.message})  # Original
        chat_history.append({"role": "assistant", "content": result["response"]})
        
        # Save to database
        await db.users.update_one(
            {"_id": current_user.id},
            {"$set": {"chat_history": chat_history}}
        )
        
        # Container for matched users
        matched_users: List[MatchedUser] = []
        
        # If needs are extracted, find REAL users from database
        if result["needs_extraction_ready"]:
            skills_needed = [
                SkillItem(**need) for need in result["extracted_needs"]
            ]
            
            # CRITICAL: Query database for real users with matching skills
            extracted_needs_dict = [s.model_dump() for s in skills_needed]
            matched_users = await find_matching_users_in_db(
                db=db,
                needed_skills=extracted_needs_dict,
                current_user_id=current_user.id,
                limit=5
            )
            
            logger.info(
                f"Extracted {len(skills_needed)} needs for user {current_user.id}, "
                f"found {len(matched_users)} real database matches"
            )
            
            # Save extracted needs
            await db.users.update_one(
                {"_id": current_user.id},
                {
                    "$set": {
                        "skills_needed": extracted_needs_dict,
                        "chat_extracted_needs": chat_msg.message
                    }
                }
            )
        
        return ChatResponse(
            response=result["response"],
            needs_extraction_ready=result["needs_extraction_ready"],
            extracted_needs=result["extracted_needs"],
            matched_users=matched_users  # Only real database users
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chat failed"
        )


@router.get("/history")
async def get_chat_history(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get chat history for current user."""
    user_data = await db.users.find_one({"_id": current_user.id})
    return {
        "chat_history": user_data.get("chat_history", [])
    }


@router.delete("/history")
async def clear_chat_history(
    current_user: UserInDB = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Clear chat history and extracted needs."""
    await db.users.update_one(
        {"_id": current_user.id},
        {
            "$set": {
                "chat_history": [],
                "skills_needed": [],
                "chat_extracted_needs": None
            }
        }
    )
    
    return {"message": "Chat history cleared"}