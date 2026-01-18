"""
Storage service for database operations.
Provides abstraction layer over MongoDB collections.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
import logging

from models.user import UserInDB, SkillItem
from models.skill import SkillInDB, SkillCreate, SkillUpdate
from models.match import MatchInDB, MatchCreate, MatchUpdate, MatchStatus
from models.barter import BarterInDB, BarterCreate, BarterUpdate, BarterStatus

logger = logging.getLogger(__name__)


class StorageService:
    """Database storage operations for all entities."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    # ==================== User Operations ====================
    
    async def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        """Get user by ID."""
        try:
            user_data = await self.db.users.find_one({"_id": user_id})
            if user_data:
                return UserInDB(**user_data)
            return None
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            return None
    
    async def get_active_users(
        self,
        skip: int = 0,
        limit: int = 100,
        exclude_user_id: Optional[str] = None
    ) -> List[UserInDB]:
        """Get active users for matching."""
        try:
            query = {"is_active": True}
            if exclude_user_id:
                query["_id"] = {"$ne": exclude_user_id}
            
            cursor = self.db.users.find(query).skip(skip).limit(limit)
            users_data = await cursor.to_list(length=limit)
            
            return [UserInDB(**user_data) for user_data in users_data]
        except Exception as e:
            logger.error(f"Error getting active users: {e}")
            return []
    
    async def get_users_by_ids(self, user_ids: List[str]) -> List[UserInDB]:
        """Get multiple users by IDs."""
        try:
            cursor = self.db.users.find({"_id": {"$in": user_ids}})
            users_data = await cursor.to_list(length=len(user_ids))
            return [UserInDB(**user_data) for user_data in users_data]
        except Exception as e:
            logger.error(f"Error getting users by IDs: {e}")
            return []
    
    # ==================== Skill Operations ====================
    
    async def create_skill(self, skill: SkillCreate) -> Optional[SkillInDB]:
        """Create a new skill."""
        try:
            skill_dict = skill.model_dump()
            skill_dict["_id"] = str(ObjectId())
            skill_dict["created_at"] = datetime.utcnow()
            skill_dict["updated_at"] = datetime.utcnow()
            
            skill_in_db = SkillInDB(**skill_dict)
            await self.db.skills.insert_one(skill_in_db.model_dump(by_alias=True))
            
            return skill_in_db
        except Exception as e:
            logger.error(f"Error creating skill: {e}")
            return None
    
    async def get_skills_by_user(
        self,
        user_id: str,
        is_offered: Optional[bool] = None
    ) -> List[SkillInDB]:
        """Get skills for a user."""
        try:
            query = {"user_id": user_id}
            if is_offered is not None:
                query["is_offered"] = is_offered
            
            cursor = self.db.skills.find(query)
            skills_data = await cursor.to_list(length=100)
            
            return [SkillInDB(**skill_data) for skill_data in skills_data]
        except Exception as e:
            logger.error(f"Error getting skills for user {user_id}: {e}")
            return []
    
    async def update_skill(
        self,
        skill_id: str,
        updates: SkillUpdate
    ) -> Optional[SkillInDB]:
        """Update a skill."""
        try:
            update_data = updates.model_dump(exclude_unset=True, exclude_none=True)
            if not update_data:
                return await self.get_skill_by_id(skill_id)
            
            update_data["updated_at"] = datetime.utcnow()
            
            await self.db.skills.update_one(
                {"_id": skill_id},
                {"$set": update_data}
            )
            
            return await self.get_skill_by_id(skill_id)
        except Exception as e:
            logger.error(f"Error updating skill {skill_id}: {e}")
            return None
    
    async def get_skill_by_id(self, skill_id: str) -> Optional[SkillInDB]:
        """Get skill by ID."""
        try:
            skill_data = await self.db.skills.find_one({"_id": skill_id})
            if skill_data:
                return SkillInDB(**skill_data)
            return None
        except Exception as e:
            logger.error(f"Error getting skill {skill_id}: {e}")
            return None
    
    async def delete_skill(self, skill_id: str) -> bool:
        """Delete a skill."""
        try:
            result = await self.db.skills.delete_one({"_id": skill_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting skill {skill_id}: {e}")
            return False
    
    # ==================== Match Operations ====================
    
    async def create_match(self, match: MatchCreate) -> Optional[MatchInDB]:
        """Create a new match."""
        try:
            match_dict = match.model_dump()
            match_dict["_id"] = str(ObjectId())
            match_dict["status"] = MatchStatus.PENDING
            match_dict["created_at"] = datetime.utcnow()
            match_dict["updated_at"] = datetime.utcnow()
            
            match_in_db = MatchInDB(**match_dict)
            await self.db.matches.insert_one(match_in_db.model_dump(by_alias=True))
            
            return match_in_db
        except Exception as e:
            logger.error(f"Error creating match: {e}")
            return None
    
    async def get_matches_for_user(
        self,
        user_id: str,
        status: Optional[MatchStatus] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[MatchInDB]:
        """Get matches for a user."""
        try:
            query = {"user_id": user_id}
            if status:
                query["status"] = status
            
            cursor = self.db.matches.find(query).sort("created_at", -1).skip(skip).limit(limit)
            matches_data = await cursor.to_list(length=limit)
            
            return [MatchInDB(**match_data) for match_data in matches_data]
        except Exception as e:
            logger.error(f"Error getting matches for user {user_id}: {e}")
            return []
    
    async def update_match_status(
        self,
        match_id: str,
        status: MatchStatus,
        feedback: Optional[str] = None
    ) -> Optional[MatchInDB]:
        """Update match status."""
        try:
            update_data = {
                "status": status,
                "updated_at": datetime.utcnow()
            }
            if feedback:
                update_data["metadata.feedback"] = feedback
            
            await self.db.matches.update_one(
                {"_id": match_id},
                {"$set": update_data}
            )
            
            match_data = await self.db.matches.find_one({"_id": match_id})
            if match_data:
                return MatchInDB(**match_data)
            return None
        except Exception as e:
            logger.error(f"Error updating match {match_id}: {e}")
            return None
    
    async def check_existing_match(
        self,
        user_id: str,
        matched_user_id: str
    ) -> Optional[MatchInDB]:
        """Check if a match already exists between two users."""
        try:
            match_data = await self.db.matches.find_one({
                "user_id": user_id,
                "matched_user_id": matched_user_id,
                "status": {"$ne": MatchStatus.REJECTED}
            })
            if match_data:
                return MatchInDB(**match_data)
            return None
        except Exception as e:
            logger.error(f"Error checking existing match: {e}")
            return None
    
    # ==================== Barter Operations ====================
    
    async def create_barter(self, barter: BarterCreate) -> Optional[BarterInDB]:
        """Create a new barter."""
        try:
            barter_dict = barter.model_dump()
            barter_dict["_id"] = str(ObjectId())
            barter_dict["status"] = BarterStatus.PROPOSED
            barter_dict["created_at"] = datetime.utcnow()
            barter_dict["updated_at"] = datetime.utcnow()
            
            barter_in_db = BarterInDB(**barter_dict)
            await self.db.barters.insert_one(barter_in_db.model_dump(by_alias=True))
            
            return barter_in_db
        except Exception as e:
            logger.error(f"Error creating barter: {e}")
            return None
    
    async def get_barters_for_user(
        self,
        user_id: str,
        status: Optional[BarterStatus] = None
    ) -> List[BarterInDB]:
        """Get barters involving a user."""
        try:
            query = {"participants": user_id}
            if status:
                query["status"] = status
            
            cursor = self.db.barters.find(query).sort("created_at", -1)
            barters_data = await cursor.to_list(length=100)
            
            return [BarterInDB(**barter_data) for barter_data in barters_data]
        except Exception as e:
            logger.error(f"Error getting barters for user {user_id}: {e}")
            return []
    
    async def update_barter(
        self,
        barter_id: str,
        updates: BarterUpdate
    ) -> Optional[BarterInDB]:
        """Update a barter."""
        try:
            update_data = updates.model_dump(exclude_unset=True, exclude_none=True)
            if not update_data:
                return await self.get_barter_by_id(barter_id)
            
            update_data["updated_at"] = datetime.utcnow()
            
            await self.db.barters.update_one(
                {"_id": barter_id},
                {"$set": update_data}
            )
            
            return await self.get_barter_by_id(barter_id)
        except Exception as e:
            logger.error(f"Error updating barter {barter_id}: {e}")
            return None
    
    async def get_barter_by_id(self, barter_id: str) -> Optional[BarterInDB]:
        """Get barter by ID."""
        try:
            barter_data = await self.db.barters.find_one({"_id": barter_id})
            if barter_data:
                return BarterInDB(**barter_data)
            return None
        except Exception as e:
            logger.error(f"Error getting barter {barter_id}: {e}")
            return None
    
    # ==================== Embedding Cache Operations ====================
    
    async def get_cached_embedding(
        self,
        owner_user_id: str,
        item_type: str,
        ref_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached embedding from database."""
        try:
            cache_data = await self.db.embeddings_cache.find_one({
                "ownerUserId": owner_user_id,
                "type": item_type,
                "refId": ref_id
            })
            return cache_data
        except Exception as e:
            logger.error(f"Error getting cached embedding: {e}")
            return None
    
    async def upsert_embedding(self, cache_doc: Dict[str, Any]) -> None:
        """Upsert embedding cache document."""
        try:
            await self.db.embeddings_cache.update_one(
                {
                    "ownerUserId": cache_doc["ownerUserId"],
                    "type": cache_doc["type"],
                    "refId": cache_doc["refId"]
                },
                {"$set": cache_doc},
                upsert=True
            )
        except Exception as e:
            logger.error(f"Error upserting embedding cache: {e}")