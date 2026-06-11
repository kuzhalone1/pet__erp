CREATE TABLE credit_notes (
    cn_id           SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) NOT NULL REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,       -- format: CN-26001
    voucher_date    DATE NOT NULL,
    ref_bill_id     INTEGER REFERENCES sales_bills(bill_id),
    ref_bill_no     VARCHAR(50),
    ref_bill_date   DATE,
    gl_party_id     INTEGER NOT NULL REFERENCES gl_master(gl_id),
    party_name      VARCHAR(200) NOT NULL,
    gl_credit_id    INTEGER REFERENCES gl_master(gl_id),  -- Sales Returns A/c
    credit_desc     VARCHAR(200),
    address1        TEXT,
    address2        TEXT,
    city            VARCHAR(100),
    state_code      VARCHAR(10),
    gstin           VARCHAR(20),
    is_interstate   BOOLEAN NOT NULL DEFAULT FALSE,
    total_qty       NUMERIC(10,3) DEFAULT 0,
    gross_amount    NUMERIC(12,2) DEFAULT 0,
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    discount_amt    NUMERIC(10,2) DEFAULT 0,
    taxable_amount  NUMERIC(12,2) DEFAULT 0,
    cgst_rate       NUMERIC(5,2) DEFAULT 0,
    cgst_amount     NUMERIC(10,2) DEFAULT 0,
    sgst_rate       NUMERIC(5,2) DEFAULT 0,
    sgst_amount     NUMERIC(10,2) DEFAULT 0,
    igst_rate       NUMERIC(5,2) DEFAULT 0,
    igst_amount     NUMERIC(10,2) DEFAULT 0,
    round_off       NUMERIC(6,2) DEFAULT 0,
    net_amount      NUMERIC(12,2) DEFAULT 0,
    narration       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Confirmed'
                      CHECK (status IN ('Draft','Confirmed','Cancelled')),
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE credit_note_items (
    item_id         SERIAL PRIMARY KEY,
    cn_id           INTEGER NOT NULL REFERENCES credit_notes(cn_id) ON DELETE CASCADE,
    line_no         INTEGER NOT NULL,
    medicine_id     INTEGER REFERENCES medicines(medicine_id),
    procedure_id    INTEGER REFERENCES procedures(procedure_id),
    item_code       VARCHAR(50),
    item_name       VARCHAR(200) NOT NULL,
    hsn_code        VARCHAR(20),
    unit            VARCHAR(20),
    quantity        NUMERIC(10,3),
    rate            NUMERIC(10,2),
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    discount_amt    NUMERIC(10,2) DEFAULT 0,
    taxable_amount  NUMERIC(10,2),
    gst_pct         NUMERIC(5,2),
    cgst_amount     NUMERIC(10,2),
    sgst_amount     NUMERIC(10,2),
    igst_amount     NUMERIC(10,2),
    line_total      NUMERIC(10,2)
);

CREATE INDEX idx_cn_party ON credit_notes(gl_party_id);
CREATE INDEX idx_cn_fy    ON credit_notes(fy_code);
CREATE INDEX idx_cni_cn   ON credit_note_items(cn_id);
