# 🐾 Pet Clinic ERP — Phase 2, 3 & 4 Build Plan
**For Antigravity | April 2026**

---

## 🔗 The Master Patient Journey Chain

Every module, table, and API in these three phases exists to serve this single chain.
Nothing gets built that doesn't connect to it.

```
[PHASE 2]
Owner calls → APPOINTMENT booked
Owner arrives → CHECK-IN → Consultation created automatically
Doctor sees pet → CONSULTATION (vitals, complaint, diagnosis, procedures)
Doctor prescribes → PRESCRIPTION (medicines, dosage, duration)
Vaccine given → VACCINATION RECORD → next due date calculated
Visit closes → BILLING STUB created (consultation fee auto-filled)
              → PET DIARY PDF generated (owner takes home)

[PHASE 3]
Pharmacist opens prescription → DISPENSING SCREEN (medicines pre-filled from Rx)
Pharmacist confirms quantities → PHARMACY BILL (stock auto-deducted)
Medicines purchased from vendor → PURCHASE BILL → STOCK added
                                                 → BATCH & EXPIRY tracked

[PHASE 4]
Receptionist opens billing → CONSOLIDATED BILL (consult fee + pharmacy bill merged)
Payment collected → RECEIPT VOUCHER → accounts updated
GST invoice generated → PRINT / PDF
Cash/bank entries → CASH BOOK, BANK BOOK, GENERAL LEDGER
```

---

## 🗄️ COMPLETE TABLE RELATIONSHIP MAP

```
clinic_setup (1)
    └── used as header in all PDFs

users (1)
    ├── linked to doctors.doctor_id (if role = doctor)
    └── linked to staff.staff_id (if role = staff)

cities (M) ── pet_owners.city_id

species (M) ── breeds.species_id
species (M) ── vaccines.species_id         ← Phase 2

pet_owners (M) ── pets.owner_id
pet_owners (M) ── appointments.owner_id   ← Phase 2
pet_owners (M) ── billing_master.owner_id ← Phase 4

pets (M) ── appointments.pet_id           ← Phase 2
pets (M) ── consultations.pet_id          ← Phase 2
pets (M) ── vaccination_records.pet_id    ← Phase 2
pets (M) ── billing_master.pet_id         ← Phase 4

doctors (M) ── appointments.doctor_id     ← Phase 2
doctors (M) ── consultations.doctor_id    ← Phase 2
doctors (M) ── doctor_schedule.doctor_id  ← Phase 2

appointments (1) ── consultations.appointment_id   ← Phase 2 (ONE-TO-ONE after check-in)

consultations (1) ── prescriptions.consult_id      ← Phase 2 (ONE-TO-ONE)
consultations (M) ── consultation_procedures.consult_id ← Phase 2
consultations (1) ── billing_master.consult_id     ← Phase 4

prescriptions (1) ── prescription_items.prescription_id  ← Phase 2 (ONE-TO-MANY)
prescription_items.medicine_id ── medicines.medicine_id  ← Phase 3

vaccination_records (M) ── vaccines.vaccine_id     ← Phase 2
vaccination_records (1) ── vaccination_reminders.vacc_record_id ← Phase 2

medicines (M) ── medicine_batches.medicine_id      ← Phase 3
medicines (M) ── stock_ledger.medicine_id          ← Phase 3
medicines (M) ── prescription_items.medicine_id    ← Phase 2+3 (link)

purchase_bills (1) ── purchase_bill_items.bill_id  ← Phase 3
purchase_bill_items ── medicine_batches (batch created on purchase) ← Phase 3
purchase_bill_items ── stock_ledger (stock IN entry)               ← Phase 3

pharmacy_bills (1) ── pharmacy_bill_items.pharmacy_bill_id ← Phase 3
pharmacy_bill_items ── medicine_batches.batch_id            ← Phase 3 (FIFO)
pharmacy_bill_items ── stock_ledger (stock OUT entry)       ← Phase 3
pharmacy_bills.prescription_id ── prescriptions.prescription_id ← Phase 3

billing_master (1) ── billing_items.billing_id      ← Phase 4
billing_master.consult_id    ── consultations
billing_master.pharmacy_bill_id ── pharmacy_bills
billing_master (1) ── receipt_vouchers.billing_id   ← Phase 4

receipt_vouchers ── gl_master (DR: cash/bank, CR: income) ← Phase 4
vouchers ── gl_master.gl_id                                ← Phase 4
```

---

## PHASE 2 — CLINICAL CORE

---

### 📋 New Tables — Phase 2 (10 tables)

---

#### `doctor_schedule`
> Defines which days and times a doctor is available. Used to validate appointment slots.

```sql
CREATE TABLE doctor_schedule (
    schedule_id     SERIAL PRIMARY KEY,
    doctor_id       INTEGER NOT NULL REFERENCES doctors(doctor_id),
    day_of_week     SMALLINT NOT NULL,  -- 0=Mon, 1=Tue ... 6=Sun
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    slot_duration   SMALLINT DEFAULT 15, -- minutes per slot
    is_active       BOOLEAN DEFAULT true
);
```

---

#### `appointments`
> Central booking record. One appointment → one consultation after check-in.

```sql
CREATE TABLE appointments (
    appt_id         SERIAL PRIMARY KEY,
    appt_no         TEXT UNIQUE NOT NULL,       -- APT0001, APT0002...
    appt_date       DATE NOT NULL,
    appt_time       TIME NOT NULL,
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    doctor_id       INTEGER NOT NULL REFERENCES doctors(doctor_id),
    reason          TEXT,
    status          TEXT DEFAULT 'Scheduled',
                    -- Scheduled | Arrived | In-Consultation | Completed | Cancelled | No-Show
    arrived_at      TIMESTAMP,                  -- set on check-in
    consult_id      INTEGER REFERENCES consultations(consult_id), -- filled after check-in
    notes           TEXT,
    booked_by       INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `consultations`
> The core clinical record. Created automatically on check-in from appointment.

```sql
CREATE TABLE consultations (
    consult_id      SERIAL PRIMARY KEY,
    consult_no      TEXT UNIQUE NOT NULL,       -- CON0001, CON0002...
    consult_date    DATE NOT NULL,
    consult_time    TIME NOT NULL,
    appointment_id  INTEGER REFERENCES appointments(appt_id),  -- NULL if walk-in
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    doctor_id       INTEGER NOT NULL REFERENCES doctors(doctor_id),
    visit_type      TEXT DEFAULT 'OPD',         -- OPD | Follow-Up | Emergency | Walk-In
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
    consult_fee     NUMERIC(10,2) DEFAULT 0,    -- copied from doctor.consultation_fee
    status          TEXT DEFAULT 'Open',        -- Open | Closed | Billed
    billing_stub_id INTEGER,                    -- filled when billing stub created (Phase 4)
    closed_at       TIMESTAMP,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `procedures_master`
> Catalogue of procedures a clinic can perform (X-ray, Ultrasound, Wound dressing etc.) with fee.

```sql
CREATE TABLE procedures_master (
    procedure_id    SERIAL PRIMARY KEY,
    procedure_code  TEXT UNIQUE NOT NULL,
    procedure_name  TEXT NOT NULL,
    category        TEXT,           -- Diagnostic | Surgical | Therapeutic | Dental
    fee             NUMERIC(10,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `consultation_procedures`
> Procedures done during a consultation. Many per consult allowed.

```sql
CREATE TABLE consultation_procedures (
    cp_id           SERIAL PRIMARY KEY,
    consult_id      INTEGER NOT NULL REFERENCES consultations(consult_id),
    procedure_id    INTEGER NOT NULL REFERENCES procedures_master(procedure_id),
    quantity        SMALLINT DEFAULT 1,
    fee             NUMERIC(10,2),              -- overrideable per consult
    notes           TEXT
);
```

---

#### `prescriptions`
> One prescription per consultation. Header record.

```sql
CREATE TABLE prescriptions (
    prescription_id SERIAL PRIMARY KEY,
    rx_no           TEXT UNIQUE NOT NULL,       -- RX0001, RX0002...
    rx_date         DATE NOT NULL,
    consult_id      INTEGER NOT NULL REFERENCES consultations(consult_id),
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    doctor_id       INTEGER NOT NULL REFERENCES doctors(doctor_id),
    notes           TEXT,                       -- general instructions (rest, diet etc.)
    dispensed       BOOLEAN DEFAULT false,      -- set TRUE when pharmacy dispenses
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `prescription_items`
> Individual medicine lines within a prescription.

```sql
CREATE TABLE prescription_items (
    rx_item_id      SERIAL PRIMARY KEY,
    prescription_id INTEGER NOT NULL REFERENCES prescriptions(prescription_id),
    medicine_id     INTEGER REFERENCES medicines(medicine_id),  -- NULL until Phase 3 medicine master exists
    medicine_name   TEXT NOT NULL,              -- free-text fallback if medicine not in master yet
    dosage_form     TEXT,                       -- Tablet | Syrup | Injection | Drops | Ointment
    strength        TEXT,                       -- e.g. 250mg, 5ml
    dose            TEXT,                       -- e.g. 1 tablet, 5ml
    frequency       TEXT,                       -- e.g. Twice daily, Every 8 hours
    route           TEXT,                       -- Oral | Topical | IV | IM | SC
    duration_days   SMALLINT,
    instructions    TEXT,                       -- e.g. Give after food
    quantity        NUMERIC(8,2),               -- total quantity to dispense
    dispensed_qty   NUMERIC(8,2) DEFAULT 0      -- filled by pharmacy in Phase 3
);
```

---

#### `vaccines`
> Master list of vaccines. Linked to species. Defines schedule intervals.

```sql
CREATE TABLE vaccines (
    vaccine_id      SERIAL PRIMARY KEY,
    vaccine_code    TEXT UNIQUE NOT NULL,
    vaccine_name    TEXT NOT NULL,
    species_id      INTEGER REFERENCES species(species_id),  -- NULL = applicable to all
    manufacturer    TEXT,
    disease_covered TEXT,                       -- Rabies, Parvovirus, Distemper etc.
    dose_ml         NUMERIC(5,2),
    route           TEXT,                       -- SC | IM | Intranasal
    interval_days   SMALLINT,                   -- days until next dose due
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `vaccination_records`
> Every vaccination event for a pet. Auto-calculates next due date.

```sql
CREATE TABLE vaccination_records (
    vacc_record_id  SERIAL PRIMARY KEY,
    consult_id      INTEGER REFERENCES consultations(consult_id),
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    doctor_id       INTEGER REFERENCES doctors(doctor_id),
    vaccine_id      INTEGER NOT NULL REFERENCES vaccines(vaccine_id),
    given_date      DATE NOT NULL,
    batch_no        TEXT,
    manufacturer    TEXT,
    expiry_date     DATE,
    dose_ml         NUMERIC(5,2),
    next_due_date   DATE,                       -- auto-calculated: given_date + vaccine.interval_days
    site            TEXT,                       -- Left neck, Right thigh etc.
    notes           TEXT,
    given_by        INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `vaccination_reminders`
> Tracks reminder status for each due vaccination. Prevents duplicate alerts.

```sql
CREATE TABLE vaccination_reminders (
    reminder_id     SERIAL PRIMARY KEY,
    vacc_record_id  INTEGER NOT NULL REFERENCES vaccination_records(vacc_record_id),
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    due_date        DATE NOT NULL,
    reminder_status TEXT DEFAULT 'Pending',     -- Pending | Notified | Overdue | Done
    notified_at     TIMESTAMP,
    notified_via    TEXT,                       -- WhatsApp | SMS | In-App
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 📡 Phase 2 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/appointments` | List appointments (filter by date, doctor, status) |
| POST | `/appointments` | Book new appointment |
| PUT | `/appointments/{id}/checkin` | **Check-in** → creates consultation, updates status to Arrived |
| PUT | `/appointments/{id}/status` | Update status (Cancel, No-Show) |
| GET | `/appointments/slots` | Available time slots for a doctor on a date |
| GET | `/doctor-schedule/{doctor_id}` | Get doctor's weekly schedule |
| POST | `/doctor-schedule` | Set doctor availability |
| GET | `/consultations` | List consultations (filter by date, doctor, pet) |
| POST | `/consultations` | New walk-in consultation (no appointment) |
| GET | `/consultations/{id}` | Full consultation detail |
| PUT | `/consultations/{id}` | Update consultation |
| PUT | `/consultations/{id}/close` | Close consultation → creates billing stub |
| GET | `/consultations/pet/{pet_id}` | Full visit history for a pet |
| GET | `/procedures-master` | List procedures |
| POST | `/procedures-master` | Add procedure |
| GET | `/prescriptions/{id}` | Get prescription detail |
| POST | `/prescriptions` | Create prescription |
| PUT | `/prescriptions/{id}` | Edit prescription (before dispensing) |
| GET | `/prescriptions/{id}/pdf` | Generate prescription PDF |
| GET | `/pets/{pet_id}/diary-pdf` | **Pet diary PDF** (all visits + vaccines) |
| GET | `/vaccines` | List vaccines |
| POST | `/vaccines` | Add vaccine |
| POST | `/vaccination-records` | Record a vaccine given |
| GET | `/vaccination-records/pet/{pet_id}` | Vaccination history for a pet |
| GET | `/vaccination-reminders/due` | Pets due for vaccination (next 7 / 30 days) |
| PUT | `/vaccination-reminders/{id}/notified` | Mark reminder as notified |

---

### 🖥️ Phase 2 Frontend Pages

| Page | Key Features |
|---|---|
| `/appointments` | Day-view list, book new, check-in button per row |
| `/appointments/book` | Form: select pet, owner auto-fills, pick doctor, pick slot |
| `/consultations/new` | Walk-in form — same as post-checkin form |
| `/consultations/{id}` | Full OPD form: vitals, notes, diagnosis, procedures, follow-up |
| `/consultations/history` | Search pet → full timeline of past visits |
| `/prescriptions/{id}` | View Rx, edit before dispensing, print PDF button |
| `/vaccines` | Vaccine master list + add form |
| `/vaccination/record` | Record vaccine given — linked to consultation or standalone |
| `/vaccination/due` | Due list table with 7-day / 30-day filter, mark notified |

---

### 📄 Phase 2 PDFs to Generate

#### 1. E-Prescription PDF
```
[Clinic Header — name, address, reg no., logo]
[Pet: name, species, breed, age, weight]
[Owner: name, phone]
[Doctor: name, qualification, reg no.]
[Date]

Rx:
| # | Medicine | Form | Dose | Frequency | Duration | Instructions |
...

General Instructions: [advice field]
Follow-up: [date if set]

[Doctor signature line]
```

#### 2. Pet Diary / Visit Summary PDF
```
[Clinic Header]
[Pet Details: name, species, breed, DOB, owner]

VISIT HISTORY
| Date | Doctor | Complaint | Diagnosis | Treatment |
...

VACCINATION HISTORY
| Vaccine | Date Given | Batch | Next Due |
...

[Generated on: date]
```

---

## PHASE 3 — PHARMACY & STOCK

---

### 📋 New Tables — Phase 3 (8 tables)

---

#### `medicines`
> Master list of all medicines stocked. Extended from textile ERP item_master logic.

```sql
CREATE TABLE medicines (
    medicine_id     SERIAL PRIMARY KEY,
    medicine_code   TEXT UNIQUE NOT NULL,       -- MED0001...
    medicine_name   TEXT NOT NULL,
    generic_name    TEXT,
    manufacturer    TEXT,
    category        TEXT,                       -- Antibiotic | Antiparasitic | Vaccine | Supplement
    dosage_form     TEXT,                       -- Tablet | Syrup | Injection | Drops | Ointment
    strength        TEXT,                       -- 250mg, 5ml/ml etc.
    unit            TEXT,                       -- Tablet | ml | Strip | Vial | Tube
    drug_schedule   TEXT,                       -- H | H1 | X | OTC (India drug schedules)
    hsn_code        TEXT,
    gst_percent     NUMERIC(5,2) DEFAULT 12,
    reorder_level   INTEGER DEFAULT 10,         -- alert when stock falls below this
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `medicine_batches`
> Every purchase creates a batch. Stock is tracked per batch for FIFO and expiry management.

```sql
CREATE TABLE medicine_batches (
    batch_id        SERIAL PRIMARY KEY,
    medicine_id     INTEGER NOT NULL REFERENCES medicines(medicine_id),
    batch_no        TEXT NOT NULL,
    manufacturer    TEXT,
    mfg_date        DATE,
    expiry_date     DATE NOT NULL,
    purchase_price  NUMERIC(10,2),              -- per unit cost
    sale_price      NUMERIC(10,2),              -- MRP per unit
    opening_qty     INTEGER DEFAULT 0,
    current_qty     INTEGER DEFAULT 0,
    purchase_bill_id INTEGER,                   -- linked to the bill that created this batch
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `stock_ledger`
> Every stock movement (IN or OUT) is recorded here. Source of truth for current stock.

```sql
CREATE TABLE stock_ledger (
    ledger_id       SERIAL PRIMARY KEY,
    medicine_id     INTEGER NOT NULL REFERENCES medicines(medicine_id),
    batch_id        INTEGER NOT NULL REFERENCES medicine_batches(batch_id),
    txn_date        DATE NOT NULL,
    txn_type        TEXT NOT NULL,              -- Purchase | Sale | Return-In | Return-Out | Adjustment | Write-Off
    qty             INTEGER NOT NULL,           -- positive = IN, negative = OUT
    ref_type        TEXT,                       -- PurchaseBill | PharmacyBill | Adjustment
    ref_id          INTEGER,                    -- ID of the source transaction
    balance_qty     INTEGER,                    -- running balance at time of entry
    notes           TEXT,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `suppliers`
> Medicine vendors / distributors. Ported from textile ERP supplier_master.

```sql
CREATE TABLE suppliers (
    supplier_id     SERIAL PRIMARY KEY,
    supplier_code   TEXT UNIQUE NOT NULL,
    supplier_name   TEXT NOT NULL,
    contact_person  TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    city_id         INTEGER REFERENCES cities(city_id),
    gstin           TEXT,
    drug_license_no TEXT,                       -- NEW field vs textile ERP
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `purchase_bills`
> Medicine purchase from supplier. Creates batches and stock-in entries.

```sql
CREATE TABLE purchase_bills (
    bill_id         SERIAL PRIMARY KEY,
    bill_no         TEXT UNIQUE NOT NULL,       -- PUR0001...
    bill_date       DATE NOT NULL,
    supplier_id     INTEGER NOT NULL REFERENCES suppliers(supplier_id),
    supplier_invoice_no TEXT,
    supplier_invoice_date DATE,
    total_amount    NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    gst_amount      NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(12,2) DEFAULT 0,
    payment_status  TEXT DEFAULT 'Unpaid',      -- Unpaid | Partial | Paid
    notes           TEXT,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `purchase_bill_items`
> Line items in a purchase bill. Each line creates one medicine batch.

```sql
CREATE TABLE purchase_bill_items (
    item_id         SERIAL PRIMARY KEY,
    bill_id         INTEGER NOT NULL REFERENCES purchase_bills(bill_id),
    medicine_id     INTEGER NOT NULL REFERENCES medicines(medicine_id),
    batch_no        TEXT NOT NULL,
    expiry_date     DATE NOT NULL,
    quantity        INTEGER NOT NULL,
    free_quantity   INTEGER DEFAULT 0,
    purchase_price  NUMERIC(10,2),
    sale_price      NUMERIC(10,2),
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    gst_pct         NUMERIC(5,2) DEFAULT 12,
    gst_amount      NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(10,2) DEFAULT 0,
    batch_id        INTEGER REFERENCES medicine_batches(batch_id) -- filled after batch creation
);
```

---

#### `pharmacy_bills`
> Counter sales bill. Can be linked to a prescription (Rx) or be a standalone OTC sale.

```sql
CREATE TABLE pharmacy_bills (
    pharmacy_bill_id SERIAL PRIMARY KEY,
    pharma_bill_no  TEXT UNIQUE NOT NULL,       -- PHR0001...
    bill_date       DATE NOT NULL,
    owner_id        INTEGER REFERENCES pet_owners(owner_id),
    pet_id          INTEGER REFERENCES pets(pet_id),
    prescription_id INTEGER REFERENCES prescriptions(prescription_id), -- NULL if OTC walk-in
    total_amount    NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    gst_amount      NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(12,2) DEFAULT 0,
    payment_mode    TEXT,                       -- Cash | Card | UPI
    payment_status  TEXT DEFAULT 'Unpaid',      -- Unpaid | Paid
    is_consolidated BOOLEAN DEFAULT false,      -- TRUE if merged into clinic bill in Phase 4
    billing_id      INTEGER,                    -- filled when consolidated in Phase 4
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `pharmacy_bill_items`
> Line items in a pharmacy bill. Each line deducts from a specific batch (FIFO).

```sql
CREATE TABLE pharmacy_bill_items (
    item_id         SERIAL PRIMARY KEY,
    pharmacy_bill_id INTEGER NOT NULL REFERENCES pharmacy_bills(pharmacy_bill_id),
    medicine_id     INTEGER NOT NULL REFERENCES medicines(medicine_id),
    batch_id        INTEGER NOT NULL REFERENCES medicine_batches(batch_id), -- FIFO batch selected
    medicine_name   TEXT NOT NULL,
    batch_no        TEXT,
    expiry_date     DATE,
    quantity        NUMERIC(8,2) NOT NULL,
    sale_price      NUMERIC(10,2) NOT NULL,
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    gst_pct         NUMERIC(5,2) DEFAULT 12,
    gst_amount      NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(10,2) DEFAULT 0,
    rx_item_id      INTEGER REFERENCES prescription_items(rx_item_id) -- link back to Rx line
);
```

---

### 📡 Phase 3 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/medicines` | Medicine master list and add |
| PUT | `/medicines/{id}` | Edit medicine |
| GET | `/medicines/low-stock` | Medicines below reorder level |
| GET | `/medicines/expiry-alert` | Batches expiring in next 30/60/90 days |
| GET/POST | `/suppliers` | Supplier master |
| GET/POST | `/purchase-bills` | Create and list purchase bills |
| GET | `/purchase-bills/{id}` | Full bill with line items |
| POST | `/purchase-bills/{id}/confirm` | Confirm bill → creates batches → posts to stock ledger |
| GET/POST | `/pharmacy-bills` | Create and list pharmacy bills |
| GET | `/pharmacy-bills/from-prescription/{rx_id}` | **Pre-fill pharmacy bill from Rx** |
| POST | `/pharmacy-bills/{id}/confirm` | Confirm → deduct stock → post stock ledger |
| GET | `/stock/current` | Current stock (all medicines, grouped) |
| GET | `/stock/ledger/{medicine_id}` | Full stock movement history per medicine |
| GET | `/stock/batches/{medicine_id}` | All batches for a medicine with qty + expiry |

---

### 🖥️ Phase 3 Frontend Pages

| Page | Key Features |
|---|---|
| `/medicines` | Medicine master list + add/edit modal |
| `/medicines/stock` | Current stock view — low stock highlighted in red |
| `/medicines/expiry` | Expiry alert list with days-to-expiry column |
| `/suppliers` | Supplier master list + add/edit |
| `/purchase-bills` | Purchase bill list + new bill entry |
| `/purchase-bills/new` | Bill form: select supplier → add medicine lines (batch, expiry, qty, price) |
| `/pharmacy` | **Main pharmacist screen** — search by Rx no. or owner/pet name |
| `/pharmacy/dispense/{rx_id}` | Pre-filled from Rx — pharmacist confirms qty, sees batch/expiry auto-selected (FIFO), edits if needed |
| `/pharmacy/otc` | OTC sale without prescription |

---

### 🔁 Key Phase 3 Logic Rules

**FIFO Batch Selection:**
When dispensing, the system must automatically pick the oldest non-expired batch first.
```
SELECT batch_id FROM medicine_batches
WHERE medicine_id = X AND current_qty > 0 AND expiry_date > TODAY
ORDER BY expiry_date ASC
LIMIT 1
```

**Stock Ledger — every movement posts two things:**
1. Update `medicine_batches.current_qty`
2. Insert a row in `stock_ledger` with txn_type, qty, ref_type, ref_id

**Prescription → Pharmacy link:**
- When pharmacist opens `/pharmacy/dispense/{rx_id}`, the system reads `prescription_items` and pre-fills medicine name, quantity required.
- `medicine_id` on `prescription_items` must be matched by medicine name if not already linked (fuzzy name match or pharmacist manually selects).
- On confirm, `prescription_items.dispensed_qty` is updated and `prescriptions.dispensed = true`.

---

## PHASE 4 — BILLING & ACCOUNTS

---

### 📋 New Tables — Phase 4 (5 tables)

---

#### `billing_master`
> Consolidated clinic bill per visit. Merges consultation fee + procedures + pharmacy.

```sql
CREATE TABLE billing_master (
    billing_id      SERIAL PRIMARY KEY,
    bill_no         TEXT UNIQUE NOT NULL,       -- BIL0001...
    bill_date       DATE NOT NULL,
    pet_id          INTEGER NOT NULL REFERENCES pets(pet_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    consult_id      INTEGER REFERENCES consultations(consult_id),
    pharmacy_bill_id INTEGER REFERENCES pharmacy_bills(pharmacy_bill_id),
    consult_fee     NUMERIC(10,2) DEFAULT 0,
    procedure_total NUMERIC(10,2) DEFAULT 0,
    pharmacy_total  NUMERIC(10,2) DEFAULT 0,
    subtotal        NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    gst_amount      NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(12,2) DEFAULT 0,
    payment_status  TEXT DEFAULT 'Unpaid',      -- Unpaid | Partial | Paid
    payment_mode    TEXT,                       -- Cash | Card | UPI | Mixed
    notes           TEXT,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `billing_items`
> Line-by-line breakdown of the consolidated bill.

```sql
CREATE TABLE billing_items (
    item_id         SERIAL PRIMARY KEY,
    billing_id      INTEGER NOT NULL REFERENCES billing_master(billing_id),
    item_type       TEXT NOT NULL,              -- Consultation | Procedure | Medicine | Other
    description     TEXT NOT NULL,
    quantity        NUMERIC(8,2) DEFAULT 1,
    unit_price      NUMERIC(10,2),
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    gst_pct         NUMERIC(5,2) DEFAULT 0,
    gst_amount      NUMERIC(10,2) DEFAULT 0,
    net_amount      NUMERIC(10,2) DEFAULT 0
);
```

---

#### `receipt_vouchers`
> Payment collection against a bill. One bill can have multiple part-payments.

```sql
CREATE TABLE receipt_vouchers (
    receipt_id      SERIAL PRIMARY KEY,
    receipt_no      TEXT UNIQUE NOT NULL,       -- REC0001...
    receipt_date    DATE NOT NULL,
    billing_id      INTEGER NOT NULL REFERENCES billing_master(billing_id),
    owner_id        INTEGER NOT NULL REFERENCES pet_owners(owner_id),
    amount          NUMERIC(12,2) NOT NULL,
    payment_mode    TEXT NOT NULL,              -- Cash | Card | UPI | Cheque
    reference_no    TEXT,                       -- UPI txn ID, cheque no. etc.
    gl_dr_id        INTEGER REFERENCES gl_master(gl_id),  -- Cash A/c or Bank A/c
    gl_cr_id        INTEGER REFERENCES gl_master(gl_id),  -- Income A/c
    narration       TEXT,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

#### `gl_master`
> Chart of accounts. Ported directly from textile ERP. No changes needed.

```sql
CREATE TABLE gl_master (
    gl_id           SERIAL PRIMARY KEY,
    gl_code         TEXT UNIQUE NOT NULL,
    gl_name         TEXT NOT NULL,
    group_name      TEXT,                       -- Assets | Liabilities | Income | Expense
    sub_group       TEXT,
    opening_balance NUMERIC(14,2) DEFAULT 0,
    balance_type    TEXT DEFAULT 'DR',          -- DR | CR
    is_active       BOOLEAN DEFAULT true
);
```

---

#### `vouchers`
> All financial transactions — payment, receipt, journal. Ported from textile ERP.

```sql
CREATE TABLE vouchers (
    voucher_id      SERIAL PRIMARY KEY,
    voucher_no      TEXT UNIQUE NOT NULL,
    voucher_date    DATE NOT NULL,
    voucher_type    TEXT NOT NULL,              -- Payment | Receipt | Journal | Contra
    debit_gl        INTEGER REFERENCES gl_master(gl_id),
    credit_gl       INTEGER REFERENCES gl_master(gl_id),
    amount          NUMERIC(12,2) NOT NULL,
    narration       TEXT,
    ref_type        TEXT,                       -- Bill | Receipt | Manual
    ref_id          INTEGER,
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

### 📡 Phase 4 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/billing/generate/{consult_id}` | **Auto-generate bill** from closed consultation |
| GET | `/billing` | List all bills (filter by date, status, owner) |
| GET | `/billing/{id}` | Full bill detail with line items |
| PUT | `/billing/{id}/discount` | Apply discount before collecting payment |
| GET | `/billing/{id}/invoice-pdf` | GST invoice PDF |
| POST | `/billing/{id}/collect` | Collect payment → creates receipt + voucher entries |
| GET | `/billing/outstanding` | All unpaid / partial bills |
| GET/POST | `/gl-master` | Chart of accounts |
| GET/POST | `/vouchers` | Manual voucher entry |
| GET | `/reports/daily-collection` | Daily collection by date range |
| GET | `/reports/cash-book` | Cash book entries |
| GET | `/reports/bank-book` | Bank book entries |
| GET | `/reports/general-ledger` | GL with debit/credit/balance |
| GET | `/reports/gst-summary` | GST collected on sales |
| GET | `/reports/doctor-revenue` | Revenue per doctor |
| GET | `/reports/outstanding` | Debtor outstanding |

---

### 🖥️ Phase 4 Frontend Pages

| Page | Key Features |
|---|---|
| `/billing` | Bill list — pending highlighted, search by owner/pet |
| `/billing/{id}` | Bill detail — line items, total, collect payment button |
| `/billing/{id}/invoice` | GST invoice view + print PDF |
| `/accounts/gl` | Chart of accounts list + add |
| `/accounts/vouchers` | Voucher list + manual entry |
| `/reports/daily-collection` | Date range picker, summary + detail |
| `/reports/cash-book` | Cash book entries |
| `/reports/bank-book` | Bank book |
| `/reports/gst` | GST report with CGST/SGST/IGST split |
| `/reports/outstanding` | Owner-wise outstanding |
| `/reports/doctor-revenue` | Doctor-wise revenue chart + table |

---

### 📄 Phase 4 PDFs to Generate

#### GST Invoice
```
[Clinic Header — GSTIN, address, reg no.]
[Bill No, Date]
[Owner: name, phone, address]
[Pet: name, species, breed]

| # | Description | HSN | Qty | Rate | Disc | Taxable | GST% | GST Amt | Total |
  1   Consultation fee (Dr. X)
  2   X-Ray (Procedure)
  3   Amoxicillin 250mg x 10 tabs
  4   Deworming Syrup 30ml
  ...
  
Subtotal:
Discount:
Taxable Amount:
CGST (6%):
SGST (6%):
Net Payable:

Payment: Cash / UPI [ref]
[Thank you message]
```

---

## 🧩 Cross-Phase Integration Points

These are the exact join points that must work correctly across all three phases:

| From | To | How |
|---|---|---|
| Appointment check-in | Consultation created | `appointments.consult_id` ← `consultations.consult_id` |
| Consultation closed | Billing stub created | `consultations.billing_stub_id` ← `billing_master.billing_id` |
| Prescription written | Pharmacy dispensing | `prescriptions.prescription_id` → `pharmacy_bills.prescription_id` |
| Pharmacy bill confirmed | Billing merged | `pharmacy_bills.billing_id` ← `billing_master.billing_id` |
| Payment collected | Receipt + Voucher posted | `receipt_vouchers.billing_id` + `vouchers` (DR cash, CR income) |
| Purchase bill confirmed | Batch created + Stock posted | `purchase_bill_items.batch_id` ← `medicine_batches.batch_id` + `stock_ledger` row |
| Pharmacy sale confirmed | Stock deducted | `medicine_batches.current_qty` -= qty + `stock_ledger` row |

---

## 📊 Total Tables Added Across Phase 2, 3, 4

| Phase | Tables Added | Running Total |
|---|---|---|
| Phase 1 (done) | 9 | 9 |
| Phase 2 | 10 | 19 |
| Phase 3 | 8 | 27 |
| Phase 4 | 5 | **32** |

---

## ✅ Build Order for Antigravity

Build strictly in this order — each step depends on the previous.

```
PHASE 2:
  Step 1 → doctor_schedule + appointments (+ check-in endpoint)
  Step 2 → consultations + consultation_procedures + procedures_master
  Step 3 → prescriptions + prescription_items
  Step 4 → vaccines + vaccination_records + vaccination_reminders
  Step 5 → PDF generation (E-Prescription + Pet Diary)
  Step 6 → Frontend: Appointments, OPD form, Prescription view, Vaccination, Due list

PHASE 3:
  Step 7  → medicines + suppliers
  Step 8  → purchase_bills + purchase_bill_items + batch creation logic
  Step 9  → stock_ledger (auto-post on purchase confirm)
  Step 10 → pharmacy_bills + pharmacy_bill_items + FIFO batch selection
  Step 11 → Prescription → Pharmacy pre-fill link
  Step 12 → Frontend: Medicine master, Stock view, Expiry alerts, Purchase bill, Pharmacy dispensing

PHASE 4:
  Step 13 → gl_master + seed default accounts (Cash, Bank, Consultation Income, Pharmacy Income, GST Payable)
  Step 14 → billing_master + billing_items (auto-generate from closed consultation)
  Step 15 → receipt_vouchers + vouchers (payment collection)
  Step 16 → GST invoice PDF
  Step 17 → Reports: Daily collection, Cash book, Bank book, GL, GST, Outstanding, Doctor revenue
  Step 18 → Frontend: Billing screen, Invoice view, All reports
```

---

## 📌 Notes for Antigravity

1. `prescription_items.medicine_id` can be NULL in Phase 2 — the pharmacist links it in Phase 3.
2. Stock ledger must NEVER be edited manually — always posted by system via purchase confirm or pharmacy confirm.
3. FIFO batch selection must skip batches where `expiry_date < TODAY`.
4. Billing auto-generation must read `consultation_procedures` and compute `procedure_total` automatically.
5. `gl_master` seed must include at minimum: Cash A/c, Bank A/c, Consultation Income, Pharmacy Sales, Purchase A/c, GST Payable, Discount Allowed.
6. All bill numbers, receipt numbers, voucher numbers must be sequential with no gaps — use a `sequences` table or PostgreSQL sequences per type.
7. All PDFs must use clinic header from `clinic_setup` (name, address, GSTIN, logo if uploaded).
8. Prescription PDF must carry doctor's registration number (MCI/State Vet Council).
9. Discount on billing must be applied at header level only — not per line item.
10. Phase 4 reports must support financial year filtering (April–March for India).

---

*Pet Clinic ERP — Phase 2, 3 & 4 Build Plan | For Antigravity | April 2026*
