CREATE TABLE payment_vouchers (
    payment_id      SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) NOT NULL REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,       -- format: PV-26001
    voucher_date    DATE NOT NULL,
    gl_party_id     INTEGER NOT NULL REFERENCES gl_master(gl_id),
    party_name      VARCHAR(200) NOT NULL,
    gl_cashbank_id  INTEGER NOT NULL REFERENCES gl_master(gl_id),
    cashbank_name   VARCHAR(200),
    total_amount    NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    payment_type    VARCHAR(20) NOT NULL DEFAULT 'Cash'
                      CHECK (payment_type IN ('Cash','Cheque','NEFT','RTGS','UPI')),
    ref_no          VARCHAR(50),
    ref_date        DATE,
    narration       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Posted'
                      CHECK (status IN ('Posted','Cancelled')),
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_voucher_details (
    detail_id       SERIAL PRIMARY KEY,
    payment_id      INTEGER NOT NULL REFERENCES payment_vouchers(payment_id) ON DELETE CASCADE,
    line_no         INTEGER NOT NULL,
    vou_type        VARCHAR(10) NOT NULL CHECK (vou_type IN ('Bill','Advance')),
    -- Purchase bill link
    bill_id         INTEGER REFERENCES purchase_bills(bill_id),
    bill_no         VARCHAR(50),
    bill_date       DATE,
    bill_amount     NUMERIC(12,2),
    prev_paid       NUMERIC(12,2) DEFAULT 0,
    balance_amount  NUMERIC(12,2),
    amount_paid     NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0),
    -- Advance adjustment link
    adv_id          INTEGER REFERENCES advance_payments(adv_id)
);

CREATE INDEX idx_payment_vouchers_party ON payment_vouchers(gl_party_id);
CREATE INDEX idx_payment_vouchers_fy    ON payment_vouchers(fy_code);
CREATE INDEX idx_pvd_payment            ON payment_voucher_details(payment_id);
CREATE INDEX idx_pvd_bill               ON payment_voucher_details(bill_id);
