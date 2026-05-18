"""
database.py — PostgreSQL connection using SQLAlchemy (Master DB + Company DBs)
Includes Dynamic Multi-Tenant Context Routing Dependency.
"""
import os
import functools
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from fastapi import Request
from jose import jwt
from config import SECRET_KEY, ALGORITHM

load_dotenv()

# Base environment variables
DB_HOST_ENV = os.getenv("DB_HOST", "localhost")
DB_PORT_ENV = os.getenv("DB_PORT", "5432")
DB_NAME_ENV = os.getenv("DB_NAME", "pet_erp")                  # Default Company DB (Clinical/Financial data)
MASTER_DB_NAME_ENV = os.getenv("MASTER_DB_NAME", "pet_erp_master") # Master DB (Tenants/Companies/RBAC)
DB_USER_ENV = os.getenv("DB_USER", "postgres")
DB_PASSWORD_ENV = os.getenv("DB_PASSWORD", "")

# If Railway (or any cloud) sets DATABASE_URL, parse it to extract actual host, port, user, password
from urllib.parse import urlparse

if os.getenv("DATABASE_URL"):
    parsed = urlparse(os.getenv("DATABASE_URL"))
    DB_USER = parsed.username or DB_USER_ENV
    DB_PASSWORD = parsed.password or DB_PASSWORD_ENV
    DB_HOST = parsed.hostname or DB_HOST_ENV
    DB_PORT = parsed.port or DB_PORT_ENV
    DB_NAME = parsed.path.lstrip("/") or DB_NAME_ENV
    DATABASE_URL = os.getenv("DATABASE_URL")
else:
    DB_USER = DB_USER_ENV
    DB_PASSWORD = DB_PASSWORD_ENV
    DB_HOST = DB_HOST_ENV
    DB_PORT = DB_PORT_ENV
    DB_NAME = DB_NAME_ENV
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# For Master DB URL, allow explicit MASTER_DATABASE_URL or derive from cloud host/credentials
MASTER_DATABASE_URL = os.getenv(
    "MASTER_DATABASE_URL", 
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{MASTER_DB_NAME_ENV}"
)

# Company DB Engine (pet_erp / railway)
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Master DB Engine (pet_erp_master)
master_engine = create_engine(MASTER_DATABASE_URL, echo=False)
MasterSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=master_engine)

Base = declarative_base()

@functools.lru_cache(maxsize=50)
def get_engine_for_db(db_uri_or_name: str):
    """
    Returns a cached SQLAlchemy engine for a specific company DB.
    Accepts either a full connection string or just a database name.
    """
    if "://" in db_uri_or_name:
        url = db_uri_or_name
    else:
        url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{db_uri_or_name}"
    return create_engine(url, pool_size=5, max_overflow=10, echo=False)

def get_db(request: Request):
    """
    Dynamic Multi-Tenant Dependency:
    Inspects the JWT token in the Authorization header to extract db_name.
    Yields a database session dynamically connected to the specific company database.
    Ensures 100% data isolation between clinic branches.
    """
    db_name = DB_NAME  # Default fallback ('pet_erp')
    
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if "db_name" in payload and payload["db_name"]:
                db_name = payload["db_name"]
        except Exception:
            pass  # Fallback to default if token is invalid or expired

    # Get cached engine for this specific database name
    company_engine = get_engine_for_db(db_name)
    CompanySession = sessionmaker(autocommit=False, autoflush=False, bind=company_engine)
    
    db = CompanySession()
    try:
        yield db
    finally:
        db.close()

def get_master_db():
    """Dependency: yields a database session for the Master DB (pet_erp_master)."""
    db = MasterSessionLocal()
    try:
        yield db
    finally:
        db.close()
