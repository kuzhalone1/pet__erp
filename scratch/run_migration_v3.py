"""
scratch/run_migration_v3.py
Run this to apply Stage 1 & 2 DB changes.
Usage: python scratch/run_migration_v3.py
"""
import sys
import os

# Allow running from project root or scratch/
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'backend'))

from database import engine
from sqlalchemy import text

print("=" * 60)
print("Pet ERP — Stage 1 & 2 Database Migration")
print("=" * 60)

# All DDL statements — each one is safe to run multiple times
statements = [
    # 1. Clinic FY start month
    "ALTER TABLE clinic_setup ADD COLUMN IF NOT EXISTS fy_start_month SMALLINT DEFAULT 4",

    # 2. HSN codes table
    """CREATE TABLE IF NOT EXISTS hsn_codes (
        hsn_id          SERIAL PRIMARY KEY,
        hsn_code        VARCHAR(10) UNIQUE NOT NULL,
        description     VARCHAR(300) NOT NULL,
        default_gst_pct NUMERIC(5,2) DEFAULT 12,
        is_active       BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMP DEFAULT now()
    )""",

    # 3. GST rates table
    """CREATE TABLE IF NOT EXISTS gst_rates (
        gst_rate_id SERIAL PRIMARY KEY,
        rate_name   VARCHAR(50) NOT NULL,
        gst_percent NUMERIC(5,2) NOT NULL,
        cgst_pct    NUMERIC(5,2) NOT NULL,
        sgst_pct    NUMERIC(5,2) NOT NULL,
        igst_pct    NUMERIC(5,2) NOT NULL,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT now()
    )""",

    # 4. GST seed
    """INSERT INTO gst_rates (rate_name, gst_percent, cgst_pct, sgst_pct, igst_pct) VALUES
       ('GST Exempt', 0.00, 0.00, 0.00, 0.00),
       ('GST 5%',     5.00, 2.50, 2.50, 5.00),
       ('GST 12%',   12.00, 6.00, 6.00,12.00),
       ('GST 18%',   18.00, 9.00, 9.00,18.00)
       ON CONFLICT DO NOTHING""",

    # 5. HSN seed
    """INSERT INTO hsn_codes (hsn_code, description, default_gst_pct) VALUES
       ('3004', 'Medicaments for veterinary use', 12.00),
       ('3006', 'Pharmaceutical goods (sutures, bandages)', 12.00),
       ('9018', 'Instruments used in veterinary science', 12.00),
       ('0511', 'Animal products (vaccines, biologicals)', 5.00),
       ('3808', 'Insecticides, disinfectants for animals', 18.00),
       ('3307', 'Shampoos and grooming products for pets', 18.00),
       ('2309', 'Pet food preparations', 18.00),
       ('9402', 'Medical/veterinary furniture and fixtures', 18.00)
       ON CONFLICT DO NOTHING""",

    # 6. Agents table
    """CREATE TABLE IF NOT EXISTS agents (
        agent_id        SERIAL PRIMARY KEY,
        agent_code      VARCHAR(30) UNIQUE NOT NULL,
        name            VARCHAR(200) NOT NULL,
        clinic_name     VARCHAR(200),
        phone           VARCHAR(20),
        alt_phone       VARCHAR(20),
        email           VARCHAR(100),
        address         TEXT,
        city_id         INT REFERENCES cities(city_id) ON DELETE SET NULL,
        commission_type VARCHAR(30) NOT NULL DEFAULT 'Flat',
        commission_rate NUMERIC(10,2) DEFAULT 0,
        opening_balance NUMERIC(12,2) DEFAULT 0,
        balance_type    VARCHAR(2) DEFAULT 'CR',
        notes           TEXT,
        is_active       BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMP DEFAULT now(),
        updated_at      TIMESTAMP DEFAULT now()
    )""",

    # 7. Role permissions table
    """CREATE TABLE IF NOT EXISTS role_permissions (
        perm_id  SERIAL PRIMARY KEY,
        role     VARCHAR(30) NOT NULL,
        module   VARCHAR(50) NOT NULL,
        can_view BOOLEAN DEFAULT TRUE,
        can_add  BOOLEAN DEFAULT FALSE,
        can_edit BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        UNIQUE(role, module)
    )""",

    # 8. Users: add linked_staff_id
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_staff_id INT REFERENCES staff(staff_id) ON DELETE SET NULL",

    # 9. Suppliers: add missing columns
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS alt_phone       VARCHAR(20)",
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pan             VARCHAR(20)",
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS drug_license_no VARCHAR(100)",
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms   INTEGER",
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(12,2) DEFAULT 0",
    "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance_type    VARCHAR(2) DEFAULT 'CR'",

    # 10. Agent FK on appointments and consultations
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS agent_id INT REFERENCES agents(agent_id) ON DELETE SET NULL",
    "ALTER TABLE consultations ADD COLUMN IF NOT EXISTS agent_id INT REFERENCES agents(agent_id) ON DELETE SET NULL",

    # 11. Agent FK on pet_owners (which agent referred this client)
    "ALTER TABLE pet_owners ADD COLUMN IF NOT EXISTS agent_id INT REFERENCES agents(agent_id) ON DELETE SET NULL",

    # 12. GL Master seed
    """INSERT INTO gl_master (gl_code, gl_name, group_name, sub_group, is_system, balance_type) VALUES
       ('CASH',       'Cash Account',             'Assets',      'Current Assets',      TRUE, 'DR'),
       ('BANK',       'Bank Account',             'Assets',      'Current Assets',      TRUE, 'DR'),
       ('DEBTOR',     'Sundry Debtors',           'Assets',      'Current Assets',      TRUE, 'DR'),
       ('CREDITOR',   'Sundry Creditors',         'Liabilities', 'Current Liabilities', TRUE, 'CR'),
       ('CONSULT',    'Consultation Income',      'Income',      'Service Income',      TRUE, 'CR'),
       ('PHARMA',     'Pharmacy Sales',           'Income',      'Sales Income',        TRUE, 'CR'),
       ('PROC',       'Procedure Income',         'Income',      'Service Income',      TRUE, 'CR'),
       ('PURCHASE',   'Medicine Purchase',        'Expense',     'Direct Expense',      TRUE, 'DR'),
       ('SALARY',     'Salary & Wages',           'Expense',     'Indirect Expense',    TRUE, 'DR'),
       ('GSTPAY',     'GST Payable',              'Liabilities', 'Tax Liabilities',     TRUE, 'CR'),
       ('DISC',       'Discount Allowed',         'Expense',     'Indirect Expense',    TRUE, 'DR'),
       ('COMMISSION', 'Agent Commission Payable', 'Expense',     'Indirect Expense',    TRUE, 'DR')
       ON CONFLICT (gl_code) DO NOTHING""",
]

success = 0
warnings = 0

with engine.connect() as conn:
    for stmt in statements:
        stmt = stmt.strip()
        if not stmt:
            continue
        try:
            conn.execute(text(stmt))
            conn.commit()
            # Show first 70 chars of statement
            preview = stmt.replace('\n', ' ')[:70]
            print(f"  ✅ {preview}...")
            success += 1
        except Exception as e:
            conn.rollback()
            print(f"  ⚠️  WARN: {e}")
            warnings += 1

print()
print(f"Done! {success} statements OK, {warnings} warnings.")
print()

# Verification
print("Table verification:")
checks = {
    'clinic_setup': 'SELECT fy_start_month FROM clinic_setup LIMIT 1',
    'hsn_codes':    'SELECT count(*) FROM hsn_codes',
    'gst_rates':    'SELECT count(*) FROM gst_rates',
    'agents':       'SELECT count(*) FROM agents',
    'gl_master':    'SELECT count(*) FROM gl_master',
    'users.linked_staff_id': 'SELECT linked_staff_id FROM users LIMIT 1',
    'suppliers.pan': 'SELECT pan FROM suppliers LIMIT 1',
    'pet_owners.agent_id': 'SELECT agent_id FROM pet_owners LIMIT 1',
}

with engine.connect() as conn:
    for label, sql in checks.items():
        try:
            r = conn.execute(text(sql)).fetchone()
            val = r[0] if r else 'table empty / column ok'
            print(f"  ✅ {label}: {val}")
        except Exception as e:
            print(f"  ❌ {label}: {e}")
