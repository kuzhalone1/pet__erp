-- ============================================================
-- Pet Clinic ERP — Phase 2: Clinical Core Tables
-- Run AFTER init.sql and doc_sequences.sql
-- ============================================================

-- ── 1. Doctor Schedule ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_schedule (
    schedule_id     SERIAL PRIMARY KEY,
    doctor_id       INTEGER NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
    day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon … 6=Sun
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    slot_duration   SMALLINT DEFAULT 15,    -- minutes per appointment slot
    is_active       BOOLEAN DEFAULT true,
    UNIQUE (doctor_id, day_of_week)
);

-- ── 2. Appointments ─────────────────────────────────────────
-- consult_id forward reference — filled after check-in
CREATE TABLE IF NOT EXISTS appointments (
    appt_id         SERIAL PRIMARY KEY,
    appt_no         TEXT UNIQUE NOT NULL,
    appt_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    appt_time       TIME NOT NULL,
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    doctor_id       INTEGER NOT NULL REFERENCES doctors(doctor_id),
    reason          TEXT,
    status          TEXT NOT NULL DEFAULT 'Scheduled'
                    CHECK (status IN ('Scheduled','Arrived','In-Consultation','Completed','Cancelled','No-Show')),
    arrived_at      TIMESTAMP,
    consult_id      INTEGER,                -- FK added after consultations table created (below)
    notes           TEXT,
    booked_by       INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(appt_date);
CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctor_id, appt_date);
CREATE INDEX IF NOT EXISTS idx_appt_pet ON appointments(pet_id);

-- ── 3. Procedures Master ────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedures_master (
    procedure_id    SERIAL PRIMARY KEY,
    procedure_code  TEXT UNIQUE NOT NULL,
    procedure_name  TEXT NOT NULL,
    category        TEXT,   -- Diagnostic | Surgical | Therapeutic | Dental | Grooming
    fee             NUMERIC(10,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ── 4. Consultations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultations (
    consult_id      SERIAL PRIMARY KEY,
    consult_no      TEXT UNIQUE NOT NULL,
    consult_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    consult_time    TIME NOT NULL DEFAULT CURRENT_TIME,
    appointment_id  INTEGER REFERENCES appointments(appt_id),  -- NULL = walk-in
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    doctor_id       INTEGER NOT NULL REFERENCES doctors(doctor_id),
    visit_type      TEXT NOT NULL DEFAULT 'OPD'
                    CHECK (visit_type IN ('OPD','Follow-Up','Emergency','Walk-In')),
    chief_complaint TEXT,
    temp_celsius    NUMERIC(4,1),
    weight_kg       NUMERIC(5,2),
    heart_rate      SMALLINT,
    resp_rate       SMALLINT,
    clinical_notes  TEXT,
    diagnosis       TEXT,
    advice          TEXT,
    followup_date   DATE,
    followup_notes  TEXT,
    consult_fee     NUMERIC(10,2) DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'Open'
                    CHECK (status IN ('Open','Closed','Billed')),
    billing_stub_id INTEGER,        -- filled in Phase 4
    closed_at       TIMESTAMP,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consult_date ON consultations(consult_date);
CREATE INDEX IF NOT EXISTS idx_consult_pet ON consultations(pet_id);
CREATE INDEX IF NOT EXISTS idx_consult_doctor ON consultations(doctor_id);

-- Back-fill FK: appointments.consult_id → consultations.consult_id
ALTER TABLE appointments
    ADD CONSTRAINT IF NOT EXISTS appt_consult_fk
    FOREIGN KEY (consult_id) REFERENCES consultations(consult_id);

-- ── 5. Consultation Procedures ──────────────────────────────
CREATE TABLE IF NOT EXISTS consultation_procedures (
    cp_id           SERIAL PRIMARY KEY,
    consult_id      INTEGER NOT NULL REFERENCES consultations(consult_id) ON DELETE CASCADE,
    procedure_id    INTEGER NOT NULL REFERENCES procedures_master(procedure_id),
    quantity        SMALLINT DEFAULT 1,
    fee             NUMERIC(10,2),          -- overrideable per consult
    notes           TEXT
);
CREATE INDEX IF NOT EXISTS idx_cp_consult ON consultation_procedures(consult_id);

-- ── 6. Prescriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    rx_no           TEXT UNIQUE NOT NULL,
    rx_date         DATE NOT NULL DEFAULT CURRENT_DATE,
    consult_id      INTEGER NOT NULL REFERENCES consultations(consult_id),
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    doctor_id       INTEGER NOT NULL REFERENCES doctors(doctor_id),
    notes           TEXT,                   -- general instructions: rest, diet, follow-up
    dispensed       BOOLEAN DEFAULT false,  -- set TRUE when pharmacy dispenses (Phase 3)
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rx_consult ON prescriptions(consult_id);
CREATE INDEX IF NOT EXISTS idx_rx_pet ON prescriptions(pet_id);

-- ── 7. Prescription Items ───────────────────────────────────
CREATE TABLE IF NOT EXISTS prescription_items (
    rx_item_id      SERIAL PRIMARY KEY,
    prescription_id INTEGER NOT NULL REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
    medicine_id     INTEGER,                -- NULL in Phase 2; linked in Phase 3
    medicine_name   TEXT NOT NULL,          -- free-text (doctor types it)
    dosage_form     TEXT,                   -- Tablet | Syrup | Injection | Drops | Ointment
    strength        TEXT,                   -- 250mg, 5ml etc.
    dose            TEXT,                   -- 1 tablet, 5ml
    frequency       TEXT,                   -- Twice daily, Every 8 hours
    route           TEXT,                   -- Oral | Topical | IV | IM | SC
    duration_days   SMALLINT,
    instructions    TEXT,                   -- After food, Shake well etc.
    quantity        NUMERIC(8,2),           -- total qty to dispense
    dispensed_qty   NUMERIC(8,2) DEFAULT 0  -- filled by pharmacy in Phase 3
);
CREATE INDEX IF NOT EXISTS idx_rxi_prescription ON prescription_items(prescription_id);

-- ── 8. Vaccines Master ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS vaccines (
    vaccine_id      SERIAL PRIMARY KEY,
    vaccine_code    TEXT UNIQUE NOT NULL,
    vaccine_name    TEXT NOT NULL,
    species_id      INTEGER REFERENCES species(species_id), -- NULL = all species
    disease_covered TEXT,                   -- Rabies, Parvovirus, FeLV etc.
    manufacturer    TEXT,
    dose_ml         NUMERIC(5,2),
    route           TEXT,                   -- SC | IM | Intranasal
    interval_days   SMALLINT,              -- days to next dose
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ── 9. Vaccination Records ──────────────────────────────────
CREATE TABLE IF NOT EXISTS vaccination_records (
    vacc_record_id  SERIAL PRIMARY KEY,
    consult_id      INTEGER REFERENCES consultations(consult_id), -- NULL = standalone
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    doctor_id       INTEGER REFERENCES doctors(doctor_id),
    vaccine_id      INTEGER NOT NULL REFERENCES vaccines(vaccine_id),
    given_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    batch_no        TEXT,
    manufacturer    TEXT,
    expiry_date     DATE,
    dose_ml         NUMERIC(5,2),
    next_due_date   DATE,                   -- auto: given_date + vaccine.interval_days
    site            TEXT,                   -- Left neck, Right thigh etc.
    notes           TEXT,
    given_by        INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vacc_pet ON vaccination_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_vacc_due ON vaccination_records(next_due_date);

-- ── 10. Vaccination Reminders ────────────────────────────────
CREATE TABLE IF NOT EXISTS vaccination_reminders (
    reminder_id     SERIAL PRIMARY KEY,
    vacc_record_id  INTEGER NOT NULL REFERENCES vaccination_records(vacc_record_id),
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    due_date        DATE NOT NULL,
    reminder_status TEXT NOT NULL DEFAULT 'Pending'
                    CHECK (reminder_status IN ('Pending','Notified','Overdue','Done')),
    notified_at     TIMESTAMP,
    notified_via    TEXT,                   -- In-App | WhatsApp | SMS
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reminder_due ON vaccination_reminders(due_date, reminder_status);

-- ── Seed: Sample Procedures ─────────────────────────────────
INSERT INTO procedures_master (procedure_code, procedure_name, category, fee) VALUES
    ('XRAY',  'X-Ray',           'Diagnostic',   500),
    ('USG',   'Ultrasound',      'Diagnostic',   800),
    ('BLOOD', 'Blood Test (CBC)', 'Diagnostic',  350),
    ('DRES',  'Wound Dressing',  'Therapeutic',  200),
    ('DEWORM','Deworming',       'Therapeutic',  150),
    ('NEUT',  'Neutering',       'Surgical',    3000),
    ('SPAY',  'Spaying',         'Surgical',    3500),
    ('DENT',  'Dental Cleaning', 'Dental',       600),
    ('GROOM', 'Grooming',        'Grooming',     400),
    ('MICRO', 'Microchipping',   'Therapeutic',  500)
ON CONFLICT (procedure_code) DO NOTHING;

-- ── Seed: Common Vaccines ───────────────────────────────────
INSERT INTO vaccines (vaccine_code, vaccine_name, disease_covered, interval_days, route, dose_ml) VALUES
    ('VAC001', 'Rabies (1 yr)',       'Rabies',               365, 'SC',    1.0),
    ('VAC002', 'DHPPiL (5-in-1)',     'Distemper/Parvo/Lepto', 365, 'SC',   1.0),
    ('VAC003', 'Bordetella',          'Kennel Cough',          180, 'Intranasal', 1.0),
    ('VAC004', 'Leptospirosis',       'Leptospirosis',         365, 'SC',   1.0),
    ('VAC005', 'Feline FVRCP',        'Feline Respiratory',   365, 'SC',    1.0),
    ('VAC006', 'Feline Leukemia',     'FeLV',                  365, 'SC',   1.0),
    ('VAC007', 'Rabies 3yr',          'Rabies',               1095, 'IM',   1.0)
ON CONFLICT (vaccine_code) DO NOTHING;

-- ============================================================
-- Phase 2 SQL complete.
-- Run: psql -U postgres -d pet_erp -f database/phase2.sql
-- ============================================================
