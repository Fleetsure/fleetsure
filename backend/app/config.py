from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/fleetsure"

    # App
    APP_NAME: str = "FleetSure API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # JWT Auth
    SECRET_KEY: str = "change-me-in-production-use-a-long-random-string"

    # Vahan RC Lookup — one API key from rapidapi.com
    VAHAN_API_KEY: str = ""
    VAHAN_API_HOST: str = "vehicle-rc-api.p.rapidapi.com"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
