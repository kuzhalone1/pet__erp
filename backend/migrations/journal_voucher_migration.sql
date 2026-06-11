CREATE TABLE journal_vouchers (
    journal_id      SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) NOT NULL REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,       -- format: JV-26001
    voucher_date    DATE NOT NULL,
    bill_ref_no     VARCHAR(50),
    narration       TEXT NOT NULL,
    total_cr        NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_dr        NUMERIC(14,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'Posted'
                      CHECK (status IN ('Posted','Cancelled')),
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    -- Enforce balance at DB level
    CONSTRAINT jv_balanced CHECK (total_cr = total_dr)
);

CREATE TABLE journal_lines (
    line_id         SERIAL PRIMARY KEY,
    journal_id      INTEGER NOT NULL REFERENCES journal_vouchers(journal_id) ON DELETE CASCADE,
    line_no         INTEGER NOT NULL,
    gl_cr_id        INTEGER REFERENCES gl_master(gl_id),
    cr_account_name VARCHAR(200),
    gl_dr_id        INTEGER REFERENCES gl_master(gl_id),
    dr_account_name VARCHAR(200),
    cr_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    dr_amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT line_one_side CHECK (
        (cr_amount > 0 AND dr_amount = 0) OR (dr_amount > 0 AND cr_amount = 0)
    )
);

CREATE INDEX idx_jv_fy     ON journal_vouchers(fy_code);
CREATE INDEX idx_jl_journal ON journal_lines(journal_id);
CREATE INDEX idx_jl_cr_gl  ON journal_lines(gl_cr_id);
CREATE INDEX idx_jl_dr_gl  ON journal_lines(gl_dr_id);
