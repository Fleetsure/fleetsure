import os
from pathlib import Path
from supabase import create_client, Client
from functools import lru_cache

# Auto-load .env from the backend directory
_env_file = Path(__file__).parent.parent / ".env"
if _env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_file)

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://hjtamxpydneuykkcwpfn.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


@lru_cache()
def get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)


# Convenience alias used across routers
supabase: Client = get_supabase()
