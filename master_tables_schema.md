# Pet ERP — Master Tables: Complete Field Schema
*All masters updated with address, GST, and financial fields | April 2026*

---

## 📋 Design Rules (Read Before Building)

1. **Address is always 3 lines** — add1 (street/building), add2 (area/locality), add3 (landmark) — all optional except add1
2. **State code is mandatory for GST** — CGST/SGST applies if party state = clinic state; IGST if different
3. **GL account auto-created** on saving any new Owner, Supplier, Doctor, Staff, Agent — never manually
4. **Opening balance entered once** at system go-live — after first transaction, it becomes read-only
5. **GSTIN format**: 2-digit state code + 10-digit PAN + 1 digit + Z + 1 check digit (15 chars total) — validate on input
6. **All masters use soft delete** except City (hard delete) — is_active flag

---

## 🗄️ MIGRATION SCRIPT — Run First

```sql
-- database/migration_v4.sql
-- Run in order. Verify each section with \d <tablename> before proceeding.

-- ============================================================
-- 1. CLINIC SETUP — add address + GST fields
-- ============================================================
ALTER TABLE clinic_setup
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS alt_phone       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS drug_license_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS fy_start_month  SMALLINT DEFAULT 4;
-- Note: gstin, phone likely already exist — check before adding

-- ============================================================
-- 2. GL MASTER — full schema (drop and recreate if currently empty)
-- ============================================================
-- Check first: SELECT COUNT(*) FROM gl_master;
-- If 0 rows → safe to drop and recreate with full schema
-- If has rows → use ALTER TABLE ADD COLUMN approach below

CREATE TABLE IF NOT EXISTS gl_master (
    gl_id           SERIAL PRIMARY KEY,
    gl_code         VARCHAR(30) UNIQUE NOT NULL,
    gl_name         VARCHAR(200) NOT NULL,
    group_name      VARCHAR(50) NOT NULL,
    -- Groups: Debtors | Creditors | Cash | Bank | Income | Expense | Capital | Duties & Taxes
    sub_group       VARCHAR(50),
    -- Sub-groups: Current Assets | Fixed Assets | Current Liabilities | Capital Account |
    --             Service Income | Sales Income | Direct Expense | Indirect Expense | Tax Liabilities

    -- Contact
    phone           VARCHAR(20),
    alt_phone       VARCHAR(20),
    email           VARCHAR(100),

    -- Address
    address1        TEXT,
    address2        TEXT,
    address3        TEXT,
    city_id         INT REFERENCES cities(city_id) ON DELETE SET NULL,
    district        VARCHAR(100),
    state_name      VARCHAR(100),
    state_code      VARCHAR(5),     -- e.g. '29' Karnataka, '27' Maharashtra, '36' Telangana
    pincode         VARCHAR(10),

    -- Tax & Compliance
    gstin           VARCHAR(20),
    pan             VARCHAR(10),

    -- Financial
    opening_balance NUMERIC(14,2) DEFAULT 0,
    balance_type    VARCHAR(2) DEFAULT 'DR',    -- DR | CR
    discount_pct    NUMERIC(5,2) DEFAULT 0,     -- default trade discount %

    -- Links
    agent_id        INT REFERENCES agents(agent_id) ON DELETE SET NULL,

    -- Control
    is_system       BOOLEAN DEFAULT FALSE,      -- TRUE = cannot be edited/deleted by user
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT now(),
    updated_at      TIMESTAMP DEFAULT now()
);

-- If table already exists with data, add missing columns:
ALTER TABLE gl_master
    ADD COLUMN IF NOT EXISTS phone           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS alt_phone       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gstin           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS discount_pct    NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS agent_id        INT REFERENCES agents(agent_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMP DEFAULT now();

-- ============================================================
-- 3. PET OWNERS — add address + GST + GL link fields
-- ============================================================
ALTER TABLE pet_owners
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS alt_phone       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS gstin           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS discount_pct    NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;
-- Note: opening_balance, balance_type, phone, city_id likely already exist — verify

-- ============================================================
-- 4. SUPPLIERS — add missing fields + GL link
-- ============================================================
ALTER TABLE suppliers
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS alt_phone       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS drug_license_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS payment_terms   INT DEFAULT 30,
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;
-- Note: gstin, opening_balance, balance_type likely already exist — verify

-- ============================================================
-- 5. DOCTORS — add address + GL link fields
-- ============================================================
ALTER TABLE doctors
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS alt_phone       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;
-- Note: doj, salary, salary_type, opening_balance, balance_type added in migration_v3

-- ============================================================
-- 6. STAFF — add address + GL link fields
-- ============================================================
ALTER TABLE staff
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS alt_phone       VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;
-- Note: opening_balance, balance_type added in migration_v3

-- ============================================================
-- 7. AGENTS — add missing fields + GL link (if table exists from v3)
-- ============================================================
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS address1        TEXT,
    ADD COLUMN IF NOT EXISTS address2        TEXT,
    ADD COLUMN IF NOT EXISTS address3        TEXT,
    ADD COLUMN IF NOT EXISTS district        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_name      VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state_code      VARCHAR(5),
    ADD COLUMN IF NOT EXISTS pincode         VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gstin           VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pan             VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gl_account_id   INT REFERENCES gl_master(gl_id) ON DELETE SET NULL;
-- Note: commission_type, commission_rate, opening_balance, balance_type in create script

-- ============================================================
-- 8. SYSTEM GL ACCOUNTS SEED — insert defaults
-- ============================================================
INSERT INTO gl_master (gl_code, gl_name, group_name, sub_group, is_system, balance_type) VALUES
('CASH',       'Cash in Hand',              'Cash',             'Cash',                TRUE, 'DR'),
('BANK',       'Bank Account',              'Bank',             'Bank',                TRUE, 'DR'),
('DEBTOR',     'Sundry Debtors',            'Debtors',          'Current Assets',      TRUE, 'DR'),
('CREDITOR',   'Sundry Creditors',          'Creditors',        'Current Liabilities', TRUE, 'CR'),
('CONSULT_INC','Consultation Income',       'Income',           'Service Income',      TRUE, 'CR'),
('PHARMA_SALE','Pharmacy Sales',            'Income',           'Sales Income',        TRUE, 'CR'),
('PROC_INC',   'Procedure Income',          'Income',           'Service Income',      TRUE, 'CR'),
('MED_PURCH',  'Medicine Purchase',         'Expense',          'Direct Expense',      TRUE, 'DR'),
('SALARY_EXP', 'Salary & Wages',            'Expense',          'Indirect Expense',    TRUE, 'DR'),
('CGST_PAY',   'CGST Payable',              'Duties & Taxes',   'Tax Liabilities',     TRUE, 'CR'),
('SGST_PAY',   'SGST Payable',              'Duties & Taxes',   'Tax Liabilities',     TRUE, 'CR'),
('IGST_PAY',   'IGST Payable',              'Duties & Taxes',   'Tax Liabilities',     TRUE, 'CR'),
('CGST_INPUT', 'CGST Input Credit',         'Duties & Taxes',   'Current Assets',      TRUE, 'DR'),
('SGST_INPUT', 'SGST Input Credit',         'Duties & Taxes',   'Current Assets',      TRUE, 'DR'),
('IGST_INPUT', 'IGST Input Credit',         'Duties & Taxes',   'Current Assets',      TRUE, 'DR'),
('DISC_ALLOW', 'Discount Allowed',          'Expense',          'Indirect Expense',    TRUE, 'DR'),
('COMM_EXP',   'Agent Commission',          'Expense',          'Indirect Expense',    TRUE, 'DR'),
('CAPITAL',    'Owner Capital',             'Capital',          'Capital Account',     TRUE, 'CR'),
('RETAIN',     'Retained Earnings',         'Capital',          'Capital Account',     TRUE, 'CR')
ON CONFLICT (gl_code) DO NOTHING;

-- VERIFY:
-- \d clinic_setup   → check all new columns
-- \d gl_master      → should show all address + tax + financial columns
-- \d pet_owners     → check address1, state_code, gl_account_id
-- \d suppliers      → check all columns
-- \d doctors        → check address, pan, gl_account_id
-- \d staff          → check address, pan, gl_account_id
-- \d agents         → check all columns
-- SELECT COUNT(*) FROM gl_master;  → should show 19 system accounts
```

---

## 🐍 BACKEND — SQLAlchemy Models

---

### `models/clinic.py` — Full Updated Model

```python
class ClinicSetup(Base):
    __tablename__ = "clinic_setup"

    clinic_id        = Column(Integer, primary_key=True)
    clinic_name      = Column(String(200), nullable=False)

    # Address
    address1         = Column(Text)
    address2         = Column(Text)
    address3         = Column(Text)
    city_id          = Column(Integer, ForeignKey("cities.city_id"))
    district         = Column(String(100))
    state_name       = Column(String(100))
    state_code       = Column(String(5))       # '36' = Telangana
    pincode          = Column(String(10))

    # Contact
    phone            = Column(String(20))
    alt_phone        = Column(String(20))
    email            = Column(String(100))

    # Tax & Compliance
    gstin            = Column(String(20))
    pan              = Column(String(10))
    drug_license_no  = Column(String(50))

    # Financial Year
    fy_start_month   = Column(SmallInteger, default=4)  # 4 = April

    # Logo
    logo_url         = Column(Text)

    created_at       = Column(DateTime, default=func.now())
    updated_at       = Column(DateTime, default=func.now(), onupdate=func.now())
```

---

### `models/gl_master.py` — Full Model

```python
class GLMaster(Base):
    __tablename__ = "gl_master"

    gl_id            = Column(Integer, primary_key=True)
    gl_code          = Column(String(30), unique=True, nullable=False)
    gl_name          = Column(String(200), nullable=False)
    group_name       = Column(String(50), nullable=False)
    sub_group        = Column(String(50))

    # Contact
    phone            = Column(String(20))
    alt_phone        = Column(String(20))
    email            = Column(String(100))

    # Address
    address1         = Column(Text)
    address2         = Column(Text)
    address3         = Column(Text)
    city_id          = Column(Integer, ForeignKey("cities.city_id"))
    district         = Column(String(100))
    state_name       = Column(String(100))
    state_code       = Column(String(5))
    pincode          = Column(String(10))

    # Tax & Compliance
    gstin            = Column(String(20))
    pan              = Column(String(10))

    # Financial
    opening_balance  = Column(Numeric(14,2), default=0)
    balance_type     = Column(String(2), default='DR')   # DR | CR
    discount_pct     = Column(Numeric(5,2), default=0)

    # Links
    agent_id         = Column(Integer, ForeignKey("agents.agent_id"))

    # Control
    is_system        = Column(Boolean, default=False)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=func.now())
    updated_at       = Column(DateTime, default=func.now(), onupdate=func.now())

    city             = relationship("City")
    agent            = relationship("Agent")
```

---

### `models/people.py` — Pet Owner Updated Model

```python
class PetOwner(Base):
    __tablename__ = "pet_owners"

    owner_id         = Column(Integer, primary_key=True)
    owner_code       = Column(String(30), unique=True, nullable=False)  # OWN0001
    name             = Column(String(200), nullable=False)

    # Contact
    phone            = Column(String(20))
    alt_phone        = Column(String(20))
    email            = Column(String(100))

    # Address
    address1         = Column(Text)
    address2         = Column(Text)
    address3         = Column(Text)
    city_id          = Column(Integer, ForeignKey("cities.city_id"))
    district         = Column(String(100))
    state_name       = Column(String(100))
    state_code       = Column(String(5))
    pincode          = Column(String(10))

    # Tax
    gstin            = Column(String(20))   # for B2B GST invoices
    pan              = Column(String(10))

    # Financial
    opening_balance  = Column(Numeric(12,2), default=0)
    balance_type     = Column(String(2), default='DR')   # DR = owner owes clinic
    discount_pct     = Column(Numeric(5,2), default=0)

    # GL Link — auto-created on save
    gl_account_id    = Column(Integer, ForeignKey("gl_master.gl_id"))

    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=func.now())
    updated_at       = Column(DateTime, default=func.now(), onupdate=func.now())

    city             = relationship("City")
    gl_account       = relationship("GLMaster")
    pets             = relationship("Pet", back_populates="owner")
```

---

### `models/masters.py` — Supplier Updated Model

```python
class Supplier(Base):
    __tablename__ = "suppliers"

    supplier_id      = Column(Integer, primary_key=True)
    supplier_code    = Column(String(30), unique=True, nullable=False)  # SUPP0001
    name             = Column(String(200), nullable=False)

    # Contact
    phone            = Column(String(20))
    alt_phone        = Column(String(20))
    email            = Column(String(100))

    # Address
    address1         = Column(Text)
    address2         = Column(Text)
    address3         = Column(Text)
    city_id          = Column(Integer, ForeignKey("cities.city_id"))
    district         = Column(String(100))
    state_name       = Column(String(100))
    state_code       = Column(String(5))
    pincode          = Column(String(10))

    # Tax & Compliance
    gstin            = Column(String(20))
    pan              = Column(String(10))
    drug_license_no  = Column(String(50))

    # Financial
    opening_balance  = Column(Numeric(12,2), default=0)
    balance_type     = Column(String(2), default='CR')   # CR = we owe supplier
    payment_terms    = Column(Integer, default=30)        # credit days

    # GL Link
    gl_account_id    = Column(Integer, ForeignKey("gl_master.gl_id"))

    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=func.now())
    updated_at       = Column(DateTime, default=func.now(), onupdate=func.now())

    city             = relationship("City")
    gl_account       = relationship("GLMaster")
```

---

### `models/doctors.py` — Doctor Updated Model

```python
class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id        = Column(Integer, primary_key=True)
    doctor_code      = Column(String(30), unique=True, nullable=False)  # DOC0001
    name             = Column(String(200), nullable=False)
    qualification    = Column(String(100))
    reg_number       = Column(String(50))
    specialization   = Column(String(100))
    consultation_fee = Column(Numeric(10,2), default=0)

    # Contact
    phone            = Column(String(20))
    alt_phone        = Column(String(20))
    email            = Column(String(100))

    # Address
    address1         = Column(Text)
    address2         = Column(Text)
    city_id          = Column(Integer, ForeignKey("cities.city_id"))
    district         = Column(String(100))
    state_name       = Column(String(100))
    state_code       = Column(String(5))
    pincode          = Column(String(10))

    # Tax
    pan              = Column(String(10))

    # HR
    doj              = Column(Date)
    salary           = Column(Numeric(10,2), default=0)
    salary_type      = Column(String(30), default='Fixed')
    # salary_type: Fixed | Per Consultation | Revenue Share

    # Financial
    opening_balance  = Column(Numeric(12,2), default=0)
    balance_type     = Column(String(2), default='CR')   # CR = clinic owes doctor

    # GL Link
    gl_account_id    = Column(Integer, ForeignKey("gl_master.gl_id"))

    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=func.now())
    updated_at       = Column(DateTime, default=func.now(), onupdate=func.now())

    city             = relationship("City")
    gl_account       = relationship("GLMaster")
```

---

### `models/staff.py` — Staff Updated Model

```python
class Staff(Base):
    __tablename__ = "staff"

    staff_id         = Column(Integer, primary_key=True)
    staff_code       = Column(String(30), unique=True, nullable=False)  # STF0001
    name             = Column(String(200), nullable=False)
    role             = Column(String(50))
    # role: Receptionist | Nurse | Pharmacist | Lab Technician | Groomer | Admin

    # Contact
    phone            = Column(String(20))
    alt_phone        = Column(String(20))
    email            = Column(String(100))

    # Address
    address1         = Column(Text)
    address2         = Column(Text)
    city_id          = Column(Integer, ForeignKey("cities.city_id"))
    district         = Column(String(100))
    state_name       = Column(String(100))
    state_code       = Column(String(5))
    pincode          = Column(String(10))

    # Tax
    pan              = Column(String(10))

    # HR
    doj              = Column(Date)
    salary           = Column(Numeric(10,2), default=0)

    # Financial
    opening_balance  = Column(Numeric(12,2), default=0)
    balance_type     = Column(String(2), default='CR')   # CR = clinic owes staff

    # GL Link
    gl_account_id    = Column(Integer, ForeignKey("gl_master.gl_id"))

    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=func.now())
    updated_at       = Column(DateTime, default=func.now(), onupdate=func.now())

    city             = relationship("City")
    gl_account       = relationship("GLMaster")
```

---

## ⚡ AUTO GL ACCOUNT CREATION — Backend Logic

This is critical. Every time a new Owner, Supplier, Doctor, Staff, or Agent is saved, the system must auto-create a GL account. Add this as a shared utility function.

**New file:** `backend/utils/gl_utils.py`

```python
from models.gl_master import GLMaster
from utils.code_gen import get_next_code

GL_GROUP_MAP = {
    "owner":    ("Debtors",   "Current Assets",       "DR"),
    "supplier": ("Creditors", "Current Liabilities",  "CR"),
    "doctor":   ("Expense",   "Indirect Expense",     "CR"),
    "staff":    ("Expense",   "Indirect Expense",     "CR"),
    "agent":    ("Expense",   "Indirect Expense",     "CR"),
}

def create_gl_account(entity_type: str, name: str, db, **kwargs) -> int:
    """
    Auto-creates a GL account for any new master entity.
    Returns gl_id of the created account.
    
    entity_type: 'owner' | 'supplier' | 'doctor' | 'staff' | 'agent'
    kwargs: phone, email, address1, address2, address3,
            city_id, district, state_name, state_code, pincode,
            gstin, pan, opening_balance, balance_type, discount_pct
    """
    group, sub_group, default_bt = GL_GROUP_MAP[entity_type]
    
    gl_code = get_next_code(entity_type.upper() + "_GL", db)
    
    gl = GLMaster(
        gl_code         = gl_code,
        gl_name         = name,
        group_name      = group,
        sub_group       = sub_group,
        balance_type    = kwargs.get("balance_type", default_bt),
        opening_balance = kwargs.get("opening_balance", 0),
        phone           = kwargs.get("phone"),
        alt_phone       = kwargs.get("alt_phone"),
        email           = kwargs.get("email"),
        address1        = kwargs.get("address1"),
        address2        = kwargs.get("address2"),
        address3        = kwargs.get("address3"),
        city_id         = kwargs.get("city_id"),
        district        = kwargs.get("district"),
        state_name      = kwargs.get("state_name"),
        state_code      = kwargs.get("state_code"),
        pincode         = kwargs.get("pincode"),
        gstin           = kwargs.get("gstin"),
        pan             = kwargs.get("pan"),
        discount_pct    = kwargs.get("discount_pct", 0),
        is_system       = False,
        is_active       = True
    )
    db.add(gl)
    db.flush()   # get gl_id without committing
    return gl.gl_id


# USAGE in routes/owners.py:
# @router.post("/owners")
# def create_owner(data: OwnerCreate, db: Session = Depends(get_db)):
#     gl_id = create_gl_account("owner", data.name, db, **data.dict())
#     owner = PetOwner(**data.dict(), owner_code=get_next_code("OWNER", db), gl_account_id=gl_id)
#     db.add(owner)
#     db.commit()
```

> ⚠️ **Important for Antigravity:** Use `db.flush()` not `db.commit()` when creating the GL account inside the same transaction as the owner/supplier/doctor. This ensures both are committed together — if one fails, neither saves.

---

## 🖥️ FRONTEND — Form Layout Guide

---

### Standard Address Block (reuse across ALL forms)

Use this exact section layout in every Add/Edit modal that has address fields:

```
--- Contact ---
Phone*          Alt Phone
Email

--- Address ---
Address Line 1*
Address Line 2
Address Line 3 (Landmark)
City (dropdown) District
State Name      State Code    Pincode

--- Tax Information ---
GSTIN           PAN
```

> Build this as a reusable React component: `<AddressBlock />` — pass field values and onChange handlers as props. Don't repeat this HTML in every form.

---

### Indian State Codes — Dropdown Data

Add this as a constant in `frontend/src/constants/states.js`:

```javascript
export const INDIAN_STATES = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "28", name: "Andhra Pradesh" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh (new)" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
  { code: "99", name: "Centre Jurisdiction" }
];
```

**State Name + Code should be linked** — when user selects state from dropdown, state_code auto-fills. Do not make them type state_code manually.

---

### GSTIN Validation

Add this validator in `frontend/src/utils/validators.js`:

```javascript
export const validateGSTIN = (gstin) => {
  if (!gstin) return true; // optional field
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.toUpperCase());
};
// Show error: "Invalid GSTIN format" if validation fails on blur
```

---

## ✅ Completion Checklist — All Masters

### Clinic Setup
- [ ] All address fields save and reload correctly
- [ ] State dropdown auto-fills state_code when state selected
- [ ] GSTIN validates on blur (15 chars, correct format)
- [ ] FY Start Month defaults to April (4)
- [ ] Drug License No field present

### GL Master
- [ ] 19 system accounts seeded and visible
- [ ] System accounts show lock icon — no edit/delete buttons
- [ ] New GL accounts can be added with full address + tax fields
- [ ] Filter by group_name works (Assets / Liabilities / Income / Expense / Duties & Taxes)
- [ ] Opening balance and balance_type save correctly

### Pet Owners
- [ ] All address fields in Add/Edit modal
- [ ] State dropdown auto-fills state_code
- [ ] GSTIN field present (for B2B clients)
- [ ] Saving a new owner auto-creates a GL account row
- [ ] `gl_account_id` stored in pet_owners after save
- [ ] Discount % field present

### Suppliers
- [ ] All address fields in form
- [ ] GSTIN, PAN, Drug License No, Payment Terms all save
- [ ] Saving auto-creates GL account
- [ ] Opening balance + balance_type (CR default) present

### Doctors
- [ ] Address (2 lines), city, district, state, pincode, PAN in form
- [ ] DOJ, Salary, Salary Type in form
- [ ] Opening balance + balance_type (CR default — clinic owes doctor) in form
- [ ] Saving auto-creates GL account

### Staff
- [ ] Same as doctors except no reg_number or salary_type
- [ ] Saving auto-creates GL account

### Agents (if built in Sprint 4)
- [ ] Full address including address3
- [ ] GSTIN (if GST registered agent), PAN
- [ ] Commission type + rate
- [ ] Opening balance + balance_type
- [ ] Saving auto-creates GL account

### Cross-cutting
- [ ] `<AddressBlock />` is a shared reusable component — not repeated in every form
- [ ] `INDIAN_STATES` constant used in all state dropdowns
- [ ] GSTIN validator applied in all forms that have GSTIN field
- [ ] State code auto-fills when state selected everywhere

---

## 🔜 What This Unlocks (Stage 3+)

Once all masters have correct state_code:

- **Billing** can auto-determine CGST+SGST vs IGST based on:
  `clinic.state_code === owner.state_code → intra-state → CGST+SGST`
  `clinic.state_code !== owner.state_code → inter-state → IGST`

- **GST Invoice PDF** can pull party address + GSTIN directly from owner/supplier master

- **GSTR-1** report can correctly bucket B2B (owner has GSTIN) vs B2C (no GSTIN) transactions

- **Supplier purchase bills** can split input CGST/SGST or IGST correctly

- **GL reports** will show correct party ledger with all contact info

---

*Pet Clinic ERP — Master Tables Complete Field Schema | April 2026*
