"""
Embedding service with caching and OpenRouter provider support.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Protocol
from motor.motor_asyncio import AsyncIOMotorDatabase
import numpy as np
import logging

logger = logging.getLogger(__name__)


# ==================== Protocols ====================

class EmbeddingCacheRepo(Protocol):
    """Storage interface for embeddings_cache collection."""
    
    async def get_by_owner_type_ref(
        self,
        owner_user_id: str,
        item_type: str,
        ref_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached embedding by owner, type, and ref_id."""
        ...
    
    async def upsert(self, doc: Dict[str, Any]) -> None:
        """Insert or update embedding cache document."""
        ...


class EmbedProvider(Protocol):
    """Provider interface for generating embeddings."""
    
    async def embed(self, texts: Sequence[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        ...
    
    @property
    def model_name(self) -> str:
        """Get the model name used by this provider."""
        ...
    
    @property
    def dimension(self) -> int:
        """Get the embedding dimension."""
        ...


# ==================== MongoDB Cache Repository ====================

class MongoEmbeddingCacheRepo:
    """MongoDB implementation of embedding cache repository."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.embeddings_cache
    
    async def get_by_owner_type_ref(
        self,
        owner_user_id: str,
        item_type: str,
        ref_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get cached embedding."""
        try:
            result = await self.collection.find_one({
                "ownerUserId": owner_user_id,
                "type": item_type,
                "refId": ref_id
            })
            return result
        except Exception as e:
            logger.error(f"Error getting cached embedding: {e}")
            return None
    
    async def upsert(self, doc: Dict[str, Any]) -> None:
        """Upsert embedding cache document."""
        try:
            await self.collection.update_one(
                {
                    "ownerUserId": doc["ownerUserId"],
                    "type": doc["type"],
                    "refId": doc["refId"]
                },
                {"$set": doc},
                upsert=True
            )
        except Exception as e:
            logger.error(f"Error upserting embedding: {e}")
            raise


# ==================== OpenRouter Embedding Provider ====================

# ==================== OpenRouter Embedding Provider ====================

class OpenRouterEmbedProvider:
    """OpenRouter embedding provider using OpenAI-compatible API."""
    
    def __init__(self, api_key: str, model: str = "openai/text-embedding-3-small"):
        try:
            from openai import AsyncOpenAI
        except ImportError:
            raise ImportError(
                "OpenAI package not installed. "
                "Install with: pip install openai"
            )
        
        # OpenRouter uses OpenAI-compatible API
        # Don't pass extra parameters that might not be supported
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key,
            default_headers={
                "HTTP-Referer": "https://github.com/knowledge-debt-exchange",
                "X-Title": "Knowledge Debt Exchange"
            }
        )
        self._model_name = model
        
        # Determine dimension based on model
        if "text-embedding-3-small" in model:
            self._dimension = 1536
        elif "text-embedding-3-large" in model:
            self._dimension = 3072
        else:
            self._dimension = 1536  # Default
    
    async def embed(self, texts: Sequence[str]) -> List[List[float]]:
        """Generate embeddings using OpenRouter API."""
        if not texts:
            return []
        
        try:
            # Convert to list and filter empty strings
            text_list = [str(t).strip() for t in texts if str(t).strip()]
            
            if not text_list:
                logger.warning("All texts were empty after filtering")
                return [[0.0] * self._dimension for _ in texts]
            
            # OpenRouter expects model without provider prefix for embeddings
            # But we'll try with the full model name first
            try:
                response = await self.client.embeddings.create(
                    input=text_list,
                    model=self._model_name
                )
            except Exception as e:
                # If that fails, try without the provider prefix
                logger.warning(f"Failed with full model name, trying without prefix: {e}")
                model_without_prefix = self._model_name.split("/")[-1]
                response = await self.client.embeddings.create(
                    input=text_list,
                    model=model_without_prefix
                )
            
            embeddings = [item.embedding for item in response.data]
            return embeddings
            
        except Exception as e:
            logger.error(f"OpenRouter embedding error: {e}")
            raise
    
    @property
    def model_name(self) -> str:
        return self._model_name
    
    @property
    def dimension(self) -> int:
        return self._dimension


# ==================== Helper Functions ====================

def sha256_text(text: str) -> str:
    """Generate SHA256 hash of normalized text."""
    normalized = " ".join((text or "").strip().split())
    return "sha256:" + hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def utc_now() -> datetime:
    """Get current UTC timestamp."""
    return datetime.now(timezone.utc)


# ==================== Main Embedding Service ====================

class EmbeddingService:
    """
    Embedding service with caching and provider abstraction.
    
    Cache schema:
    {
        "ownerUserId": str,
        "type": "skill" | "need",
        "refId": str,
        "model": str,
        "textHash": str,
        "dim": int,
        "vector": List[float],
        "createdAt": datetime,
        "updatedAt": datetime
    }
    """
    
    def __init__(self, cache_repo: EmbeddingCacheRepo, provider: EmbedProvider):
        self._cache = cache_repo
        self._provider = provider
        logger.info(f"EmbeddingService initialized with model: {provider.model_name}")
    
    @property
    def model_name(self) -> str:
        """Get the embedding model name."""
        return self._provider.model_name
    
    @property
    def dimension(self) -> int:
        """Get the embedding dimension."""
        return self._provider.dimension
    
    async def get_or_create(
        self,
        *,
        owner_user_id: str,
        item_type: str,
        ref_id: str,
        text: str,
    ) -> List[float]:
        """
        Get cached embedding or generate new one.
        
        Args:
            owner_user_id: User who owns this embedding
            item_type: Type of item ("skill" or "need")
            ref_id: Reference ID for the item
            text: Text to embed
            
        Returns:
            Embedding vector
        """
        text_hash = sha256_text(text)
        
        # Try to get from cache
        cached = await self._cache.get_by_owner_type_ref(
            owner_user_id=owner_user_id,
            item_type=item_type,
            ref_id=ref_id,
        )
        
        if cached:
            same_model = cached.get("model") == self.model_name
            same_hash = cached.get("textHash") == text_hash
            vector = cached.get("vector")
            
            if same_model and same_hash and isinstance(vector, list) and len(vector) > 0:
                logger.debug(f"Cache hit for {item_type}:{ref_id}")
                return [float(x) for x in vector]
            else:
                logger.debug(f"Cache miss (stale) for {item_type}:{ref_id}")
        else:
            logger.debug(f"Cache miss (not found) for {item_type}:{ref_id}")
        
        # Generate new embedding
        vectors = await self._provider.embed([text])
        vec = vectors[0]
        dim = len(vec)
        
        # Store in cache
        now = utc_now()
        doc = {
            "ownerUserId": owner_user_id,
            "type": item_type,
            "refId": ref_id,
            "model": self.model_name,
            "textHash": text_hash,
            "dim": dim,
            "vector": [float(x) for x in vec],
            "updatedAt": now,
            "createdAt": cached.get("createdAt", now) if cached else now,
        }
        
        await self._cache.upsert(doc)
        logger.info(f"Generated and cached embedding for {item_type}:{ref_id}")
        
        return doc["vector"]
    
    async def embed_many(self, texts: Sequence[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts without caching.
        Useful for quick comparisons.
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of embedding vectors
        """
        return await self._provider.embed(texts)
    
    async def embed_batch_with_cache(
        self,
        items: List[Dict[str, str]]
    ) -> List[List[float]]:
        """
        Batch embed with cache support.
        
        Args:
            items: List of dicts with keys: owner_user_id, item_type, ref_id, text
            
        Returns:
            List of embedding vectors
        """
        embeddings = []
        
        for item in items:
            vec = await self.get_or_create(
                owner_user_id=item["owner_user_id"],
                item_type=item["item_type"],
                ref_id=item["ref_id"],
                text=item["text"]
            )
            embeddings.append(vec)
        
        return embeddings
    
    @staticmethod
    def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
        """
        Compute cosine similarity between two vectors.
        
        Args:
            a: First vector
            b: Second vector
            
        Returns:
            Cosine similarity in range [-1, 1]
        """
        va = np.asarray(a, dtype=np.float32)
        vb = np.asarray(b, dtype=np.float32)
        
        na = float(np.linalg.norm(va))
        nb = float(np.linalg.norm(vb))
        
        if na == 0.0 or nb == 0.0:
            return 0.0
        
        similarity = float(np.dot(va, vb) / (na * nb))
        return max(-1.0, min(1.0, similarity))


# ==================== Factory Function ====================

def create_openrouter_embedding_service(
    db: AsyncIOMotorDatabase,
    api_key: str,
    model: str = "openai/text-embedding-3-small"
) -> EmbeddingService:
    """
    Create embedding service with OpenRouter provider.
    
    Args:
        db: MongoDB database instance
        api_key: OpenRouter API key
        model: Embedding model name
        
    Returns:
        Configured EmbeddingService
    """
    cache_repo = MongoEmbeddingCacheRepo(db)
    provider = OpenRouterEmbedProvider(api_key=api_key, model=model)
    return EmbeddingService(cache_repo=cache_repo, provider=provider)