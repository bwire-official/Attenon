"""Supabase client configuration."""
from functools import lru_cache

from supabase import create_client, Client

from app.core.config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """Get cached Supabase client instance using anon key."""
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


@lru_cache()
def get_supabase_admin_client() -> Client:
    """Get cached Supabase admin client instance using service role key."""
    settings = get_settings()
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is not configured")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
