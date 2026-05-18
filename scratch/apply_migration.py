"""
scratch/apply_migration.py
─────────────────────────────────────────────
Stage 3 Table Repair & Column Sync (v14)
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

def run_alter(table, columns):
    print(f"Checking {table}...")
    for col in columns:
        try:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col}")
            print(f"  + Column checked: {col.split()[0]}")
        except Exception as e:
            print(f"  ! Error on {col}: {e}")

# ── 1. Stock Ledger Repair ──────────────────────────────────────
run_alter("stock_ledger", [
    "qty_in      NUMERIC(10,2) DEFAULT 0",
    "qty_out     NUMERIC(10,2) DEFAULT 0",
    "ref_number  VARCHAR(50)",
    "created_by  INT REFERENCES users(user_id)"
])

# ── 2. Vaccines Repair ──────────────────────────────────────────
run_alter("vaccines", [
    "dose_number   SMALLINT DEFAULT 1",
    "medicine_id   INT REFERENCES medicines(medicine_id)",
    "interval_days  INT DEFAULT 0"
])

# ── 3. Medicines Repair (Ensuring structured HSN/GST) ─────────────
run_alter("medicines", [
    "medicine_name2 VARCHAR(200)",
    "hsn_id         INT REFERENCES hsn_codes(hsn_id)",
    "gst_rate_id    INT REFERENCES gst_rates(gst_rate_id)",
    "unit_id        INT", # Handled below
    "reorder_level  NUMERIC(10,2) DEFAULT 0",
    "current_stock  NUMERIC(10,2) DEFAULT 0"
])

# ── 4. Medicine Batches Repair ──────────────────────────────────
run_alter("medicine_batches", [
    "mrp             NUMERIC(10,2) DEFAULT 0",
    "source          VARCHAR(20) DEFAULT 'Purchase'"
])

# ── 5. Unit Table (Ensure it exists) ─────────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS units (
    unit_id     SERIAL PRIMARY KEY,
    unit_name   VARCHAR(50) UNIQUE NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT now()
);
""")
# Link medicines to units if not already linked
try:
    cur.execute("ALTER TABLE medicines ADD COLUMN IF NOT EXISTS unit_id INT REFERENCES units(unit_id)")
except:
    pass

# Seed units
cur.execute("""
INSERT INTO units (unit_name) VALUES
('Tablet'), ('Vial'), ('Strip'), ('Bottle'), ('ml'), ('Unit')
ON CONFLICT (unit_name) DO NOTHING;
""")

# ── 6. Sales Bills (Ensure it exists) ───────────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS sales_bills (
    bill_id         SERIAL PRIMARY KEY,
    bill_number     VARCHAR(30) UNIQUE NOT NULL,
    bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    owner_id        INT REFERENCES pet_owners(owner_id),
    subtotal        NUMERIC(12,2) DEFAULT 0,
    taxable_amt     NUMERIC(12,2) DEFAULT 0,
    total_tax       NUMERIC(12,2) DEFAULT 0,
    grand_total     NUMERIC(12,2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'Draft',
    created_at      TIMESTAMP DEFAULT now()
);
""")
# Ensure all sales_bills columns exist
run_alter("sales_bills", [
    "bill_type        VARCHAR(20) DEFAULT 'Retail'",
    "pet_id           INT REFERENCES pets(pet_id)",
    "doctor_id        INT REFERENCES doctors(doctor_id)",
    "agent_id         INT REFERENCES agents(agent_id)",
    "party_gstin      VARCHAR(20)",
    "party_state_code VARCHAR(5)",
    "is_interstate    BOOLEAN DEFAULT FALSE",
    "discount_amt     NUMERIC(12,2) DEFAULT 0",
    "cgst_amt         NUMERIC(12,2) DEFAULT 0",
    "sgst_amt         NUMERIC(12,2) DEFAULT 0",
    "igst_amt         NUMERIC(12,2) DEFAULT 0",
    "round_off       NUMERIC(5,2) DEFAULT 0",
    "net_payable     NUMERIC(12,2) DEFAULT 0",
    "payment_mode    VARCHAR(20) DEFAULT 'Cash'",
    "amount_paid     NUMERIC(12,2) DEFAULT 0",
    "amount_due      NUMERIC(12,2) DEFAULT 0",
    "notes           TEXT",
    "created_by      INT REFERENCES users(user_id)",
    "updated_at      TIMESTAMP DEFAULT now()"
])

# ── 7. Sales Bill Items (Ensure it exists) ──────────────────────
cur.execute("""
CREATE TABLE IF NOT EXISTS sales_bill_items (
    item_id         SERIAL PRIMARY KEY,
    bill_id         INT NOT NULL REFERENCES sales_bills(bill_id) ON DELETE CASCADE,
    line_no         SMALLINT NOT NULL,
    line_type       VARCHAR(20) NOT NULL,
    description     VARCHAR(300) NOT NULL,
    qty             NUMERIC(10,2) DEFAULT 1,
    rate            NUMERIC(10,2) NOT NULL,
    line_total      NUMERIC(10,2) DEFAULT 0
);
""")
run_alter("sales_bill_items", [
    "medicine_id     INT REFERENCES medicines(medicine_id)",
    "batch_id        INT REFERENCES medicine_batches(batch_id)",
    "procedure_id    INT REFERENCES procedures(procedure_id)",
    "hsn_code        VARCHAR(10)",
    "unit            VARCHAR(30)",
    "discount_pct    NUMERIC(5,2) DEFAULT 0",
    "discount_amt    NUMERIC(10,2) DEFAULT 0",
    "taxable_amt     NUMERIC(10,2) DEFAULT 0",
    "gst_rate_id     INT REFERENCES gst_rates(gst_rate_id)",
    "gst_pct         NUMERIC(5,2) DEFAULT 0",
    "cgst_pct        NUMERIC(5,2) DEFAULT 0",
    "sgst_pct        NUMERIC(5,2) DEFAULT 0",
    "igst_pct        NUMERIC(5,2) DEFAULT 0",
    "cgst_amt        NUMERIC(10,2) DEFAULT 0",
    "sgst_amt        NUMERIC(10,2) DEFAULT 0",
    "igst_amt        NUMERIC(10,2) DEFAULT 0",
    "total_tax       NUMERIC(10,2) DEFAULT 0"
])

cur.close()
conn.close()
print("\n🔥 DATABASE REPAIR COMPLETE. Reloading backend...")
