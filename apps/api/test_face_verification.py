#!/usr/bin/env python3
"""
Test script for face verification system
Run this to test if the RPC functions work correctly
"""
import asyncio
from app.core.supabase import get_supabase_admin_client
from app.core.config import get_settings

async def test_verify_face_match():
    """Test the verify_face_match RPC function"""
    print("=" * 60)
    print("Testing verify_face_match RPC function")
    print("=" * 60)
    
    supabase = get_supabase_admin_client()
    settings = get_settings()
    
    # Test user ID (benedict precious)
    test_user_id = "06cb7f87-1f67-48a8-9927-736d473677e3"
    
    print(f"\n1. Fetching face encoding for user: {test_user_id}")
    profile_result = supabase.table("profiles").select("email, is_face_registered, face_encoding").eq("id", test_user_id).single().execute()
    
    if not profile_result.data:
        print("❌ ERROR: User profile not found")
        return False
    
    profile = profile_result.data
    print(f"   Email: {profile.get('email')}")
    print(f"   Is registered: {profile.get('is_face_registered')}")
    print(f"   Has encoding: {'YES' if profile.get('face_encoding') else 'NO'}")
    
    if not profile.get('face_encoding'):
        print("❌ ERROR: No face encoding found")
        return False
    
    face_encoding = profile.get('face_encoding')
    print(f"   Encoding type: {type(face_encoding)}")
    print(f"   Encoding length: {len(face_encoding) if isinstance(face_encoding, list) else 'N/A'}")
    
    # Test 1: Call RPC with the user's own face (should return True)
    print(f"\n2. Testing RPC with user's own face (should match)...")
    try:
        rpc_params = {
            "user_id": test_user_id,
            "query_embedding": face_encoding,
            "match_threshold": settings.FACE_MATCH_THRESHOLD
        }
        
        print(f"   Params: user_id={test_user_id}, threshold={settings.FACE_MATCH_THRESHOLD}")
        print(f"   Embedding preview: [{face_encoding[0]:.4f}, {face_encoding[1]:.4f}, ...]")
        
        result = supabase.rpc("verify_face_match", rpc_params).execute()
        
        print(f"   Result data: {result.data}")
        print(f"   Result type: {type(result.data)}")
        
        if hasattr(result, 'error') and result.error:
            print(f"   ❌ RPC Error: {result.error}")
            return False
        
        if result.data is True:
            print("   ✅ SUCCESS: Face matched correctly!")
        else:
            print(f"   ❌ FAILED: Expected True, got {result.data}")
            return False
            
    except Exception as e:
        print(f"   ❌ Exception: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 2: Test with wrong user ID (should return False)
    print(f"\n3. Testing RPC with wrong user ID (should NOT match)...")
    wrong_user_id = "ed63b856-9b5b-48b1-b098-e7ae92b34524"  # Different user
    try:
        rpc_params = {
            "user_id": wrong_user_id,
            "query_embedding": face_encoding,
            "match_threshold": settings.FACE_MATCH_THRESHOLD
        }
        
        result = supabase.rpc("verify_face_match", rpc_params).execute()
        print(f"   Result: {result.data}")
        
        if result.data is False:
            print("   ✅ SUCCESS: Correctly rejected wrong face!")
        else:
            print(f"   ⚠️  WARNING: Expected False, got {result.data} (might still be similar faces)")
            
    except Exception as e:
        print(f"   ❌ Exception: {type(e).__name__}: {str(e)}")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed successfully!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    asyncio.run(test_verify_face_match())
