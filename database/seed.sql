-- ============================================================
-- Pet Clinic ERP — Seed Data Script
-- Run AFTER init.sql
-- ============================================================

-- ============================================================
-- CLINIC SETUP (sample)
-- ============================================================
INSERT INTO clinic_setup (clinic_name, address, city, state, pincode, phone, email, gstin, reg_number)
VALUES (
    'PawCare Veterinary Clinic',
    '12, MG Road, Near Bus Stand',
    'Hyderabad',
    'Telangana',
    '500001',
    '9876543210',
    'info@pawcare.clinic',
    '36AAAAA0000A1Z5',
    'VET/TS/2023/001'
);

-- ============================================================
-- CITIES (10 sample)
-- ============================================================
INSERT INTO cities (city_name, state, pincode) VALUES
    ('Hyderabad', 'Telangana', '500001'),
    ('Secunderabad', 'Telangana', '500003'),
    ('Warangal', 'Telangana', '506001'),
    ('Mumbai', 'Maharashtra', '400001'),
    ('Chennai', 'Tamil Nadu', '600001'),
    ('Bangalore', 'Karnataka', '560001'),
    ('Delhi', 'Delhi', '110001'),
    ('Pune', 'Maharashtra', '411001'),
    ('Kolkata', 'West Bengal', '700001'),
    ('Ahmedabad', 'Gujarat', '380001');

-- ============================================================
-- SPECIES (5 common)
-- ============================================================
INSERT INTO species (species_name, notes) VALUES
    ('Dog', 'Canine — most common pet'),
    ('Cat', 'Feline — second most common'),
    ('Bird', 'Avian — parrots, cockatiels, budgies'),
    ('Rabbit', 'Small mammal'),
    ('Hamster', 'Small rodent');

-- ============================================================
-- BREEDS (10 across species)
-- ============================================================
-- Dogs (species_id = 1)
INSERT INTO breeds (species_id, breed_name) VALUES
    (1, 'Labrador Retriever'),
    (1, 'German Shepherd'),
    (1, 'Golden Retriever'),
    (1, 'Beagle'),
    (1, 'Pomeranian'),
    (1, 'Indian Pariah'),
    (1, 'Dachshund'),
-- Cats (species_id = 2)
    (2, 'Persian'),
    (2, 'Siamese'),
    (2, 'Indian Domestic Shorthair');

-- ============================================================
-- NOTE: Admin user is created by backend/create_admin.py
-- which generates a real bcrypt hash at runtime.
-- Do NOT add a hardcoded hash here.
-- ============================================================

-- ============================================================
-- SAMPLE DOCTOR
-- ============================================================
INSERT INTO doctors (doctor_code, name, qualification, specialization, reg_number, phone, consultation_fee, follow_up_fee, emergency_fee, available_days)
VALUES
    ('DR001', 'Dr. Priya Sharma', 'BVSc & AH, MVSc', 'Small Animals & Surgery', 'VCI/AP/12345', '9876500001', 500.00, 300.00, 800.00, 'Mon,Tue,Wed,Thu,Fri'),
    ('DR002', 'Dr. Ravi Kumar', 'BVSc & AH', 'General Practice', 'VCI/TS/67890', '9876500002', 400.00, 250.00, 600.00, 'Mon,Wed,Fri,Sat');

-- ============================================================
-- SAMPLE STAFF
-- ============================================================
INSERT INTO staff (staff_code, name, role, phone, doj)
VALUES
    ('ST001', 'Suma Reddy', 'Receptionist', '9876500010', '2024-01-01'),
    ('ST002', 'Arun Kumar', 'Pharmacist', '9876500011', '2024-01-01'),
    ('ST003', 'Kavitha B', 'Nurse', '9876500012', '2024-03-01');

-- ============================================================
-- SAMPLE PET OWNER
-- ============================================================
INSERT INTO pet_owners (owner_code, name, address, city_name, state, pincode, phone, email)
VALUES
    ('OWN001', 'Ramesh Babu', '5-6, Jubilee Hills', 'Hyderabad', 'Telangana', '500033', '9900001111', 'ramesh@email.com'),
    ('OWN002', 'Anjali Mehta', '22, Banjara Hills', 'Hyderabad', 'Telangana', '500034', '9900002222', 'anjali@email.com');

-- ============================================================
-- SAMPLE PETS
-- ============================================================
INSERT INTO pets (pet_code, name, owner_id, species_id, breed_id, gender, dob, color, weight_kg)
VALUES
    ('PET001', 'Bruno', 1, 1, 1, 'Male', '2021-06-15', 'Golden Brown', 28.5),
    ('PET002', 'Whiskers', 2, 2, 8, 'Female', '2022-03-10', 'White & Orange', 4.2);

-- ============================================================
SELECT 'Seed data inserted successfully!' AS status;
