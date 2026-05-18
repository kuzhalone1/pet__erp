import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add current directory to path so we can import database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
MASTER_DB_NAME = os.getenv("MASTER_DB_NAME", "pet_erp_master")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

MASTER_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{MASTER_DB_NAME}"
ROOT_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/postgres"

print(f"--- Database Connection Test (Master DB: {MASTER_DB_NAME}) ---")
print(f"Target: {DB_HOST}:{DB_PORT} (User: {DB_USER})")

try:
    # First check if master database exists by connecting to postgres root
    root_engine = create_engine(ROOT_DATABASE_URL, isolation_level="AUTOCOMMIT")
    with root_engine.connect() as conn:
        res = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{MASTER_DB_NAME}'"))
        if not res.fetchone():
            print(f"⚠️ Master database '{MASTER_DB_NAME}' does not exist. Creating it now...")
            conn.execute(text(f"CREATE DATABASE {MASTER_DB_NAME}"))
            print(f"✅ Created database '{MASTER_DB_NAME}' successfully.")
        else:
            print(f"✅ Master database '{MASTER_DB_NAME}' already exists.")

    engine = create_engine(MASTER_DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version();"))
        version = result.fetchone()
        print(f"✅ SUCCESS: Connected to Master PostgreSQL Database!")
        print(f"Version: {version[0]}")
        
        # Check tables
        result = connection.execute(text("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"))
        count = result.fetchone()[0]
        print(f"Tables found in Master DB: {count}")
            
except Exception as e:
    print(f"❌ FAILED: Could not connect to database.")
    print(f"\nError Details: {str(e)}")
    print("\nPossible solutions:")
    print(f"1. Is PostgreSQL installed and running on {DB_HOST}?")
    print(f"2. Is the password in .env correct?")
    print(f"3. Is the port {DB_PORT} open?")
