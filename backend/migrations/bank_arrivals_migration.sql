CREATE TABLE bank_arrivals (
    arrival_id      SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) NOT NULL REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,       -- format: BA-26001
    voucher_date    DATE NOT NULL,
    gl_party_id     INTEGER NOT NULL REFERENCES gl_master(gl_id),
    party_name      VARCHAR(200) NOT NULL,
    gl_bank_id      INTEGER NOT NULL REFERENCES gl_master(gl_id),
    bank_name       VARCHAR(200),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    entered_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance         NUMERIC(12,2) GENERATED ALWAYS AS (amount - entered_amount) STORED,
    ref_doc_no      VARCHAR(50),                       -- cheque no / UTR
    ref_doc_date    DATE,
    narration       TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','PartiallyMatched','Matched','Cancelled')),
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bank_arrivals_party ON bank_arrivals(gl_party_id);
CREATE INDEX idx_bank_arrivals_status ON bank_arrivals(status);
CREATE INDEX idx_bank_arrivals_fy ON bank_arrivals(fy_code);
