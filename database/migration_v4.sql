-- database/migration_v4.sql
-- GST and Addresses upgrade

-- 1. CLINIC SETUP
ALTER TABLE clinic_setup
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS drug_license_no VARCHAR(50);

-- 2. GL MASTER
ALTER TABLE gl_master
    ADD COLUMN IF NOT EXISTS phone           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS alt_phone       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gstin           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS discount_pct    NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS agent_id        INT REFERENCES agents(agent_id) ON DELETE SET NULL;

-- 3. PET OWNERS
ALTER TABLE pet_owners
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS gstin           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS discount_pct    NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;

-- 4. SUPPLIERS
ALTER TABLE suppliers
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;

-- 5. DOCTORS
ALTER TABLE doctors
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;

-- 6. STAFF
ALTER TABLE staff
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;

-- 7. AGENTS
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gstin           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;

-- 8. SYSTEM GL ACCOUNTS SEED (Full List)
INSERT INTO gl_master (gl_code, gl_name, group_name, sub_group, is_system, balance_type) VALUES
('CASH',       'Cash in Hand',              'Cash',             'Cash',                TRUE, 'DR'),
('BANK',       'Bank Account',              'Bank',             'Bank',                TRUE, 'DR'),
('DEBTOR',     'Sundry Debtors',            'Debtors',          'Current Assets',      TRUE, 'DR'),
('CREDITOR',   'Sundry Creditors',          'Creditors',        'Current Liabilities', TRUE, 'CR'),
('CONSULT_INC','Consultation Income',       'Income',           'Service Income',      TRUE, 'CR'),
('PHARMA_SALE','Pharmacy Sales',            'Income',           'Sales Income',        TRUE, 'CR'),
('PROC_INC',   'Procedure Income',          'Income',           'Service Income',      TRUE, 'CR'),
('MED_PURCH',  'Medicine Purchase',         'Expense',          'Direct Expense',      TRUE, 'DR'),
('SALARY_EXP', 'Salary & Wages',            'Expense',          'Indirect Expense',    TRUE, 'DR'),
('CGST_PAY',   'CGST Payable',              'Duties & Taxes',   'Tax Liabilities',     TRUE, 'CR'),
('SGST_PAY',   'SGST Payable',              'Duties & Taxes',   'Tax Liabilities',     TRUE, 'CR'),
('IGST_PAY',   'IGST Payable',              'Duties & Taxes',   'Tax Liabilities',     TRUE, 'CR'),
('CGST_INPUT', 'CGST Input Credit',         'Duties & Taxes',   'Current Assets',      TRUE, 'DR'),
('SGST_INPUT', 'SGST Input Credit',         'Duties & Taxes',   'Current Assets',      TRUE, 'DR'),
('IGST_INPUT', 'IGST Input Credit',         'Duties & Taxes',   'Current Assets',      TRUE, 'DR'),
('DISC_ALLOW', 'Discount Allowed',          'Expense',          'Indirect Expense',    TRUE, 'DR'),
('COMM_EXP',   'Agent Commission',          'Expense',          'Indirect Expense',    TRUE, 'DR'),
('CAPITAL',    'Owner Capital',             'Capital',          'Capital Account',     TRUE, 'CR'),
('RETAIN',     'Retained Earnings',         'Capital',          'Capital Account',     TRUE, 'CR')
ON CONFLICT (gl_code) DO NOTHING;
