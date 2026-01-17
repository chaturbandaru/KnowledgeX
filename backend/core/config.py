"""
Configuration management for the Knowledge Debt Exchange backend.
Loads and validates environment variables using Pydantic Settings.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database Configuration
    MONGO_URL: str
    DATABASE_NAME: str = "knoweldge_debt"
    
    # JWT Configuration
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Application Configuration
    APP_NAME: str = "Knowledge Debt Exchange"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS Configuration
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # Environment
    ENVIRONMENT: str = "development"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )
    
    @field_validator("ALLOWED_ORIGINS")
    @classmethod
    def parse_cors_origins(cls, v: str) -> List[str]:
        """Parse comma-separated CORS origins into a list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT.lower() == "production"
    
    @property
    def access_token_expire_seconds(self) -> int:
        """Get access token expiration in seconds."""
        return self.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    
    @property
    def refresh_token_expire_seconds(self) -> int:
        """Get refresh token expiration in seconds."""
        return self.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60


# Global settings instance
settings = Settings()
