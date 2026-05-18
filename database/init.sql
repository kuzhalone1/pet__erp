-- ============================================================
-- Pet Clinic ERP — Database Initialization Script
-- Step 1: Foundation Tables
-- Compatible with PostgreSQL 16+
-- ============================================================

-- Drop in reverse dependency order if re-running
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS pets CASCADE;
DROP TABLE IF EXISTS pet_owners CASCADE;
DROP TABLE IF EXISTS breeds CASCADE;
DROP TABLE IF EXISTS species CASCADE;
DROP TABLE IF EXISTS cities CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clinic_setup CASCADE;

-- ============================================================
-- 1. CLINIC SETUP
-- ============================================================
CREATE TABLE clinic_setup (
    clinic_id       SERIAL PRIMARY KEY,
    clinic_name     VARCHAR(200) NOT NULL,
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    phone           VARCHAR(20),
    alt_phone       VARCHAR(20),
    email           VARCHAR(100),
    website         VARCHAR(200),
    gstin           VARCHAR(20),
    pan             VARCHAR(12),
    logo_path       TEXT,
    reg_number      VARCHAR(100),   -- Veterinary Council Registration No.
    established_on  DATE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. USERS (Login Credentials)
-- ============================================================
CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    role            VARCHAR(30) NOT NULL DEFAULT 'staff',
                    -- admin | doctor | pharmacist | receptionist | nurse | staff
    email           VARCHAR(100),
    phone           VARCHAR(20),
    linked_doctor_id INTEGER,        -- filled later when doctors table exists
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. CITIES
-- ============================================================
CREATE TABLE cities (
    city_id         SERIAL PRIMARY KEY,
    city_name       VARCHAR(100) NOT NULL,
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. SPECIES
-- ============================================================
CREATE TABLE species (
    species_id      SERIAL PRIMARY KEY,
    species_name    VARCHAR(100) UNIQUE NOT NULL,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. BREEDS
-- ============================================================
CREATE TABLE breeds (
    breed_id        SERIAL PRIMARY KEY,
    species_id      INTEGER NOT NULL REFERENCES species(species_id) ON DELETE CASCADE,
    breed_name      VARCHAR(150) NOT NULL,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(species_id, breed_name)
);

-- ============================================================
-- 6. PET OWNERS
-- ============================================================
CREATE TABLE pet_owners (
    owner_id        SERIAL PRIMARY KEY,
    owner_code      VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    address         TEXT,
    city_id         INTEGER REFERENCES cities(city_id),
    city_name       VARCHAR(100),   -- stored flat for speed
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    phone           VARCHAR(20) NOT NULL,
    alt_phone       VARCHAR(20),
    email           VARCHAR(100),
    gstin           VARCHAR(20),
    pan             VARCHAR(12),
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    opening_balance NUMERIC(12,2) DEFAULT 0,
    balance_type    VARCHAR(2) DEFAULT 'DR',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. PETS
-- ============================================================
CREATE TABLE pets (
    pet_id          SERIAL PRIMARY KEY,
    pet_code        VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(150) NOT NULL,
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id) ON DELETE RESTRICT,
    species_id      INTEGER NOT NULL REFERENCES species(species_id),
    breed_id        INTEGER REFERENCES breeds(breed_id),
    gender          VARCHAR(10),        -- Male | Female | Unknown
    dob             DATE,
    age_years       INTEGER,
    age_months      INTEGER,
    color           VARCHAR(100),
    weight_kg       NUMERIC(6,2),
    microchip_no    VARCHAR(50),
    blood_group     VARCHAR(10),
    is_neutered     BOOLEAN DEFAULT FALSE,
    photo_path      TEXT,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 8. DOCTORS / VETS
-- ============================================================
CREATE TABLE doctors (
    doctor_id           SERIAL PRIMARY KEY,
    doctor_code         VARCHAR(30) UNIQUE NOT NULL,
    name                VARCHAR(200) NOT NULL,
    qualification       VARCHAR(200),
    specialization      VARCHAR(200),       -- Small Animals | Avian | Exotic | Surgery
    reg_number          VARCHAR(100),       -- Vet Council Registration No.
    phone               VARCHAR(20),
    alt_phone           VARCHAR(20),
    email               VARCHAR(100),
    consultation_fee    NUMERIC(10,2) DEFAULT 0,
    follow_up_fee       NUMERIC(10,2) DEFAULT 0,
    emergency_fee       NUMERIC(10,2) DEFAULT 0,
    available_days      VARCHAR(100),       -- e.g. Mon,Tue,Wed,Thu,Fri
    available_from      TIME,
    available_to        TIME,
    signature_path      TEXT,
    notes               TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. STAFF (Non-doctor employees)
-- ============================================================
CREATE TABLE staff (
    staff_id        SERIAL PRIMARY KEY,
    staff_code      VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    role            VARCHAR(50),        -- Receptionist | Nurse | Pharmacist | Admin | Lab Tech
    phone           VARCHAR(20),
    alt_phone       VARCHAR(20),
    email           VARCHAR(100),
    address         TEXT,
    doj             DATE,               -- Date of Joining
    salary          NUMERIC(10,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- FOREIGN KEY: link users -> doctors (added after doctors table)
-- ============================================================
ALTER TABLE users
    ADD CONSTRAINT fk_users_doctor
    FOREIGN KEY (linked_doctor_id) REFERENCES doctors(doctor_id)
    ON DELETE SET NULL;

-- ============================================================
-- INDEXES for faster lookups
-- ============================================================
CREATE INDEX idx_pet_owners_phone     ON pet_owners(phone);
CREATE INDEX idx_pet_owners_name      ON pet_owners(name);
CREATE INDEX idx_pets_owner           ON pets(owner_id);
CREATE INDEX idx_pets_name            ON pets(name);
CREATE INDEX idx_breeds_species       ON breeds(species_id);
CREATE INDEX idx_users_username       ON users(username);

-- ============================================================
-- UPDATED_AT auto-update trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER trg_clinic_updated_at
    BEFORE UPDATE ON clinic_setup
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pet_owners_updated_at
    BEFORE UPDATE ON pet_owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pets_updated_at
    BEFORE UPDATE ON pets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_staff_updated_at
    BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Done!
SELECT 'Pet Clinic ERP — database initialized successfully!' AS status;
