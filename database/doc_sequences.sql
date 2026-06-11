-- ============================================================
-- Pet Clinic ERP — Document Sequences Table
-- ============================================================
-- Replaces the fragile "query last row + increment" pattern.
-- Used for ALL numbered documents — appointments, bills, Rx etc.
-- Admin can manually SET current_no to rollback bill numbers.
-- Financial year prefix (2526 = FY 2025-26) auto-resets April 1.
-- ============================================================

CREATE TABLE IF NOT EXISTS doc_sequences (
    doc_type        TEXT PRIMARY KEY,       -- 'APT', 'CON', 'RX', 'PUR', 'PHR', 'BIL', 'REC', 'VCH'
    prefix          TEXT NOT NULL,          -- 'APT', 'CON' etc.
    current_no      INTEGER DEFAULT 0,      -- last used number (next = current_no + 1)
    pad_length      SMALLINT DEFAULT 4,     -- zero-pad width: 4 → 0001, 5 → 00001
    use_fin_year    BOOLEAN DEFAULT false,  -- if true, insert fin_year in number
    fin_year        TEXT DEFAULT '',        -- '2526' for FY 2025-26
    reset_on_year   BOOLEAN DEFAULT true,   -- reset current_no to 0 on April 1 each year
    last_no_issued  TEXT,                   -- full formatted number last issued (audit)
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- Seed with all document types
INSERT INTO doc_sequences (doc_type, prefix, current_no, pad_length, use_fin_year, fin_year, reset_on_year)
VALUES
    ('APT', 'APT', 0, 4, true, '2526', true),   -- Appointments:     APT2526001
    ('CON', 'CON', 0, 4, true, '2526', true),   -- Consultations:    CON2526001
    ('RX',  'RX',  0, 4, true, '2526', true),   -- Prescriptions:    RX2526001
    ('VAC', 'VAC', 0, 4, false,'',     false),  -- Vaccine codes:    VAC0001
    ('PUR', 'PUR', 0, 4, true, '2526', true),   -- Purchase bills:   PUR2526001
    ('PHM', 'PHM', 0, 4, true, '2526', true),   -- Pharmacy bills:   PHM2526001
    ('BIL', 'BIL', 0, 4, true, '2526', true),   -- Clinic bills:     BIL2526001
    ('REC', 'REC', 0, 4, true, '2526', true),   -- Receipt vouchers: REC2526001
    ('VCH', 'VCH', 0, 4, true, '2526', true),   -- Vouchers:         VCH2526001
    ('SUP', 'SUP', 0, 4, false,'',     false),  -- Suppliers:        SUP0001
    ('MED', 'MED', 0, 4, false,'',     false),  -- Medicines:        MED0001
    ('OWN', 'OWN', 0, 4, false,'',     false),
    ('PET', 'PET', 0, 4, false,'',     false),
    ('DOC', 'DOC', 0, 4, false,'',     false),
    ('STA', 'STA', 0, 4, false,'',     false),
    ('AGE', 'AGE', 0, 4, false,'',     false),
    ('SRV', 'SRV', 0, 4, false,'',     false),
    ('SB',  'SB',  0, 4, true, '2526', true),
    ('PB',  'PB',  0, 4, true, '2526', true),
    ('OWNGL', 'OWNGL', 0, 4, false, '', false),
    ('SUPGL', 'SUPGL', 0, 4, false, '', false),
    ('DOCGL', 'DOCGL', 0, 4, false, '', false),
    ('STAGL', 'STAGL', 0, 4, false, '', false),
    ('AGEGL', 'AGEGL', 0, 4, false, '', false),
    ('DR', 'DR', 0, 4, false, '', false),
    ('ST', 'ST', 0, 4, false, '', false),
    ('MEDICINE', 'MED', 0, 4, false, '', false),
    ('PROCEDURE', 'PRC', 0, 4, false, '', false),
    ('AGT', 'AGT', 0, 4, false, '', false),
    ('VRC', 'VRC', 0, 4, true, '2526', true),
    ('VC',  'VC',  0, 4, false, '', false),
    ('AD',  'AD-', 0, 5, true,  '2526', true),  -- Advance Payments: AD-252600001
    ('BA',  'BA-', 0, 5, true,  '2526', true),  -- Bank Arrivals: BA-252600001
    ('RV',  'RV-', 0, 5, true,  '2526', true),  -- Receipt Vouchers: RV-252600001
    ('PV',  'PV-', 0, 5, true,  '2627', true)   -- Payment Vouchers: PV-262700001
ON CONFLICT (doc_type) DO NOTHING;

-- ============================================================
-- Function: get_next_doc_no(doc_type)
-- Atomically increments and returns the next formatted number.
-- Uses a row-level lock (FOR UPDATE) to prevent race conditions.
-- ============================================================
CREATE OR REPLACE FUNCTION get_next_doc_no(p_doc_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_row       doc_sequences%ROWTYPE;
    v_next_no   INTEGER;
    v_formatted TEXT;
BEGIN
    -- Lock this row to prevent concurrent access
    SELECT * INTO v_row
    FROM doc_sequences
    WHERE doc_type = p_doc_type
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown doc_type: %', p_doc_type;
    END IF;

    v_next_no := v_row.current_no + 1;

    -- Format the number with zero-padding
    IF v_row.use_fin_year AND v_row.fin_year != '' THEN
        v_formatted := v_row.prefix || v_row.fin_year || LPAD(v_next_no::TEXT, v_row.pad_length, '0');
    ELSE
        v_formatted := v_row.prefix || LPAD(v_next_no::TEXT, v_row.pad_length, '0');
    END IF;

    -- Update the sequence
    UPDATE doc_sequences
    SET current_no     = v_next_no,
        last_no_issued = v_formatted,
        updated_at     = NOW()
    WHERE doc_type = p_doc_type;

    RETURN v_formatted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Usage examples:
--   SELECT get_next_doc_no('APT');  → 'APT25260001'
--   SELECT get_next_doc_no('BIL');  → 'BIL25260001'
--
-- To "go back" bill numbers (admin action):
--   UPDATE doc_sequences SET current_no = 10 WHERE doc_type = 'BIL';
--   → Next bill will be BIL2526011
-- ============================================================
