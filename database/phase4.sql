-- ============================================================
-- Pet Clinic ERP — Phase 4: Billing & Accounts Tables
-- Run AFTER phase3.sql
-- ============================================================

-- ── 1. GL Master (Chart of Accounts) ────────────────────────
CREATE TABLE IF NOT EXISTS gl_master (
    gl_id           SERIAL PRIMARY KEY,
    gl_code         TEXT UNIQUE NOT NULL,
    gl_name         TEXT NOT NULL,
    group_name      TEXT NOT NULL,      -- Assets | Liabilities | Income | Expense
    sub_group       TEXT,
    opening_balance NUMERIC(14,2) DEFAULT 0,
    balance_type    TEXT NOT NULL DEFAULT 'DR' CHECK (balance_type IN ('DR','CR')),
    is_system       BOOLEAN DEFAULT false,  -- system accounts cannot be deleted
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Seed: Essential GL Accounts
INSERT INTO gl_master (gl_code, gl_name, group_name, sub_group, balance_type, is_system) VALUES
    ('CASH',     'Cash In Hand',             'Assets',      'Current Assets',  'DR', true),
    ('BANK',     'Bank Account',             'Assets',      'Current Assets',  'DR', true),
    ('SUNDRY_DR','Sundry Debtors',           'Assets',      'Current Assets',  'DR', true),
    ('STOCK_MED','Medicine Stock',           'Assets',      'Current Assets',  'DR', true),
    ('SUNDRY_CR','Sundry Creditors',         'Liabilities', 'Current Liab.',   'CR', true),
    ('GST_PAY',  'GST Payable',             'Liabilities', 'Current Liab.',   'CR', true),
    ('CON_INC',  'Consultation Income',      'Income',      'Direct Income',   'CR', true),
    ('PROC_INC', 'Procedure Income',         'Income',      'Direct Income',   'CR', true),
    ('PHARMA_INC','Pharmacy Sales',          'Income',      'Direct Income',   'CR', true),
    ('PURCH_ACC','Medicine Purchases',       'Expense',     'Direct Expense',  'DR', true),
    ('DISC_ALWD','Discount Allowed',         'Expense',     'Indirect Expense','DR', true),
    ('VACC_INC', 'Vaccination Income',       'Income',      'Direct Income',   'CR', true)
ON CONFLICT (gl_code) DO NOTHING;

-- ── 2. Billing Master ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_master (
    billing_id      SERIAL PRIMARY KEY,
    bill_no         TEXT UNIQUE NOT NULL,
    bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    consult_id      INTEGER REFERENCES consultations(consult_id),
    pharmacy_bill_id INTEGER REFERENCES pharmacy_bills(pharmacy_bill_id),
    consult_fee     NUMERIC(10,2) DEFAULT 0,
    procedure_total NUMERIC(10,2) DEFAULT 0,
    pharmacy_total  NUMERIC(10,2) DEFAULT 0,
    subtotal        NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    gst_amount      NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(12,2) DEFAULT 0,
    payment_status  TEXT NOT NULL DEFAULT 'Unpaid'
                    CHECK (payment_status IN ('Unpaid','Partial','Paid')),
    payment_mode    TEXT,               -- Cash | Card | UPI | Mixed
    notes           TEXT,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bill_date ON billing_master(bill_date);
CREATE INDEX IF NOT EXISTS idx_bill_owner ON billing_master(owner_id);
CREATE INDEX IF NOT EXISTS idx_bill_status ON billing_master(payment_status);

-- Back-fill: consultations.billing_stub_id → billing_master
ALTER TABLE consultations
    ADD CONSTRAINT IF NOT EXISTS con_billing_fk
    FOREIGN KEY (billing_stub_id) REFERENCES billing_master(billing_id);

-- Back-fill: pharmacy_bills.billing_id → billing_master
ALTER TABLE pharmacy_bills
    ADD CONSTRAINT IF NOT EXISTS pharma_billing_fk
    FOREIGN KEY (billing_id) REFERENCES billing_master(billing_id);

-- ── 3. Billing Items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_items (
    item_id         SERIAL PRIMARY KEY,
    billing_id      INTEGER NOT NULL REFERENCES billing_master(billing_id) ON DELETE CASCADE,
    item_type       TEXT NOT NULL
                    CHECK (item_type IN ('Consultation','Procedure','Medicine','Vaccination','Other')),
    description     TEXT NOT NULL,
    hsn_code        TEXT,
    quantity        NUMERIC(8,2) DEFAULT 1,
    unit_price      NUMERIC(10,2),
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    taxable_amount  NUMERIC(10,2) DEFAULT 0,
    gst_pct         NUMERIC(5,2) DEFAULT 0,
    cgst_amount     NUMERIC(10,2) DEFAULT 0,
    sgst_amount     NUMERIC(10,2) DEFAULT 0,
    igst_amount     NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(10,2) DEFAULT 0,
    ref_id          INTEGER                 -- consult_id | cp_id | pharmacy_bill_item_id
);
CREATE INDEX IF NOT EXISTS idx_bill_items_billing ON billing_items(billing_id);

-- ── 4. Receipt Vouchers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipt_vouchers (
    receipt_id      SERIAL PRIMARY KEY,
    receipt_no      TEXT UNIQUE NOT NULL,
    receipt_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    billing_id      INTEGER NOT NULL REFERENCES billing_master(billing_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    amount          NUMERIC(12,2) NOT NULL,
    payment_mode    TEXT NOT NULL,          -- Cash | Card | UPI | Cheque
    reference_no    TEXT,                   -- UPI txn ID, cheque no.
    gl_dr_id        INTEGER REFERENCES gl_master(gl_id),   -- Cash or Bank A/c
    gl_cr_id        INTEGER REFERENCES gl_master(gl_id),   -- Income A/c
    narration       TEXT,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_receipt_billing ON receipt_vouchers(billing_id);
CREATE INDEX IF NOT EXISTS idx_receipt_date ON receipt_vouchers(receipt_date);

-- ── 5. Vouchers (Payment / Journal / Contra) ─────────────────
CREATE TABLE IF NOT EXISTS vouchers (
    voucher_id      SERIAL PRIMARY KEY,
    voucher_no      TEXT UNIQUE NOT NULL,
    voucher_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    voucher_type    TEXT NOT NULL
                    CHECK (voucher_type IN ('Payment','Receipt','Journal','Contra')),
    debit_gl        INTEGER REFERENCES gl_master(gl_id),
    credit_gl       INTEGER REFERENCES gl_master(gl_id),
    amount          NUMERIC(12,2) NOT NULL,
    narration       TEXT,
    ref_type        TEXT,       -- Bill | Receipt | PurchaseBill | Manual
    ref_id          INTEGER,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vch_date ON vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_vch_type ON vouchers(voucher_type);

-- ============================================================
-- Phase 4 SQL complete.
-- Run: psql -U postgres -d pet_erp -f database/phase4.sql
-- ============================================================
