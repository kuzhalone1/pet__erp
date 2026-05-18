-- ============================================================
-- Pet Clinic ERP — Master Modules Schema
-- Consolidated schema for: city, species, breed, gstrates, hsncodes, 
-- clinic setup, pet owners, pets, doctors, staff, vaccines, medicines, agents.
-- ============================================================

-- 1. CITIES
CREATE TABLE IF NOT EXISTS cities (
    city_id         SERIAL PRIMARY KEY,
    city_name       VARCHAR(100) NOT NULL,
    state           VARCHAR(100),
    pincode         VARCHAR(10),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. SPECIES
CREATE TABLE IF NOT EXISTS species (
    species_id      SERIAL PRIMARY KEY,
    species_name    VARCHAR(100) UNIQUE NOT NULL,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. BREEDS
CREATE TABLE IF NOT EXISTS breeds (
    breed_id        SERIAL PRIMARY KEY,
    species_id      INTEGER NOT NULL REFERENCES species(species_id) ON DELETE CASCADE,
    breed_name      VARCHAR(150) NOT NULL,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(species_id, breed_name)
);

-- 4. GST RATE MASTER
CREATE TABLE IF NOT EXISTS gst_rates (
    gst_rate_id SERIAL PRIMARY KEY,
    rate_name   VARCHAR(50) NOT NULL,
    gst_percent NUMERIC(5,2) NOT NULL,
    cgst_pct    NUMERIC(5,2) NOT NULL,
    sgst_pct    NUMERIC(5,2) NOT NULL,
    igst_pct    NUMERIC(5,2) NOT NULL,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT now()
);

-- 5. HSN CODE MASTER
CREATE TABLE IF NOT EXISTS hsn_codes (
    hsn_id          SERIAL PRIMARY KEY,
    hsn_code        VARCHAR(10) UNIQUE NOT NULL,
    description     VARCHAR(300) NOT NULL,
    default_gst_pct NUMERIC(5,2) DEFAULT 12,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT now()
);

-- 6. CLINIC SETUP
CREATE TABLE IF NOT EXISTS clinic_setup (
    clinic_id       SERIAL PRIMARY KEY,
    clinic_name     VARCHAR(200) NOT NULL,
    address         TEXT,           -- Legacy field
    city            VARCHAR(100),   -- Legacy field
    state           VARCHAR(100),   -- Legacy field
    pincode         VARCHAR(10),
    phone           VARCHAR(20),
    alt_phone       VARCHAR(20),
    email           VARCHAR(100),
    website         VARCHAR(200),
    gstin           VARCHAR(20),
    pan             VARCHAR(12),
    logo_path       TEXT,
    reg_number      VARCHAR(100),
    established_on  DATE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fy_start_month  SMALLINT DEFAULT 4,
    address1        TEXT,
    address2        TEXT,
    address3        TEXT,
    district        VARCHAR(100),
    state_name      VARCHAR(100),
    state_code      VARCHAR(5),
    drug_license_no VARCHAR(50)
);

-- 7. GL MASTER (Required for financial links)
CREATE TABLE IF NOT EXISTS gl_master (
    gl_id           SERIAL PRIMARY KEY,
    gl_code         VARCHAR(30) UNIQUE NOT NULL,
    gl_name         VARCHAR(200) NOT NULL,
    group_name      VARCHAR(50) NOT NULL,
    sub_group       VARCHAR(50),
    phone           VARCHAR(20),
    alt_phone       VARCHAR(20),
    email           VARCHAR(100),
    address1        TEXT,
    address2        TEXT,
    address3        TEXT,
    city_id         INT REFERENCES cities(city_id) ON DELETE SET NULL,
    district        VARCHAR(100),
    state_name      VARCHAR(100),
    state_code      VARCHAR(5),
    pincode         VARCHAR(10),
    gstin           VARCHAR(20),
    pan             VARCHAR(10),
    opening_balance NUMERIC(14,2) DEFAULT 0,
    balance_type    VARCHAR(2) DEFAULT 'DR',
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    agent_id        INT, -- Self-reference handled via ALTER or after agents created
    is_system       BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now()
);

-- 8. PET OWNERS
CREATE TABLE IF NOT EXISTS pet_owners (
    owner_id        SERIAL PRIMARY KEY,
    owner_code      VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    address         TEXT,           -- Legacy field
    city_id         INTEGER REFERENCES cities(city_id),
    city_name       VARCHAR(100),   -- Legacy field
    state           VARCHAR(100),   -- Legacy field
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
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    address1        TEXT,
    address2        TEXT,
    address3        TEXT,
    district        VARCHAR(100),
    state_name      VARCHAR(100),
    state_code      VARCHAR(5),
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL
);

-- 9. PETS
CREATE TABLE IF NOT EXISTS pets (
    pet_id          SERIAL PRIMARY KEY,
    pet_code        VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(150) NOT NULL,
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id) ON DELETE RESTRICT,
    species_id      INTEGER NOT NULL REFERENCES species(species_id),
    breed_id        INTEGER REFERENCES breeds(breed_id),
    gender          VARCHAR(10),
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

-- 10. DOCTORS
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id           SERIAL PRIMARY KEY,
    doctor_code         VARCHAR(30) UNIQUE NOT NULL,
    name                VARCHAR(200) NOT NULL,
    qualification       VARCHAR(200),
    specialization      VARCHAR(200),
    reg_number          VARCHAR(100),
    phone               VARCHAR(20),
    alt_phone           VARCHAR(20),
    email               VARCHAR(100),
    consultation_fee    NUMERIC(10,2) DEFAULT 0,
    follow_up_fee       NUMERIC(10,2) DEFAULT 0,
    emergency_fee       NUMERIC(10,2) DEFAULT 0,
    available_days      VARCHAR(100),
    available_from      TIME,
    available_to        TIME,
    signature_path      TEXT,
    notes               TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    address1            TEXT,
    address2            TEXT,
    address3            TEXT,
    district            VARCHAR(100),
    state_name          VARCHAR(100),
    state_code          VARCHAR(5),
    pincode             VARCHAR(10),
    pan                 VARCHAR(10),
    gl_account_id       INT REFERENCES gl_master(gl_id) ON DELETE SET NULL
);

-- 11. STAFF
CREATE TABLE IF NOT EXISTS staff (
    staff_id        SERIAL PRIMARY KEY,
    staff_code      VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    role            VARCHAR(50),
    phone           VARCHAR(20),
    alt_phone       VARCHAR(20),
    email           VARCHAR(100),
    address         TEXT,           -- Legacy field
    doj             DATE,
    salary          NUMERIC(10,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    address1        TEXT,
    address2        TEXT,
    address3        TEXT,
    district        VARCHAR(100),
    state_name      VARCHAR(100),
    state_code      VARCHAR(5),
    pincode         VARCHAR(10),
    pan             VARCHAR(10),
    gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL
);

-- 12. AGENTS / REFERRALS
CREATE TABLE IF NOT EXISTS agents (
    agent_id        SERIAL PRIMARY KEY,
    agent_code      VARCHAR(30) UNIQUE NOT NULL,
    name            VARCHAR(200) NOT NULL,
    clinic_name     VARCHAR(200),
    phone           VARCHAR(20),
    alt_phone       VARCHAR(20),
    email           VARCHAR(100),
    address         TEXT,           -- Legacy field
    city_id         INT REFERENCES cities(city_id) ON DELETE SET NULL,
    commission_type VARCHAR(30) NOT NULL DEFAULT 'Flat',
    commission_rate NUMERIC(10,2) DEFAULT 0,
    opening_balance NUMERIC(12,2) DEFAULT 0,
    balance_type    VARCHAR(2) DEFAULT 'CR',
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now(),
    address1        TEXT,
    address2        TEXT,
    address3        TEXT,
    district        VARCHAR(100),
    state_name      VARCHAR(100),
    state_code      VARCHAR(5),
    pincode         VARCHAR(10),
    gstin           VARCHAR(20),
    pan             VARCHAR(10),
    gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL
);

-- 13. VACCINATION MASTER
CREATE TABLE IF NOT EXISTS vaccines (
    vaccine_id      SERIAL PRIMARY KEY,
    vaccine_code    TEXT UNIQUE NOT NULL,
    vaccine_name    TEXT NOT NULL,
    species_id      INTEGER REFERENCES species(species_id),
    disease_covered TEXT,
    manufacturer    TEXT,
    dose_ml         NUMERIC(5,2),
    route           TEXT,
    interval_days   SMALLINT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 14. MEDICINE MASTER
CREATE TABLE IF NOT EXISTS medicines (
    medicine_id     SERIAL PRIMARY KEY,
    medicine_code   TEXT UNIQUE NOT NULL,
    medicine_name   TEXT NOT NULL,
    generic_name    TEXT,
    manufacturer    TEXT,
    category        TEXT,
    dosage_form     TEXT,
    strength        TEXT,
    unit            TEXT,
    drug_schedule   TEXT,
    hsn_code        TEXT,
    gst_percent     NUMERIC(5,2) DEFAULT 12,
    default_sale_price NUMERIC(10,2) DEFAULT 0,
    reorder_level   INTEGER DEFAULT 10,
    current_stock   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);
