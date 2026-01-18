"""
Simple MongoDB connection test.
Run: python -m tests.test_mongo_connection
"""

import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from pymongo import MongoClient
from core.config import settings

def test_connection():
    print("=" * 60)
    print("Testing MongoDB Connection")
    print("=" * 60)
    
    print(f"\n✓ MongoDB URL: {settings.MONGO_URL[:50]}...")
    print(f"✓ Database: {settings.DATABASE_NAME}")
    
    try:
        print(f"\n✓ Attempting connection...")
        client = MongoClient(
            settings.MONGO_URL,
            serverSelectionTimeoutMS=10000,  # 10 seconds
            connectTimeoutMS=10000
        )
        
        # Force connection
        print(f"✓ Pinging server...")
        client.admin.command('ping')
        
        print(f"✓ SUCCESS: Connected to MongoDB!")
        
        # List databases
        dbs = client.list_database_names()
        print(f"\n✓ Available databases: {dbs}")
        
        # Check if your database exists
        if settings.DATABASE_NAME in dbs:
            print(f"Database '{settings.DATABASE_NAME}' exists")
            
            # List collections
            db = client[settings.DATABASE_NAME]
            collections = db.list_collection_names()
            print(f"Collections: {collections if collections else 'None (new database)'}")
        else:
            print(f"! Database '{settings.DATABASE_NAME}' will be created on first write")
        
        client.close()
        
    except Exception as e:
        print(f"\n CONNECTION FAILED")
        print(f"Error: {e}")
        print(f"\nPossible causes:")
        print(f"  1. Network/Firewall blocking MongoDB ports")
        print(f"  2. IP not whitelisted in MongoDB Atlas")
        print(f"  3. Invalid credentials in MONGO_URL")
        print(f"  4. MongoDB Atlas cluster is paused")
        return False
    
    return True

if __name__ == "__main__":
    success = test_connection()
    sys.exit(0 if success else 1)