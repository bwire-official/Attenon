#!/usr/bin/env python3
"""Simple test for verify_face_match RPC"""
import sys
print("Starting test...")
sys.stdout.flush()

try:
    print("1. Importing modules...")
    from app.core.supabase import get_supabase_admin_client
    from app.core.config import get_settings
    print("   ✅ Imports successful")
    
    print("\n2. Getting Supabase client...")
    supabase = get_supabase_admin_client()
    settings = get_settings()
    print(f"   ✅ Client initialized")
    print(f"   Threshold: {settings.FACE_MATCH_THRESHOLD}")
    
    test_user_id = "06cb7f87-1f67-48a8-9927-736d473677e3"
    
    print(f"\n3. Fetching profile for {test_user_id}...")
    profile = supabase.table("profiles").select("email, face_encoding").eq("id", test_user_id).single().execute()
    print(f"   ✅ Profile fetched: {profile.data.get('email')}")
    
    face_encoding = profile.data.get('face_encoding')
    if not face_encoding:
        print("   ❌ No face encoding found!")
        sys.exit(1)
    
    print(f"   Face encoding type: {type(face_encoding)}")
    print(f"   Face encoding length: {len(face_encoding) if isinstance(face_encoding, list) else 'N/A'}")
    
    print(f"\n4. Testing RPC call...")
    rpc_params = {
        "user_id": test_user_id,
        "query_embedding": face_encoding,
        "match_threshold": 0.6
    }
    print(f"   Params: {list(rpc_params.keys())}")
    
    result = supabase.rpc("verify_face_match", rpc_params).execute()
    print(f"   ✅ RPC call completed")
    print(f"   Result data: {result.data}")
    print(f"   Result type: {type(result.data)}")
    
    if result.data is True:
        print("\n✅ SUCCESS: Face verification working correctly!")
    else:
        print(f"\n❌ FAILED: Expected True, got {result.data}")
        
except Exception as e:
    print(f"\n❌ ERROR: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
