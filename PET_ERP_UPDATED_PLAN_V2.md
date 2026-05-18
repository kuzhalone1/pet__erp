# 🐾 Pet Clinic ERP — Architecture Plan V2
**Master DB + Company DBs | Role-Based Access | Pet Book**
**Build Order: 1 → Company Creation | 2 → Role-Based Login | 3 → Pet Book**

---

## OVERALL SYSTEM STRUCTURE

```
pet_erp_master DB       ← 4th DB. Always running. Checked on every login.
│
├── tenants             ← Who owns this ERP account (Dr. Sharma)
├── company_profiles    ← ABC, BCD, XYZ — full company details + which DB to connect
├── users               ← All users across all companies, with roles
├── user_company_access ← Which user can access which company
└── user_module_access  ← Which user can access which modules within a company

abc_clinic DB           ← Company 1 — full schema
bcd_clinic DB           ← Company 2 — exact same schema as abc_clinic
xyz_clinic DB           ← Company 3 — exact same schema as abc_clinic
```

Every company DB is **an identical copy of the same schema**. When a new company is created, the system creates a new DB and runs the same migrations automatically — no manual setup.

---

## PHASE 1: COMPANY CREATION

### 1.1 Master DB Schema (pet_erp_master)

```sql
-- TENANTS — the person who owns the ERP account
CREATE TABLE tenants (
    tenant_id       SERIAL PRIMARY KEY,
    tenant_name     VARCHAR(150) NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- COMPANY PROFILES — one row per company, all details in one place
CREATE TABLE company_profiles (
    company_id      SERIAL PRIMARY KEY,
    tenant_id       INTEGER REFERENCES tenants(tenant_id),

    -- Identity
    company_code    VARCHAR(10) NOT NULL,       -- ABC, BCD, XYZ
    company_name    VARCHAR(200) NOT NULL,       -- ABC Vets Pvt. Ltd.

    -- DB Routing
    db_name         VARCHAR(100) NOT NULL,       -- abc_clinic
    db_uri          TEXT NOT NULL,               -- connection string (encrypted)

    -- Address
    address_line1   VARCHAR(200),
    address_line2   VARCHAR(200),
    address_line3   VARCHAR(200),
    city            VARCHAR(100),
    pincode         VARCHAR(10),
    state           VARCHAR(100),

    -- Legal & Tax
    gst_number      VARCHAR(20),
    pan_number      VARCHAR(20),
    drug_license_no VARCHAR(50),

    -- Contact
    phone           VARCHAR(15),
    email           VARCHAR(100),
    website         VARCHAR(200),
    logo_url        TEXT,

    -- Financial Year
    current_fy      VARCHAR(10) DEFAULT '2026-27',
    fy_start_month  SMALLINT DEFAULT 4,          -- 4 = April (Indian FY)

    status          VARCHAR(20) DEFAULT 'Active',
    created_at      TIMESTAMP DEFAULT NOW(),

    CONSTRAINT max_3_per_tenant CHECK (
        (SELECT COUNT(*) FROM company_profiles cp
         WHERE cp.tenant_id = tenant_id) < 3
    )
);
```

**Why store all company details here?**
Fetched once at login → stored in JWT session → used everywhere (bill headers, prescriptions, reports, PDF exports). No repeated queries during normal operations.

---

### 1.2 Company Creation Flow

When the admin clicks **"Add New Company"**:

```
Admin fills company form:
  Name: BCD Hospital
  Code: BCD
  Address, GST, PAN, Phone...
        ↓
Backend validates:
  - Tenant has fewer than 3 companies
  - Company code is unique for this tenant
        ↓
Step 1: INSERT into company_profiles (pet_erp_master)
  db_name = 'bcd_clinic'
        ↓
Step 2: CREATE DATABASE bcd_clinic  (Postgres command)
        ↓
Step 3: Run Alembic migrations on bcd_clinic
  → Creates all tables: pets, pet_owners, pet_visits,
    billing, vouchers, stock_ledger, users, roles...
  → Exact same schema as abc_clinic
        ↓
Step 4: INSERT default data into bcd_clinic
  → financial_years row for current FY
  → default roles: Admin, Doctor, Receptionist, Pharmacist
  → company_settings row (mirrors company_profiles)
        ↓
Step 5: Return success. New company is live.
```

The schema is maintained as **Alembic migration files**. One command applies the full schema to any new DB. No manual table creation ever.

---

### 1.3 Company DB Internal Schema (Inside Each Company DB)

```sql
-- Mirror of key company details (local cache for offline resilience)
CREATE TABLE company_settings (
    setting_id      SERIAL PRIMARY KEY,
    company_name    VARCHAR(200) NOT NULL,
    company_code    VARCHAR(10) NOT NULL,
    address_line1   VARCHAR(200),
    address_line2   VARCHAR(200),
    address_line3   VARCHAR(200),
    city            VARCHAR(100),
    pincode         VARCHAR(10),
    state           VARCHAR(100),
    gst_number      VARCHAR(20),
    pan_number      VARCHAR(20),
    drug_license_no VARCHAR(50),
    phone           VARCHAR(15),
    email           VARCHAR(100),
    logo_url        TEXT,
    current_fy      VARCHAR(10) NOT NULL,
    fy_start_month  SMALLINT DEFAULT 4,
    updated_at      TIMESTAMP DEFAULT NOW()
);
-- Single row. Updated whenever company_profiles is edited.

-- Financial Years
CREATE TABLE financial_years (
    fy_id       SERIAL PRIMARY KEY,
    fy_code     VARCHAR(10) NOT NULL UNIQUE,    -- '2026-27'
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    is_current  BOOLEAN DEFAULT FALSE,
    is_locked   BOOLEAN DEFAULT FALSE,
    locked_at   TIMESTAMP,
    locked_by   INTEGER
);
```

---

### 1.4 Financial Tables (FY-Aware, Inside Each Company DB)

These tables carry a `fy_id` column. All other tables (clinical) do not.

```sql
CREATE TABLE billing (
    bill_id         SERIAL PRIMARY KEY,
    fy_id           VARCHAR(10) NOT NULL,       -- '2026-27'
    bill_no         VARCHAR(20) NOT NULL,
    pet_id          INTEGER REFERENCES pets(pet_id),
    bill_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount    NUMERIC(10,2),
    discount        NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(10,2),
    payment_mode    VARCHAR(30),
    is_paid         BOOLEAN DEFAULT FALSE,
    created_by      INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vouchers (
    voucher_id      SERIAL PRIMARY KEY,
    fy_id           VARCHAR(10) NOT NULL,
    voucher_no      VARCHAR(20) NOT NULL,
    voucher_type    VARCHAR(20),                -- RECEIPT, PAYMENT, JOURNAL
    voucher_date    DATE NOT NULL,
    amount          NUMERIC(10,2),
    narration       TEXT,
    created_by      INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stock_ledger (
    ledger_id       SERIAL PRIMARY KEY,
    fy_id           VARCHAR(10) NOT NULL,
    medicine_id     INTEGER,
    txn_type        VARCHAR(20),                -- PURCHASE, SALE, ADJUSTMENT, OPENING
    txn_date        DATE NOT NULL,
    qty             NUMERIC(10,3),
    unit_price      NUMERIC(10,2),
    batch_no        VARCHAR(50),
    expiry_date     DATE,
    is_closing      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE opening_balances (
    ob_id           SERIAL PRIMARY KEY,
    fy_id           VARCHAR(10) NOT NULL,
    account_head    VARCHAR(200) NOT NULL,
    amount          NUMERIC(12,2),
    balance_type    VARCHAR(10)                 -- DR or CR
);
```

---

### 1.5 Year-End Close Process

```
Admin clicks "Close FY 2025-26 & Open 2026-27"
        ↓
Step 1 — Lock old FY
  UPDATE financial_years
  SET is_locked = TRUE, locked_at = NOW(), locked_by = <user_id>
  WHERE fy_code = '2025-26'
  → Billing, vouchers, stock for 2025-26 become read-only

Step 2 — Carry forward opening balances
  INSERT INTO opening_balances (fy_id, account_head, amount, balance_type)
  SELECT '2026-27', account_head, closing_balance, balance_type
  FROM account_summary WHERE fy_id = '2025-26'

Step 3 — Carry forward closing stock as opening stock
  INSERT INTO stock_ledger (fy_id, medicine_id, txn_type, qty, unit_price, txn_date)
  SELECT '2026-27', medicine_id, 'OPENING', closing_qty, avg_price, '2026-04-01'
  FROM stock_summary WHERE fy_id = '2025-26'

Step 4 — Create new FY
  UPDATE financial_years SET is_current = FALSE WHERE is_current = TRUE
  INSERT INTO financial_years (fy_code, start_date, end_date, is_current)
  VALUES ('2026-27', '2026-04-01', '2027-03-31', TRUE)

Step 5 — Update settings
  UPDATE company_settings SET current_fy = '2026-27'
  UPDATE company_profiles SET current_fy = '2026-27'
  WHERE company_id = <this_company>

Done. No new DB. No manual imports. Old year locked and preserved.
```

---

### 1.6 Auditor Data Export

```
Admin → Settings → Export FY Report
  Select FY: 2025-26
  Select tables: Billing / Vouchers / Stock / All
        ↓
System runs queries filtered by fy_id = '2025-26'
        ↓
Generates:
  - Excel file (one sheet per table)
  - PDF summary (P&L, stock, outstanding)
        ↓
Admin downloads and sends to auditor.
Auditor never touches the database.
```

---

## PHASE 2: ROLE-BASED LOGIN & ACCESS CONTROL

### 2.1 How Login Works — Full Flow

```
┌─────────────────────────────────────────┐
│          LOGIN SCREEN                   │
│  Email:    [________________]           │
│  Password: [________________]           │
│                 [Login]                 │
└─────────────────────────────────────────┘
        ↓
Check pet_erp_master → verify email + password
        ↓
Fetch user record → get tenant_id, user_id, role
        ↓
Fetch user_company_access → which companies this user can see
        ↓
If user has access to only 1 company → go directly to dashboard
If user has access to 2-3 companies → show company selector:

┌──────────────────────────────────────────┐
│  Welcome, Dr. Mehta                      │
│  Select a company:                       │
│                                          │
│  [ ABC Vets              → ]             │
│  [ BCD Hospital          → ]             │
└──────────────────────────────────────────┘

User selects ABC Vets
        ↓
Fetch company_profile for ABC → load all company details into session
        ↓
Fetch user_module_access for this user + this company
        ↓
Issue JWT token:
  {
    user_id: 5,
    tenant_id: 1,
    company_id: 2,
    company_code: "ABC",
    db: "abc_clinic",
    fy: "2026-27",
    role: "Doctor",
    allowed_modules: ["pet_book", "visits", "prescriptions"]
  }
        ↓
Frontend renders only the modules this user is allowed to see.
All API calls carry this token. Backend enforces access on every request.
```

---

### 2.2 Users & Roles Schema (in pet_erp_master)

```sql
-- USERS — all users of the system
CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    tenant_id       INTEGER REFERENCES tenants(tenant_id),
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    phone           VARCHAR(15),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ROLES — defined per company (each company can have its own role names)
CREATE TABLE roles (
    role_id         SERIAL PRIMARY KEY,
    company_id      INTEGER REFERENCES company_profiles(company_id),
    role_name       VARCHAR(50) NOT NULL,       -- Admin, Doctor, Receptionist, Pharmacist
    description     TEXT,
    is_system_role  BOOLEAN DEFAULT FALSE       -- system roles cannot be deleted
);

-- USER ↔ COMPANY ACCESS — which companies a user can log into
CREATE TABLE user_company_access (
    access_id       SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(user_id),
    company_id      INTEGER REFERENCES company_profiles(company_id),
    role_id         INTEGER REFERENCES roles(role_id),
    is_active       BOOLEAN DEFAULT TRUE,
    granted_by      INTEGER REFERENCES users(user_id),
    granted_at      TIMESTAMP DEFAULT NOW()
);
-- A user can have different roles in different companies.
-- Dr. Mehta = Admin in ABC Vets, but Doctor only in BCD Hospital.

-- USER ↔ MODULE ACCESS — which modules a user can use within a company
CREATE TABLE user_module_access (
    module_access_id SERIAL PRIMARY KEY,
    user_id          INTEGER REFERENCES users(user_id),
    company_id       INTEGER REFERENCES company_profiles(company_id),
    module_code      VARCHAR(50) NOT NULL,      -- see module list below
    can_view         BOOLEAN DEFAULT TRUE,
    can_create       BOOLEAN DEFAULT FALSE,
    can_edit         BOOLEAN DEFAULT FALSE,
    can_delete       BOOLEAN DEFAULT FALSE,
    can_export       BOOLEAN DEFAULT FALSE
);
```

---

### 2.3 Module List

Every feature of the ERP is a module. Access is granted or denied per user per company.

| Module Code | Module Name | Description |
| :--- | :--- | :--- |
| `company_settings` | Company Settings | Edit company profile, FY close |
| `user_management` | User Management | Add/remove users, assign roles |
| `pet_book` | Pet Book | View/edit pet profiles and history |
| `visits` | OPD Visits | Create and manage consultations |
| `prescriptions` | Prescriptions | Write and view prescriptions |
| `vaccines` | Vaccines | Record and track vaccinations |
| `lab_reports` | Lab Reports | Upload and view lab results |
| `billing` | Billing | Create bills, view payments |
| `pharmacy` | Pharmacy / Stock | Medicine inventory and sales |
| `vouchers` | Accounts / Vouchers | Journal, receipt, payment entries |
| `reports` | Reports | View and export reports |
| `audit_export` | Auditor Export | Export FY data for audit |

---

### 2.4 Default Roles & Their Module Access

The system creates these 4 roles automatically when a new company is created.

| Module | Admin | Doctor | Receptionist | Pharmacist |
| :--- | :---: | :---: | :---: | :---: |
| Company Settings | ✅ Full | ❌ | ❌ | ❌ |
| User Management | ✅ Full | ❌ | ❌ | ❌ |
| Pet Book | ✅ Full | ✅ Full | ✅ View only | ❌ |
| OPD Visits | ✅ Full | ✅ Full | ✅ Create | ❌ |
| Prescriptions | ✅ Full | ✅ Full | ✅ View only | ✅ View only |
| Vaccines | ✅ Full | ✅ Full | ✅ View only | ❌ |
| Lab Reports | ✅ Full | ✅ Full | ❌ | ❌ |
| Billing | ✅ Full | ✅ View | ✅ Full | ❌ |
| Pharmacy / Stock | ✅ Full | ❌ | ❌ | ✅ Full |
| Vouchers / Accounts | ✅ Full | ❌ | ❌ | ❌ |
| Reports | ✅ Full | ✅ Own only | ✅ Limited | ✅ Stock only |
| Audit Export | ✅ Full | ❌ | ❌ | ❌ |

Admin can **customise any user's access** beyond these defaults — e.g., give a specific receptionist billing rights, or restrict a doctor from viewing financial reports.

---

### 2.5 Cross-Company Access Example

```
Dr. Sharma (tenant / owner)
  → Access to: ABC Vets ✅ | BCD Hospital ✅ | XYZ PetCare ✅
  → Role in all: Admin

Dr. Mehta (employee)
  → Access to: ABC Vets ✅ | BCD Hospital ✅ | XYZ PetCare ❌
  → Role in ABC: Doctor
  → Role in BCD: Admin (manages that branch)

Receptionist Priya
  → Access to: ABC Vets ✅ only
  → Role: Receptionist
  → Cannot see BCD or XYZ even if she knows the URL
```

---

### 2.6 Backend Enforcement (Every API Call)

The JWT token is not just for login. Every API call is validated:

```python
# FastAPI dependency — runs before every protected route
def verify_access(module: str, action: str, token: JWT):
    user_id = token.user_id
    company_id = token.company_id

    # Check company access
    access = db.query(UserCompanyAccess).filter_by(
        user_id=user_id,
        company_id=company_id,
        is_active=True
    ).first()
    if not access:
        raise HTTPException(403, "No access to this company")

    # Check module access
    module_access = db.query(UserModuleAccess).filter_by(
        user_id=user_id,
        company_id=company_id,
        module_code=module
    ).first()
    if not module_access or not getattr(module_access, f"can_{action}"):
        raise HTTPException(403, f"No {action} access to {module}")
```

Even if someone manually calls the API, they cannot access data they are not permitted to.

---

## PHASE 3: PET BOOK

### 3.1 What the Pet Book Is

The Pet Book is the **complete lifetime medical record of every pet**. It lives in the company DB and is never split by financial year. A dog registered in 2022 has all its records in one place — visible to any doctor, any year.

---

### 3.2 Schema — 10 Tables

All tables below are inside each company DB (e.g., `abc_clinic`).

#### Table 1: pets

```sql
CREATE TABLE pets (
    pet_id          SERIAL PRIMARY KEY,
    pet_name        VARCHAR(100) NOT NULL,
    species         VARCHAR(50) NOT NULL,       -- Dog, Cat, Bird, Rabbit
    breed           VARCHAR(100),
    date_of_birth   DATE,
    age_years       SMALLINT,                   -- fallback if DOB unknown
    sex             VARCHAR(10) NOT NULL,        -- Male, Female
    colour          VARCHAR(50),
    photo_url       TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
    -- NO fy_id — pets are permanent
);
```

#### Table 2: pet_owners

```sql
CREATE TABLE pet_owners (
    owner_id        SERIAL PRIMARY KEY,
    pet_id          INTEGER REFERENCES pets(pet_id),
    owner_name      VARCHAR(150) NOT NULL,
    phone           VARCHAR(15) NOT NULL,
    alternate_phone VARCHAR(15),
    email           VARCHAR(100),
    address         TEXT,
    is_primary      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Table 3: pet_clinical_summary (Permanent Flags — Shown at Top of Pet Book)

```sql
CREATE TABLE pet_clinical_summary (
    summary_id          SERIAL PRIMARY KEY,
    pet_id              INTEGER UNIQUE REFERENCES pets(pet_id),
    blood_group         VARCHAR(20),
    is_spayed_neutered  BOOLEAN DEFAULT FALSE,
    spay_neuter_date    DATE,
    microchip_no        VARCHAR(50),
    warning_flags       TEXT[],                 -- ['AGGRESSIVE','EPILEPTIC','DIABETIC']
    lifestyle_notes     TEXT,                   -- Indoor, farm, street rescue
    diet_notes          TEXT,                   -- e.g., Royal Canin Renal
    insurance_provider  VARCHAR(100),           -- text field only, no billing logic
    insurance_policy_no VARCHAR(100)
);
```

#### Table 4: pet_allergies

```sql
CREATE TABLE pet_allergies (
    allergy_id      SERIAL PRIMARY KEY,
    pet_id          INTEGER REFERENCES pets(pet_id),
    allergen        VARCHAR(150) NOT NULL,      -- Penicillin, Beef, Latex
    reaction_type   VARCHAR(100),               -- Hives, Anaphylaxis, GI Upset
    severity        VARCHAR(20),                -- Mild, Moderate, Severe, Life-Threatening
    discovered_date DATE,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE
);
```

#### Table 5: pet_visits (Consultations)

```sql
CREATE TABLE pet_visits (
    visit_id        SERIAL PRIMARY KEY,
    pet_id          INTEGER REFERENCES pets(pet_id),
    visit_date      TIMESTAMP NOT NULL DEFAULT NOW(),
    visit_type      VARCHAR(50),                -- OPD, Emergency, Follow-up, Surgery
    chief_complaint TEXT,
    diagnosis       TEXT,
    treatment_notes TEXT,
    doctor_id       INTEGER,                    -- user_id of attending doctor
    follow_up_date  DATE,
    created_at      TIMESTAMP DEFAULT NOW()
    -- NO fy_id — full clinical history must be visible across years
);
```

#### Table 6: pet_prescriptions

```sql
CREATE TABLE pet_prescriptions (
    rx_id           SERIAL PRIMARY KEY,
    visit_id        INTEGER REFERENCES pet_visits(visit_id),
    pet_id          INTEGER REFERENCES pets(pet_id),
    medicine_name   VARCHAR(200) NOT NULL,
    dosage          VARCHAR(100),               -- 1 tablet twice daily
    duration        VARCHAR(50),               -- 7 days
    route           VARCHAR(50),               -- Oral, IV, SC, Topical
    notes           TEXT,
    prescribed_at   TIMESTAMP DEFAULT NOW()
);
```

#### Table 7: pet_vaccines

```sql
CREATE TABLE pet_vaccines (
    vaccine_id      SERIAL PRIMARY KEY,
    pet_id          INTEGER REFERENCES pets(pet_id),
    vaccine_name    VARCHAR(200) NOT NULL,      -- Rabies, DHPP, Bordetella
    date_given      DATE NOT NULL,
    batch_no        VARCHAR(50),
    manufacturer    VARCHAR(100),
    next_due_date   DATE,
    given_by        INTEGER,                    -- user_id
    notes           TEXT
);
```

#### Table 8: pet_vitals_log

```sql
CREATE TABLE pet_vitals_log (
    vital_id                SERIAL PRIMARY KEY,
    pet_id                  INTEGER REFERENCES pets(pet_id),
    visit_id                INTEGER REFERENCES pet_visits(visit_id),
    recorded_at             TIMESTAMP DEFAULT NOW(),
    weight_kg               NUMERIC(6,2),
    temperature_celsius     NUMERIC(4,1),
    heart_rate              SMALLINT,
    resp_rate               SMALLINT,
    body_condition_score    SMALLINT            -- 1-9 scale; 5 = ideal
);
```

#### Table 9: pet_lab_records

```sql
CREATE TABLE pet_lab_records (
    lab_id          SERIAL PRIMARY KEY,
    pet_id          INTEGER REFERENCES pets(pet_id),
    visit_id        INTEGER REFERENCES pet_visits(visit_id),
    test_name       VARCHAR(200) NOT NULL,      -- CBC, Biochemistry, X-Ray, Urinalysis
    test_category   VARCHAR(50),               -- Blood, Urine, Stool, Imaging
    sample_date     DATE NOT NULL,
    result_summary  TEXT,                       -- Doctor's interpretation
    attachment_url  TEXT,                       -- Uploaded PDF or image URL
    lab_name        VARCHAR(100),              -- In-house or External Lab name
    created_at      TIMESTAMP DEFAULT NOW()
);
```

#### Table 10: pet_timeline_events (Unified Timeline Index)

```sql
-- High-performance index for the Pet Book timeline.
-- Avoids joining 9 tables on every page load.
-- Auto-populated by backend listeners when records are inserted.

CREATE TABLE pet_timeline_events (
    event_id        SERIAL PRIMARY KEY,
    pet_id          INTEGER REFERENCES pets(pet_id),
    event_date      TIMESTAMP NOT NULL,
    event_type      VARCHAR(50) NOT NULL,       -- VISIT, VACCINE, LAB, PRESCRIPTION
    ref_id          INTEGER NOT NULL,           -- ID of the source record
    title           VARCHAR(200) NOT NULL,      -- 'Rabies Vaccine - Annual Booster'
    summary         TEXT,                       -- Short text for timeline card
    doctor_id       INTEGER
);
```

---

### 3.3 What Was Intentionally Left Out (V2)

| Feature | Reason Deferred |
| :--- | :--- |
| Reproductive / heat cycle tracking | Breeder-specific; not needed for general clinic |
| Insurance claim / billing logic | Store provider name only; full logic in v2 |
| DICOM / X-Ray viewer | Store file URL only; viewer is separate integration |
| Multi-branch routing | Add when clinic has 2+ physical locations |

---

### 3.4 Pet Book UI Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🐕  TOMMY   Golden Retriever  |  Male  |  4 yrs  |  Owner: John Doe │
│ 📞 9876543210                                                        │
│ ⚠️  PENICILLIN ALLERGY    🔴  AGGRESSIVE — USE MUZZLE               │
├─────────────────────┬───────────────────────────┬────────────────────┤
│  Navigation         │  Chronological Timeline   │  Weight Trend      │
│                     │                           │  📈 Recharts graph │
│  ➔ Timeline         │  Filter: [Visits] [Vacc]  │  Current: 28 kg    │
│  ➔ Vitals & Weight  │  [Labs] [Prescriptions]   │                    │
│  ➔ Vaccines (1 Due) │                           │  💉 Due Soon       │
│  ➔ Prescriptions    │  ● TODAY — OPD Visit      │  Rabies — 12 Jun   │
│  ➔ Lab Reports      │    Dr. Mehta              │                    │
│  ➔ Files & Docs     │    Ear Infection          │                    │
│                     │    Rx: Otomax Drops       │                    │
│  [Export Passport]  │  ● 10 JAN — Dental Scale  │                    │
│                     │  ● 05 NOV — CBC (PDF)     │                    │
└─────────────────────┴───────────────────────────┴────────────────────┘
```

**UI Rules:**
- Warning flags and allergies are **always visible at top** — cannot be hidden or collapsed
- Timeline is filterable by event type
- Weight chart shows all recorded readings over lifetime
- Upcoming vaccine due dates shown in right sidebar
- Export Passport generates a clean owner-facing PDF

---

### 3.5 Pet Passport PDF (Export for Owner)

| Page | Content |
| :--- | :--- |
| Page 1 | Pet photo, name, breed, DOB, owner contact, microchip, warning flags, known allergies |
| Page 2 | Complete vaccine history — name, date, batch, next due date |
| Page 3+ | Visit history with diagnosis and prescriptions, lab result summaries |

---

## PART 4: SUMMARY OF ALL DECISIONS

| Topic | Decision |
| :--- | :--- |
| Master DB | `pet_erp_master` — 4th DB, always on, checked at every login |
| Company details | Stored in `company_profiles` in master DB. Fetched once at login, cached in JWT |
| Company DBs | One per company. Max 3 per tenant. Identical schema. |
| New company creation | Auto-creates DB + runs Alembic migrations + seeds default roles |
| FY separation | `fy_id` column on financial tables only. Clinical tables have no FY. |
| Year-end process | One button — locks old FY, carries forward balances, opens new FY |
| Auditor access | Export only (Excel/PDF filtered by FY). No DB access ever. |
| Login flow | Master DB → company selector → JWT with company + FY + modules |
| Role-based access | Per user, per company, per module. View/Create/Edit/Delete/Export |
| Default roles | Admin, Doctor, Receptionist, Pharmacist — auto-created per company |
| Cross-company | Same user can have different roles in different companies |
| Pet Book tables | 10 tables. Permanent. No FY column. Full lifetime history. |
| Pet Book extras | Reproductive tracking, DICOM viewer, insurance billing → V2 |

---

## PART 5: BUILD ORDER

```
PHASE 1 — Company Creation
  ├── pet_erp_master DB setup
  ├── company_profiles table
  ├── Alembic migration files (full company DB schema)
  ├── "Add Company" API → creates DB + runs migrations
  └── Company profile edit screen (address, GST, logo, etc.)

PHASE 2 — Role-Based Login
  ├── users, roles, user_company_access, user_module_access tables
  ├── Login API → verify → company selector → JWT
  ├── Module access middleware (backend enforcement)
  ├── Frontend: render nav based on allowed_modules in JWT
  └── Admin screen: manage users, assign roles, set module access

PHASE 3 — Pet Book
  ├── All 10 pet tables (schema + Alembic migration)
  ├── Pet registration form (pet + owner + clinical summary)
  ├── Visit recording (complaint, diagnosis, treatment)
  ├── Prescription writer
  ├── Vaccine tracker with due date alerts
  ├── Vitals log + weight chart (Recharts)
  ├── Lab report upload + attachment viewer
  ├── Timeline view (pet_timeline_events, auto-populated)
  └── Pet Passport PDF export
```
