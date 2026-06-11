-- Part 1: Extend existing receipt_vouchers
ALTER TABLE receipt_vouchers
  ADD COLUMN IF NOT EXISTS fy_code         VARCHAR(10) REFERENCES financial_years(fy_code),
  ADD COLUMN IF NOT EXISTS gl_party_id     INTEGER REFERENCES gl_master(gl_id),
  ADD COLUMN IF NOT EXISTS gl_cashbank_id  INTEGER REFERENCES gl_master(gl_id),
  ADD COLUMN IF NOT EXISTS payment_type    VARCHAR(20) DEFAULT 'Cash'
                             CHECK (payment_type IN ('Cash','Cheque','NEFT','RTGS','UPI')),
  ADD COLUMN IF NOT EXISTS ref_no          VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ref_date        DATE,
  ADD COLUMN IF NOT EXISTS narration       TEXT,
  ADD COLUMN IF NOT EXISTS status          VARCHAR(20) DEFAULT 'Posted'
                             CHECK (status IN ('Posted','Cancelled'));

-- Part 2: New detail table
CREATE TABLE IF NOT EXISTS receipt_voucher_details (
    detail_id        SERIAL PRIMARY KEY,
    receipt_id       INTEGER NOT NULL REFERENCES receipt_vouchers(receipt_id) ON DELETE CASCADE,
    line_no          INTEGER NOT NULL,
    vou_type         VARCHAR(10) NOT NULL CHECK (vou_type IN ('Bill','Arrival')),
    -- Bill link
    bill_id          INTEGER REFERENCES sales_bills(bill_id),
    bill_no          VARCHAR(50),
    bill_date        DATE,
    bill_amount      NUMERIC(12,2),
    prev_received    NUMERIC(12,2) DEFAULT 0,
    balance_amount   NUMERIC(12,2),
    amount_received  NUMERIC(12,2) NOT NULL CHECK (amount_received > 0),
    -- Bank arrival link (when vou_type = 'Arrival')
    arrival_id       INTEGER REFERENCES bank_arrivals(arrival_id)
);

CREATE INDEX IF NOT EXISTS idx_rvd_receipt ON receipt_voucher_details(receipt_id);
CREATE INDEX IF NOT EXISTS idx_rvd_bill    ON receipt_voucher_details(bill_id);
