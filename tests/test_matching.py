"""
Test script for matching service.
Run: python -m tests.test_matching
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from motor.motor_asyncio import AsyncIOMotorClient
from services.embedding_service import create_openrouter_embedding_service
from services.llm_service import create_llm_service
from services.matching_service import create_matching_service
from models.user import UserInDB, SkillItem
from bson import ObjectId
from core.config import settings


async def setup_test_users(db):
    """Create test users for matching."""
    users_collection = db.users
    
    # Clear existing test users
    await users_collection.delete_many({"email": {"$regex": "test.*@example.com"}})
    
    now = datetime.utcnow()
    
    test_users = [
        {
            "_id": "test_user_1",
            "email": "test1@example.com",
            "username": "alice_python",
            "full_name": "Alice Python",
            "hashed_password": "dummy",
            "skills_offered": [
                {"name": "Python programming", "proficiency_level": "expert", "description": "10 years of Python experience, FastAPI, Django", "tags": []},
                {"name": "Machine Learning", "proficiency_level": "advanced", "description": "TensorFlow, PyTorch, scikit-learn", "tags": []}
            ],
            "skills_needed": [
                {"name": "React development", "proficiency_level": "beginner", "description": "Want to learn modern React with hooks", "tags": []}
            ],
            "is_active": True,
            "is_verified": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": "test_user_2",
            "email": "test2@example.com",
            "username": "bob_react",
            "full_name": "Bob React",
            "hashed_password": "dummy",
            "skills_offered": [
                {"name": "React development", "proficiency_level": "expert", "description": "React, Next.js, TypeScript", "tags": []},
                {"name": "UI/UX design", "proficiency_level": "intermediate", "description": "Figma, user research", "tags": []}
            ],
            "skills_needed": [
                {"name": "Python backend", "proficiency_level": "intermediate", "description": "Want to build APIs with FastAPI", "tags": []}
            ],
            "is_active": True,
            "is_verified": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": "test_user_3",
            "email": "test3@example.com",
            "username": "charlie_data",
            "full_name": "Charlie Data",
            "hashed_password": "dummy",
            "skills_offered": [
                {"name": "Data analysis", "proficiency_level": "advanced", "description": "Pandas, SQL, data visualization", "tags": []},
            ],
            "skills_needed": [
                {"name": "Deep learning", "proficiency_level": "beginner", "description": "Neural networks and transformers", "tags": []}
            ],
            "is_active": True,
            "is_verified": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    
    await users_collection.insert_many(test_users)
    print(f"✓ Created {len(test_users)} test users")


async def test_matching():
    print("=" * 60)
    print("Testing Matching Service")
    print("=" * 60)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DATABASE_NAME]
    
    try:
        # Setup test users
        print("\n[Setup] Creating test users...")
        await setup_test_users(db)
        
        # Initialize services
        print("\n[Setup] Initializing services...")
        embed_service = create_openrouter_embedding_service(
            db=db,
            api_key=settings.OPENROUTER_API_KEY,
            model=settings.EMBEDDING_MODEL
        )
        
        llm_service = create_llm_service(
            api_key=settings.OPENROUTER_API_KEY,
            model=settings.LLM_MODEL,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS
        )
        
        matching_service = create_matching_service(
            db=db,
            embedding_service=embed_service,
            llm_service=llm_service
        )
        
        print("✓ Services initialized")
        
        # Test 1: Find matches for Alice (needs React, offers Python)
        print("\n[Test 1] Finding matches for Alice (needs React)...")
        alice_matches = await matching_service.find_matches_for_user(
            user_id="test_user_1",
            top_k=5,
            use_llm=True
        )
        
        print(f"✓ Found {len(alice_matches)} matches")
        for i, match in enumerate(alice_matches, 1):
            print(f"\n  Match {i}:")
            print(f"    Helper: {match['matched_user_id']}")
            print(f"    Offers: {match['skill_offered']}")
            print(f"    Score: {match['match_score']:.3f}")
            print(f"    Confidence: {match['confidence']:.3f}")
            print(f"    Reciprocal: {match['is_reciprocal']}")
            print(f"    Explanation: {match['explanation']}")
        
        # Test 2: Find matches for Bob (needs Python, offers React)
        print("\n[Test 2] Finding matches for Bob (needs Python)...")
        bob_matches = await matching_service.find_matches_for_user(
            user_id="test_user_2",
            top_k=5,
            use_llm=True
        )
        
        print(f"✓ Found {len(bob_matches)} matches")
        for i, match in enumerate(bob_matches, 1):
            print(f"\n  Match {i}:")
            print(f"    Helper: {match['matched_user_id']}")
            print(f"    Offers: {match['skill_offered']}")
            print(f"    Score: {match['match_score']:.3f}")
            print(f"    Confidence: {match['confidence']:.3f}")
            print(f"    Reciprocal: {match['is_reciprocal']}")
        
        # Test 3: Check for reciprocal match
        print("\n[Test 3] Checking reciprocity...")
        reciprocal_found = False
        for alice_match in alice_matches:
            if alice_match['is_reciprocal']:
                print(f"✓ RECIPROCAL MATCH FOUND!")
                print(f"  Alice needs: {alice_match['skill_needed']}")
                print(f"  Bob offers: {alice_match['skill_offered']}")
                print(f"  Bob needs: Python")
                print(f"  Alice offers: Python")
                reciprocal_found = True
                break
        
        if not reciprocal_found:
            print("! No reciprocal matches detected")
            print("  (Alice needs React, Bob offers React)")
            print("  (Bob needs Python, Alice offers Python)")
            print("  This should be reciprocal - checking logic...")
        
        # Test 4: Test without LLM (faster)
        print("\n[Test 4] Testing without LLM (embedding-only)...")
        fast_matches = await matching_service.find_matches_for_user(
            user_id="test_user_1",
            top_k=3,
            use_llm=False
        )
        print(f"✓ Found {len(fast_matches)} matches (embedding-only)")
        
        print("\n" + "=" * 60)
        print("✓ All matching tests completed!")
        print("=" * 60)
        
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(test_matching())