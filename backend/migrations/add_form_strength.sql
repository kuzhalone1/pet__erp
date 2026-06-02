-- Migration to add dosage_form and strength columns to medicines table
ALTER TABLE medicines ADD COLUMN dosage_form VARCHAR(50);
ALTER TABLE medicines ADD COLUMN strength VARCHAR(50);
