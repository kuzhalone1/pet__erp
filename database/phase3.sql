-- ============================================================
-- Pet Clinic ERP — Phase 3: Pharmacy & Stock Tables
-- Run AFTER phase2.sql
-- ============================================================

-- ── 1. Suppliers ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id     SERIAL PRIMARY KEY,
    supplier_code   TEXT UNIQUE NOT NULL,
    supplier_name   TEXT NOT NULL,
    contact_person  TEXT,
    phone           TEXT,
    alt_phone       TEXT,
    email           TEXT,
    address         TEXT,
    city_id         INTEGER REFERENCES cities(city_id),
    gstin           TEXT,
    pan             TEXT,
    drug_license_no TEXT,
    payment_terms   TEXT,           -- Net 30, Immediate etc.
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ── 2. Medicines Master ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicines (
    medicine_id     SERIAL PRIMARY KEY,
    medicine_code   TEXT UNIQUE NOT NULL,
    medicine_name   TEXT NOT NULL,
    generic_name    TEXT,
    manufacturer    TEXT,
    category        TEXT,           -- Antibiotic | Antiparasitic | Vaccine | Supplement | Anesthetic
    dosage_form     TEXT,           -- Tablet | Syrup | Injection | Drops | Ointment | Powder
    strength        TEXT,           -- 250mg, 5ml/5ml etc.
    unit            TEXT,           -- Tablet | ml | Strip | Vial | Tube | Sachet
    drug_schedule   TEXT,           -- H | H1 | X | OTC
    hsn_code        TEXT,
    gst_percent     NUMERIC(5,2) DEFAULT 12,
    default_sale_price NUMERIC(10,2) DEFAULT 0,
    reorder_level   INTEGER DEFAULT 10,
    current_stock   INTEGER DEFAULT 0,  -- maintained by triggers on stock_ledger
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_med_name ON medicines(medicine_name);
CREATE INDEX IF NOT EXISTS idx_med_category ON medicines(category);

-- ── 3. Medicine Batches ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_batches (
    batch_id        SERIAL PRIMARY KEY,
    medicine_id     INTEGER NOT NULL REFERENCES medicines(medicine_id),
    batch_no        TEXT NOT NULL,
    manufacturer    TEXT,
    mfg_date        DATE,
    expiry_date     DATE NOT NULL,
    purchase_price  NUMERIC(10,2),      -- per unit cost price
    sale_price      NUMERIC(10,2),      -- MRP per unit
    opening_qty     INTEGER DEFAULT 0,
    current_qty     INTEGER DEFAULT 0,  -- decrements on each sale
    purchase_bill_id INTEGER,           -- linked to purchase_bills.bill_id
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (medicine_id, batch_no)
);
CREATE INDEX IF NOT EXISTS idx_batch_medicine ON medicine_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_batch_expiry ON medicine_batches(expiry_date);

-- ── 4. Stock Ledger ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_ledger (
    ledger_id       SERIAL PRIMARY KEY,
    medicine_id     INTEGER NOT NULL REFERENCES medicines(medicine_id),
    batch_id        INTEGER NOT NULL REFERENCES medicine_batches(batch_id),
    txn_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    txn_type        TEXT NOT NULL
                    CHECK (txn_type IN ('Purchase','Sale','Return-In','Return-Out','Adjustment','Write-Off','Opening')),
    qty             INTEGER NOT NULL,   -- positive = IN, negative = OUT
    ref_type        TEXT,               -- PurchaseBill | PharmacyBill | Adjustment
    ref_id          INTEGER,            -- ID of source transaction
    balance_qty     INTEGER,            -- running balance at time of entry
    notes           TEXT,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ledger_medicine ON stock_ledger(medicine_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_ledger_batch ON stock_ledger(batch_id);

-- ── 5. Purchase Bills ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_bills (
    bill_id             SERIAL PRIMARY KEY,
    bill_no             TEXT UNIQUE NOT NULL,
    bill_date           DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id         INTEGER NOT NULL REFERENCES suppliers(supplier_id),
    supplier_invoice_no TEXT,
    supplier_invoice_date DATE,
    total_amount        NUMERIC(12,2) DEFAULT 0,
    discount_amount     NUMERIC(10,2) DEFAULT 0,
    gst_amount          NUMERIC(10,2) DEFAULT 0,
    net_amount          NUMERIC(12,2) DEFAULT 0,
    payment_status      TEXT NOT NULL DEFAULT 'Unpaid'
                        CHECK (payment_status IN ('Unpaid','Partial','Paid')),
    status              TEXT NOT NULL DEFAULT 'Draft'
                        CHECK (status IN ('Draft','Confirmed')), -- Confirm → creates batches & stock ledger
    notes               TEXT,
    created_by          INTEGER REFERENCES users(user_id),
    created_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pur_date ON purchase_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_pur_supplier ON purchase_bills(supplier_id);

-- ── 6. Purchase Bill Items ───────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_bill_items (
    item_id         SERIAL PRIMARY KEY,
    bill_id         INTEGER NOT NULL REFERENCES purchase_bills(bill_id) ON DELETE CASCADE,
    medicine_id     INTEGER NOT NULL REFERENCES medicines(medicine_id),
    batch_no        TEXT NOT NULL,
    mfg_date        DATE,
    expiry_date     DATE NOT NULL,
    quantity        INTEGER NOT NULL,
    free_quantity   INTEGER DEFAULT 0,
    purchase_price  NUMERIC(10,2) NOT NULL,
    sale_price      NUMERIC(10,2),
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    gst_pct         NUMERIC(5,2) DEFAULT 12,
    gst_amount      NUMERIC(10,2) DEFAULT 0,
    line_total      NUMERIC(10,2) DEFAULT 0,
    batch_id        INTEGER REFERENCES medicine_batches(batch_id) -- filled on confirm
);
CREATE INDEX IF NOT EXISTS idx_pur_items_bill ON purchase_bill_items(bill_id);

-- ── 7. Pharmacy Bills ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_bills (
    pharmacy_bill_id SERIAL PRIMARY KEY,
    pharma_bill_no  TEXT UNIQUE NOT NULL,
    bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    owner_id        INTEGER REFERENCES pet_owners(owner_id),
    pet_id          INTEGER REFERENCES pets(pet_id),
    prescription_id INTEGER REFERENCES prescriptions(prescription_id), -- NULL if OTC
    total_amount    NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    gst_amount      NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(12,2) DEFAULT 0,
    payment_mode    TEXT,               -- Cash | Card | UPI
    payment_status  TEXT NOT NULL DEFAULT 'Unpaid'
                    CHECK (payment_status IN ('Unpaid','Paid')),
    status          TEXT NOT NULL DEFAULT 'Draft'
                    CHECK (status IN ('Draft','Confirmed')), -- Confirm → deducts stock
    is_consolidated BOOLEAN DEFAULT false, -- TRUE when merged into billing_master (Phase 4)
    billing_id      INTEGER,               -- filled in Phase 4
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pharma_date ON pharmacy_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_pharma_rx ON pharmacy_bills(prescription_id);

-- ── 8. Pharmacy Bill Items ───────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_bill_items (
    item_id          SERIAL PRIMARY KEY,
    pharmacy_bill_id INTEGER NOT NULL REFERENCES pharmacy_bills(pharmacy_bill_id) ON DELETE CASCADE,
    medicine_id      INTEGER NOT NULL REFERENCES medicines(medicine_id),
    batch_id         INTEGER NOT NULL REFERENCES medicine_batches(batch_id), -- FIFO selected
    medicine_name    TEXT NOT NULL,
    batch_no         TEXT,
    expiry_date      DATE,
    quantity         NUMERIC(8,2) NOT NULL,
    sale_price       NUMERIC(10,2) NOT NULL,
    discount_pct     NUMERIC(5,2) DEFAULT 0,
    gst_pct          NUMERIC(5,2) DEFAULT 12,
    gst_amount       NUMERIC(10,2) DEFAULT 0,
    line_total       NUMERIC(10,2) DEFAULT 0,
    rx_item_id       INTEGER REFERENCES prescription_items(rx_item_id)  -- link back to Rx line
);
CREATE INDEX IF NOT EXISTS idx_pharma_items_bill ON pharmacy_bill_items(pharmacy_bill_id);

-- ── Back-link prescription_items.medicine_id → medicines ────
ALTER TABLE prescription_items
    ADD CONSTRAINT IF NOT EXISTS rxi_medicine_fk
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id);

-- ============================================================
-- Phase 3 SQL complete.
-- Run: psql -U postgres -d pet_erp -f database/phase3.sql
-- ============================================================
