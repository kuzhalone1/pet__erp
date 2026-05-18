-- 1. City: remove is_active
ALTER TABLE cities DROP COLUMN IF EXISTS is_active;

-- 2. Doctors: add HR + financial fields
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS doj DATE;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2) DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS salary_type TEXT DEFAULT 'Fixed';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(10,2) DEFAULT 0;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS balance_type TEXT DEFAULT 'CR';

-- 3. Staff: add financial fields
ALTER TABLE staff ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(10,2) DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS balance_type TEXT DEFAULT 'CR';
