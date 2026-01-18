"""
Database connection and management for MongoDB using Motor (async driver).
Provides database instance and collection accessors.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from typing import Optional
import logging

from .config import settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages MongoDB connection and provides database access."""
    
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db: Optional[AsyncIOMotorDatabase] = None
        self._connected = False
    
    async def connect(self):
        """
        Connect to MongoDB database.
        Called during application startup.
        """
        if self._connected:
            logger.info("Database already connected")
            return
            
        try:
            logger.info("Connecting to MongoDB...")
            
            # Create Motor client
            self.client = AsyncIOMotorClient(
                settings.MONGO_URL,
                serverSelectionTimeoutMS=5000,
                maxPoolSize=10,
                minPoolSize=1
            )
            
            # Get database instance
            self.db = self.client[settings.DATABASE_NAME]
            
            # Verify connection
            await self.client.admin.command('ping')
            
            self._connected = True
            
            logger.info(f"Successfully connected to MongoDB database: {settings.DATABASE_NAME}")
            
            # Create indexes
            await self._create_indexes()
            
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error connecting to MongoDB: {e}")
            raise
    
    async def disconnect(self):
        """
        Disconnect from MongoDB database.
        Called during application shutdown.
        """
        if self.client:
            logger.info("Closing MongoDB connection...")
            self.client.close()
            self._connected = False
            logger.info("MongoDB connection closed")
    
    async def _create_indexes(self):
        """Create database indexes for optimal query performance."""
        try:
            # Users collection indexes
            await self.db.users.create_index("email", unique=True)
            await self.db.users.create_index("username", unique=True)
            await self.db.users.create_index("created_at")
            
            # Skills collection indexes
            await self.db.skills.create_index("user_id")
            await self.db.skills.create_index("category")
            await self.db.skills.create_index([("name", "text"), ("description", "text")])
            
            # Matches collection indexes
            await self.db.matches.create_index("user_id")
            await self.db.matches.create_index("matched_user_id")
            await self.db.matches.create_index("created_at")
            await self.db.matches.create_index("status")
            
            # Barters collection indexes
            await self.db.barters.create_index("participants")
            await self.db.barters.create_index("status")
            await self.db.barters.create_index("created_at")
            
            logger.info("Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")
    
    def get_database(self) -> AsyncIOMotorDatabase:
        """Get the database instance."""
        if self.db is None:
            raise RuntimeError("Database not initialized. Call connect() first.")
        return self.db
    
    # Collection accessors
    @property
    def users(self):
        """Get users collection."""
        return self.get_database().users
    
    @property
    def skills(self):
        """Get skills collection."""
        return self.get_database().skills
    
    @property
    def matches(self):
        """Get matches collection."""
        return self.get_database().matches
    
    @property
    def barters(self):
        """Get barters collection."""
        return self.get_database().barters


# Global database manager instance
db_manager = DatabaseManager()


# Dependency for FastAPI routes
async def get_database() -> AsyncIOMotorDatabase:
    """
    FastAPI dependency to get database instance.
    
    Usage in routes:
        async def route(db: AsyncIOMotorDatabase = Depends(get_database)):
            ...
    """
    # Auto-connect if not connected (failsafe)
    if not db_manager._connected:
        await db_manager.connect()
    
    return db_manager.get_database()