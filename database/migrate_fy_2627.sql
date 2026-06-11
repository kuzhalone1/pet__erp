-- ============================================================
-- Migration: Switch Financial Year from 2025-26 to 2026-27
-- Run this on your company database (e.g., pet_clinic_erp or whichever DB is used)
-- ============================================================

-- 1. Update doc_sequences: change all fin_year '2526' → '2627' for year-enabled sequences
UPDATE doc_sequences
SET fin_year = '2627'
WHERE fin_year = '2526'
  AND use_fin_year = true;

-- 2. Add any missing doc_sequence types (JV, DN, CN, VAC with year)
INSERT INTO doc_sequences (doc_type, prefix, current_no, pad_length, use_fin_year, fin_year, reset_on_year)
VALUES
    ('JV',  'JV-', 0, 5, true,  '2627', true),
    ('DN',  'DN-', 0, 5, true,  '2627', true),
    ('CN',  'CN-', 0, 5, true,  '2627', true)
ON CONFLICT (doc_type) DO UPDATE
    SET fin_year = '2627', use_fin_year = true;

-- Also ensure PV, RV, BA, AD, VRC, APT, CON, RX, PUR, PHM, BIL, SB, PB, VCH, REC are on 2627
UPDATE doc_sequences
SET fin_year = '2627'
WHERE doc_type IN ('PV','RV','BA','AD','VRC','APT','CON','RX','PUR','PHM','BIL','SB','PB','VCH','REC','VAC')
  AND use_fin_year = true;

-- 3. Update FinancialYear: set 2026-27 as current, clear 2025-26
UPDATE financial_years SET is_current = false WHERE fy_code != '2026-27';
UPDATE financial_years SET is_current = true  WHERE fy_code = '2026-27';

-- Insert 2026-27 if it doesn't exist yet
INSERT INTO financial_years (fy_code, start_date, end_date, is_current)
VALUES ('2026-27', '2026-04-01', '2027-03-31', true)
ON CONFLICT (fy_code) DO UPDATE SET is_current = true;

-- 4. Verify result
SELECT doc_type, prefix, current_no, use_fin_year, fin_year, last_no_issued
FROM doc_sequences
ORDER BY doc_type;

SELECT fy_code, is_current, start_date, end_date
FROM financial_years
ORDER BY fy_code;
