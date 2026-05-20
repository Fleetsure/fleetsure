import os
from functools import lru_cache


class Settings:
    APP_NAME: str = os.getenv("APP_NAME", "FleetSure API")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me")
    VAHAN_API_KEY: str = os.getenv("VAHAN_API_KEY", "")
    VAHAN_API_HOST: str = os.getenv("VAHAN_API_HOST", "vehicle-rc-api.p.rapidapi.com")
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "fleetsure-fc010")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
