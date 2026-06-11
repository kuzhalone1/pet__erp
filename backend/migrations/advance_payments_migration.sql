CREATE TABLE advance_payments (
    adv_id          SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) NOT NULL REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,       -- format: AD-26001
    voucher_date    DATE NOT NULL,
    gl_party_id     INTEGER NOT NULL REFERENCES gl_master(gl_id),
    party_name      VARCHAR(200) NOT NULL,
    party_type      VARCHAR(10) NOT NULL DEFAULT 'Supplier' CHECK (party_type IN ('Supplier','Customer')),
    gl_cashbank_id  INTEGER NOT NULL REFERENCES gl_master(gl_id),
    cashbank_name   VARCHAR(200),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    adjusted_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance         NUMERIC(12,2) GENERATED ALWAYS AS (amount - adjusted_amount) STORED,
    doc_no          VARCHAR(50),
    doc_date        DATE,
    narration       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','Adjusted','Cancelled')),
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_advance_payments_party ON advance_payments(gl_party_id);
CREATE INDEX idx_advance_payments_status ON advance_payments(status);
CREATE INDEX idx_advance_payments_fy ON advance_payments(fy_code);
