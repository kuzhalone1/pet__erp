"""
run_migration.py - Adds dosage_form and strength columns to medicines table.
Run: python backend/scripts/run_migration.py
"""
import os
from pathlib import Path

# Load .env manually (no extra package needed)
env_path = Path(__file__).resolve().parents[2] / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())

DB_USER     = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = os.getenv("DB_PORT", "5432")
DB_NAME     = os.getenv("DB_NAME", "pet_erp")

try:
    from sqlalchemy import create_engine, text
    db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(db_url)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE medicines ADD COLUMN IF NOT EXISTS dosage_form VARCHAR(50)"))
        conn.execute(text("ALTER TABLE medicines ADD COLUMN IF NOT EXISTS strength VARCHAR(50)"))
    print("Migration applied successfully - dosage_form and strength columns added.")
except Exception as e:
    print(f"Migration failed: {e}")
