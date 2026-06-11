"""
config.py — App-level configuration loaded from .env
"""
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "change_this_in_production")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))
DB_CLEAN_PASSWORD = os.getenv("DB_CLEAN_PASSWORD", "delete_true_2026")

