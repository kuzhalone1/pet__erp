"""
scratch/apply_migration_v15.py
─────────────────────────────────────────────
Stage 4 Repair & Vaccine Schema Upgrade
"""
import os
import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# ── Load Credentials ─────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    for path in [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', '.env'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'),
    ]:
        if os.path.exists(path):
            load_dotenv(path)
            break
except ImportError:
    pass

DB_HOST     = os.getenv("DB_HOST",     "localhost")
DB_PORT     = os.getenv("DB_PORT",     "5432")
DB_NAME     = os.getenv("DB_NAME",     "pet_erp")
DB_USER     = os.getenv("DB_USER",     "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

try:
    conn = psycopg2.connect(host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    print(f"✅ Connected to {DB_NAME}!\n")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    sys.exit(1)

# ── 1. Upgrade Vaccine Schema ────────────────────────────────────
print("Repairing Vaccines table...")
cur.execute("ALTER TABLE vaccines ADD COLUMN IF NOT EXISTS company VARCHAR(100)")
cur.execute("ALTER TABLE vaccines ADD COLUMN IF NOT EXISTS disease VARCHAR(200)")
cur.execute("ALTER TABLE vaccines ADD COLUMN IF NOT EXISTS dosage VARCHAR(100)")
cur.execute("ALTER TABLE vaccines ADD COLUMN IF NOT EXISTS route VARCHAR(50)")
print("  + Vaccine columns updated.")

# ── 2. Ensure Sequences exist for Purchases & Sales ──────────────
print("Checking Document Sequences...")
cur.execute("""
INSERT INTO doc_sequences (doc_type, prefix, last_no, current_year)
VALUES 
('PUR', 'PUR', 0, EXTRACT(YEAR FROM CURRENT_DATE)),
('SAL', 'SAL', 0, EXTRACT(YEAR FROM CURRENT_DATE))
ON CONFLICT (doc_type) DO NOTHING;
""")
print("  + PUR and SAL sequences initialized.")

# ── 3. Repair Appointment States ────────────────────────────────
# (No SQL change needed, logic is in Python, but we ensure status column can handle it)
print("Repairing Appointments meta...")
# Ensuring we have a clear audit trail if statuses change
cur.execute("ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status_notes TEXT")

cur.close()
conn.close()
print("\n🔥 V15 REPAIR COMPLETE.")
