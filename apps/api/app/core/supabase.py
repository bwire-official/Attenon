"""Supabase client configuration."""
from supabase import create_client, Client

from app.core.config import get_settings


def get_supabase_client() -> Client:
    """Get Supabase client instance using anon key."""
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def get_supabase_admin_client() -> Client:
    """Get Supabase admin client instance using service role key."""
    settings = get_settings()
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is not configured")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
