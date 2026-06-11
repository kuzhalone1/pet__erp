CREATE TABLE gl_postings (
    posting_id      SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) NOT NULL REFERENCES financial_years(fy_code),
    posting_date    DATE NOT NULL,
    gl_id           INTEGER NOT NULL REFERENCES gl_master(gl_id),
    -- Source voucher info
    voucher_type    VARCHAR(20) NOT NULL,
    -- Allowed: 'SalesBill','ReceiptVoucher','PurchaseBill','PaymentVoucher',
    --          'AdvancePayment','BankArrival','JournalVoucher','CreditNote','DebitNote'
    voucher_no      VARCHAR(30) NOT NULL,
    voucher_ref_id  INTEGER NOT NULL,       -- PK of the source table row
    -- Entry
    dr_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
    cr_amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
    narration       TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT posting_one_side CHECK (
        (dr_amount > 0 AND cr_amount = 0) OR (cr_amount > 0 AND dr_amount = 0)
    )
);

-- Critical indexes for report queries
CREATE INDEX idx_gl_postings_gl_date   ON gl_postings(gl_id, posting_date);
CREATE INDEX idx_gl_postings_fy        ON gl_postings(fy_code);
CREATE INDEX idx_gl_postings_vou_type  ON gl_postings(voucher_type, voucher_ref_id);
CREATE INDEX idx_gl_postings_date      ON gl_postings(posting_date);

-- Prevent duplicate postings for same voucher + gl_id combination
CREATE UNIQUE INDEX idx_gl_postings_unique
  ON gl_postings(voucher_type, voucher_ref_id, gl_id, dr_amount, cr_amount);
