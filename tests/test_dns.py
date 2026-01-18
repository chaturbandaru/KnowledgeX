"""Test DNS resolution for MongoDB Atlas."""
import socket

def test_dns():
    hosts = [
        "ac-8whsb01-shard-00-00.cnxrcjn.mongodb.net",
        "ac-8whsb01-shard-00-01.cnxrcjn.mongodb.net",
        "ac-8whsb01-shard-00-02.cnxrcjn.mongodb.net",
    ]
    
    print("=" * 60)
    print("Testing DNS Resolution")
    print("=" * 60)
    
    for host in hosts:
        try:
            print(f"\n✓ Resolving {host}...")
            ip = socket.gethostbyname(host)
            print(f"  IP: {ip}")
        except socket.gaierror as e:
            print(f"✗ FAILED: {e}")
            return False
    
    print("\n✓ All hosts resolved successfully")
    return True

if __name__ == "__main__":
    test_dns()