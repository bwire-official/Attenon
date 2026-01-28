"""Application configuration."""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""
    
    # Application
    APP_NAME: str = "Attenon API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS - Environment-aware origin settings
    # In production, default to safe origin; in dev, allow all if not explicitly set
    ALLOWED_ORIGINS_STR: str = ""
    
    # Face Recognition
    FACE_MATCH_THRESHOLD: float = 0.6
    MAX_FACE_DISTANCE: float = 0.4
    
    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Get list of allowed CORS origins (environment-aware)."""
        # If explicitly set via env var, use that value
        if self.ALLOWED_ORIGINS_STR.strip():
            if self.ALLOWED_ORIGINS_STR.strip() == "*":
                return ["*"]
            return [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(',')]
        # Default based on environment
        if self.ENVIRONMENT == "production":
            return ["http://localhost:3000"]
        # Non-production: allow all origins for mobile development
        return ["*"]
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


def get_settings() -> Settings:
    """Get settings instance."""
    return Settings()
