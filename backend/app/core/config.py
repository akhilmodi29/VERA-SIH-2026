import os
from pydantic_settings import BaseSettings

# Build absolute path safely derived from this file's location
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, "data")

# Ensure the data directory exists before any database operations occur
os.makedirs(DATA_DIR, exist_ok=True)
DEFAULT_DB_URL = f"sqlite:///{os.path.join(DATA_DIR, 'vera.db').replace(os.sep, '/')}"

class Settings(BaseSettings):
    PROJECT_NAME: str = "VERA Backend"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = DEFAULT_DB_URL

    class Config:
        env_file = ".env"

settings = Settings()
