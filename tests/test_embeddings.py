"""
Test script for embedding service with OpenRouter.
Run from project root: python -m tests.test_embeddings
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from motor.motor_asyncio import AsyncIOMotorClient
from services.embedding_service import create_openrouter_embedding_service
from core.config import settings


async def test_embeddings():
    print("=" * 60)
    print("Testing OpenRouter Embedding Service")
    print("=" * 60)
    
    # Connect to MongoDB
    print(f"\n✓ Connecting to MongoDB...")
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DATABASE_NAME]
    
    try:
        # Verify connection
        await client.admin.command('ping')
        print(f"✓ MongoDB connected: {settings.DATABASE_NAME}")
    except Exception as e:
        print(f"✗ MongoDB connection failed: {e}")
        return
    
    # Create embedding service
    print(f"\n✓ Initializing OpenRouter...")
    print(f"  Model: {settings.EMBEDDING_MODEL}")
    
    try:
        embed_service = create_openrouter_embedding_service(
            db=db,
            api_key=settings.OPENROUTER_API_KEY,
            model=settings.EMBEDDING_MODEL
        )
        
        print(f"✓ Service initialized")
        print(f"  Dimension: {embed_service.dimension}")
    except Exception as e:
        print(f"✗ Service initialization failed: {e}")
        client.close()
        return
    
    # Test 1: Generate embedding for skill
    print(f"\n[Test 1] Generating embedding for skill...")
    try:
        vec1 = await embed_service.get_or_create(
            owner_user_id="test_user_1",
            item_type="skill",
            ref_id="skill_123",
            text="Python programming and FastAPI development"
        )
        
        print(f"✓ Embedding generated")
        print(f"  First 5 dimensions: {[f'{x:.4f}' for x in vec1[:5]]}")
        print(f"  Total dimensions: {len(vec1)}")
    except Exception as e:
        print(f"✗ Embedding generation failed: {e}")
        client.close()
        return
    
    # Test 2: Test cache (should be instant)
    print(f"\n[Test 2] Testing cache with same text...")
    try:
        vec2 = await embed_service.get_or_create(
            owner_user_id="test_user_1",
            item_type="skill",
            ref_id="skill_123",
            text="Python programming and FastAPI development"
        )
        
        cache_works = vec1 == vec2
        print(f"✓ Cache test: {'PASSED' if cache_works else 'FAILED'}")
        print(f"  Vectors match: {cache_works}")
    except Exception as e:
        print(f"✗ Cache test failed: {e}")
    
    # Test 3: Generate embedding for related need
    print(f"\n[Test 3] Testing similarity with related text...")
    try:
        vec3 = await embed_service.get_or_create(
            owner_user_id="test_user_2",
            item_type="need",
            ref_id="need_456",
            text="Learning Python web frameworks like Django or FastAPI"
        )
        
        similarity = embed_service.cosine_similarity(vec1, vec3)
        print(f"✓ Similarity computed")
        print(f"  'Python FastAPI' vs 'Python web frameworks': {similarity:.4f}")
        print(f"  Expected: High similarity (>0.7)")
    except Exception as e:
        print(f"✗ Similarity test failed: {e}")
    
    # Test 4: Test unrelated text
    print(f"\n[Test 4] Testing similarity with unrelated text...")
    try:
        vec4 = await embed_service.get_or_create(
            owner_user_id="test_user_3",
            item_type="skill",
            ref_id="skill_789",
            text="Graphic design and Adobe Photoshop"
        )
        
        similarity2 = embed_service.cosine_similarity(vec1, vec4)
        print(f"✓ Similarity computed")
        print(f"  'Python FastAPI' vs 'Graphic Design': {similarity2:.4f}")
        print(f"  Expected: Low similarity (<0.5)")
    except Exception as e:
        print(f"✗ Unrelated similarity test failed: {e}")
    
    # Test 5: Batch embedding
    print(f"\n[Test 5] Testing batch embedding...")
    try:
        texts = [
            "JavaScript and React development",
            "Machine learning with TensorFlow",
            "Database design and SQL"
        ]
        
        batch_vecs = await embed_service.embed_many(texts)
        print(f"✓ Batch embedding completed")
        print(f"  Generated {len(batch_vecs)} embeddings")
        print(f"  Each with {len(batch_vecs[0])} dimensions")
    except Exception as e:
        print(f"✗ Batch embedding failed: {e}")
    
    print("\n" + "=" * 60)
    print("✓ All tests completed!")
    print("=" * 60)
    
    client.close()


if __name__ == "__main__":
    try:
        asyncio.run(test_embeddings())
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
    except Exception as e:
        print(f"\n\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()