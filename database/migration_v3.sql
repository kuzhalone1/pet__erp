-- database/migration_v3.sql
-- Run ONCE before any backend changes.

-- 1. Clinic: add financial year start month
ALTER TABLE clinic_setup ADD COLUMN IF NOT EXISTS fy_start_month SMALLINT DEFAULT 4;

-- 2. HSN Code Master (new table)
CREATE TABLE IF NOT EXISTS hsn_codes (
    hsn_id          SERIAL PRIMARY KEY,
    hsn_code        VARCHAR(10) UNIQUE NOT NULL,
    description     VARCHAR(300) NOT NULL,
    default_gst_pct NUMERIC(5,2) DEFAULT 12,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT now()
);

-- 3. GST Rate Master (new table)
CREATE TABLE IF NOT EXISTS gst_rates (
    gst_rate_id SERIAL PRIMARY KEY,
    rate_name   VARCHAR(50) NOT NULL,
    gst_percent NUMERIC(5,2) NOT NULL,
    cgst_pct    NUMERIC(5,2) NOT NULL,
    sgst_pct    NUMERIC(5,2) NOT NULL,
    igst_pct    NUMERIC(5,2) NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT now()
);

-- 4. GST Rate seed data
INSERT INTO gst_rates (rate_name, gst_percent, cgst_pct, sgst_pct, igst_pct) VALUES
('GST Exempt',  0.00,  0.00,  0.00,  0.00),
('GST 5%',      5.00,  2.50,  2.50,  5.00),
('GST 12%',    12.00,  6.00,  6.00, 12.00),
('GST 18%',    18.00,  9.00,  9.00, 18.00)
ON CONFLICT DO NOTHING;

-- 5. HSN seed data (common veterinary codes)
INSERT INTO hsn_codes (hsn_code, description, default_gst_pct) VALUES
('3004', 'Medicaments for veterinary use', 12.00),
('3006', 'Pharmaceutical goods (sutures, bandages)', 12.00),
('9018', 'Instruments used in veterinary science', 12.00),
('0511', 'Animal products (vaccines, biologicals)', 5.00),
('3808', 'Insecticides, disinfectants for animals', 18.00),
('3307', 'Shampoos and grooming products for pets', 18.00),
('2309', 'Pet food preparations', 18.00),
('9402', 'Medical/veterinary furniture and fixtures', 18.00)
ON CONFLICT DO NOTHING;

-- 6. Agent / Referral Master (new table)
CREATE TABLE IF NOT EXISTS agents (
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
);

-- 7. Role Permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    perm_id     SERIAL PRIMARY KEY,
    role        VARCHAR(30) NOT NULL,
    module      VARCHAR(50) NOT NULL,
    can_view    BOOLEAN DEFAULT TRUE,
    can_add     BOOLEAN DEFAULT FALSE,
    can_edit    BOOLEAN DEFAULT FALSE,
    can_delete  BOOLEAN DEFAULT FALSE,
    UNIQUE(role, module)
);

-- 8. Users: add linked_staff_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_staff_id INT REFERENCES staff(staff_id) ON DELETE SET NULL;

-- 9. Agent FK on appointments and consultations
ALTER TABLE appointments  ADD COLUMN IF NOT EXISTS agent_id INT REFERENCES agents(agent_id) ON DELETE SET NULL;
ALTER TABLE consultations  ADD COLUMN IF NOT EXISTS agent_id INT REFERENCES agents(agent_id) ON DELETE SET NULL;

-- 10. GL Master seed data (for existing gl_master table from phase4.py)
INSERT INTO gl_master (gl_code, gl_name, group_name, sub_group, is_system, balance_type) VALUES
('CASH',       'Cash Account',             'Assets',      'Current Assets',      TRUE, 'DR'),
('BANK',       'Bank Account',             'Assets',      'Current Assets',      TRUE, 'DR'),
('DEBTOR',     'Sundry Debtors',           'Assets',      'Current Assets',      TRUE, 'DR'),
('CREDITOR',   'Sundry Creditors',         'Liabilities', 'Current Liabilities', TRUE, 'CR'),
('CONSULT',    'Consultation Income',      'Income',      'Service Income',      TRUE, 'CR'),
('PHARMA',     'Pharmacy Sales',           'Income',      'Sales Income',        TRUE, 'CR'),
('PROC',       'Procedure Income',         'Income',      'Service Income',      TRUE, 'CR'),
('PURCHASE',   'Medicine Purchase',        'Expense',     'Direct Expense',      TRUE, 'DR'),
('SALARY',     'Salary & Wages',           'Expense',     'Indirect Expense',    TRUE, 'DR'),
('GSTPAY',     'GST Payable',             'Liabilities', 'Tax Liabilities',     TRUE, 'CR'),
('DISC',       'Discount Allowed',         'Expense',     'Indirect Expense',    TRUE, 'DR'),
('COMMISSION', 'Agent Commission Payable', 'Expense',     'Indirect Expense',    TRUE, 'DR')
ON CONFLICT (gl_code) DO NOTHING;

-- VERIFY after running:
-- \d clinic_setup   -> should show fy_start_month
-- \d hsn_codes      -> should exist with 8 rows
-- \d gst_rates      -> should exist with 4 rows
-- \d agents         -> should exist
-- \d users          -> should show linked_staff_id
-- SELECT count(*) FROM gl_master; -> should be >= 12
