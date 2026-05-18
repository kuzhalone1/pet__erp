# 🐾 Pet ERP — Master Modules Execution Plan

> **Goal:** Group all 13 master modules under a clean, unified UI and ensure every module is 100% complete — DB schema, backend model/route/schema, and frontend UI.

---

## 📊 Current Status Audit

| # | Master | DB Table | Backend Model | Backend Route | Backend Schema | Frontend Page | Status |
|---|--------|----------|---------------|---------------|----------------|---------------|--------|
| 1 | Clinic Setup | `clinic_setup` ✅ | `models/clinic.py` ✅ | `routes/clinic.py` ✅ | `schemas/clinic.py` ✅ | `ClinicSetup.jsx` ✅ | ✅ **Complete** |
| 2 | City | `cities` ✅ | `models/masters.py` ✅ | `routes/masters.py` ✅ | `schemas/masters.py` ✅ | `Masters.jsx → CityTab` ✅ | ✅ **Complete** |
| 3 | Species | `species` ✅ | `models/masters.py` ✅ | `routes/masters.py` ✅ | `schemas/masters.py` ✅ | `Masters.jsx → SpeciesTab` ✅ | ✅ **Complete** |
| 4 | Breed | `breeds` ✅ | `models/masters.py` ✅ | `routes/masters.py` ✅ | `schemas/masters.py` ✅ | `Masters.jsx → BreedTab` ✅ | ✅ **Complete** |
| 5 | GST Rates | `gst_rates` ✅ | `models/masters.py` ✅ | `routes/masters.py` ✅ | `schemas/masters.py` ✅ | `Masters.jsx → GstRateTab` ✅ | ✅ **Complete** |
| 6 | HSN Codes | `hsn_codes` ✅ | `models/masters.py` ✅ | `routes/masters.py` ✅ | `schemas/masters.py` ✅ | `Masters.jsx → HsnTab` ✅ | ✅ **Complete** |
| 7 | Pet Owners | `pet_owners` ✅ | `models/people.py` ✅ | `routes/owners.py` ✅ | `schemas/owners.py` ✅ | `PetOwners.jsx` ✅ | ✅ **Complete** |
| 8 | Pets | `pets` ✅ | `models/people.py` ✅ | `routes/pets.py` ✅ | `schemas/pets.py` ✅ | `Pets.jsx` ✅ | ✅ **Complete** |
| 9 | Doctors & Staff | `doctors` + `staff` ✅ | `models/doctors.py` ✅ | `routes/doctors.py` ✅ | `schemas/doctors.py` ✅ | `Doctors.jsx` ✅ | ✅ **Complete** |
| 10 | Vaccine Master | `vaccines` ✅ | `models/stage3.py` ✅ | `routes/vaccines.py` ✅ | `schemas/vaccines.py` ✅ | `Vaccination.jsx` ⚠️ | ⚠️ **Partial** |
| 11 | Medicine Master | `medicines` ✅ | `models/stage3.py` ✅ | `routes/inventory.py` ✅ | — ✅ | `Medicines.jsx` ⚠️ | ⚠️ **Partial** |
| 12 | Supplier Master | `suppliers` ✅ | `models/phase3.py` ✅ | `routes/inventory.py` ✅ | — ✅ | `Suppliers.jsx` ✅ | ✅ **Complete** |
| 13 | Agent Master | `agents` ✅ | `models/agents.py` ✅ | `routes/agents.py` ✅ | `schemas/agents.py` ✅ | `Agents.jsx` ✅ | ✅ **Complete** |

---

## 🔍 Gap Analysis

### ✅ Fully Working (No Action Needed)
- Clinic Setup, City, Species, Breed, GST Rates, HSN Codes — all under `/masters` tabs
- Pet Owners (`/owners`), Pets (`/pets`)
- Doctors & Staff (`/doctors`)
- Suppliers (`/suppliers`)
- Agents (`/agents`)

---

### ⚠️ Gap 1 — Vaccine Master (Missing Catalog UI)
**Problem:** `Vaccination.jsx` is a **vaccination records workflow page** (recording vaccinations given to pets). The **Vaccine Master** (the catalog of vaccine types) has no dedicated management UI.

The backend routes in `routes/vaccines.py` handle vaccination records — **not the vaccine catalog CRUD**.

**What's needed:**
- A `VaccineTab` component inside `Masters.jsx` (same pattern as Species/Breed)
- Or a separate `/vaccine-master` route with full Add/Edit/Deactivate UI
- Backend: confirm that `GET /vaccines/catalog`, `POST /vaccines/catalog`, `PUT /vaccines/catalog/{id}`, `DELETE /vaccines/catalog/{id}` routes exist for the **vaccine master** (distinct from vaccination records)

**Vaccine form fields:**
| Field | Type | Notes |
|-------|------|-------|
| vaccine_code | text (auto or manual) | Read-only on edit |
| vaccine_name | text | Required |
| species_id | select (from /masters/species) | Required |
| disease | text | e.g., Rabies, Parvovirus |
| company | text | Manufacturer |
| dosage | text | e.g., 1 ml IM |
| route | select | IM / SC / Oral / IV |
| dose_number | number | Which dose in series (1,2,3) |
| interval_days | number | Days to next dose (0 = one-time) |
| medicine_id | select (optional) | Link to medicine/stock |

---

### ⚠️ Gap 2 — Medicine Master (Style Inconsistency)
**Problem:** `Medicines.jsx` uses raw `axios` (hardcoded `http://localhost:8000`) instead of the shared `api.js` instance. Uses a different visual style (ad-hoc Tailwind) compared to the rest of the app.

**What's needed:**
- Replace all `axios.get(API_BASE + ...)` with `api.get(...)` using shared instance from `../api`
- Replace `alert()` with `toast.error()` / `toast.success()` from `react-hot-toast`
- Wrap in standard `card` divs, use `FormModal`, `Table` component
- Use `btn-primary`, `btn-secondary`, `input-field`, `label` CSS design system classes

---

### ⚠️ Gap 3 — Navigation Grouping (UX)
**Problem:** Masters are scattered across the sidebar in different groups:
- City/Species/Breed/GST/HSN → `/masters` (General)
- Clinic Setup → `/clinic-setup` (General)
- Pet Owners → `/owners` (General)
- Pets → `/pets` (General)
- Doctors → `/doctors` (General)
- Suppliers → `/suppliers` (Pharmacy & Stock)
- Agents → `/agents` (Accounts)
- Vaccines — no master UI at all
- Medicines → `/medicines` (Pharmacy & Stock)

**Goal:** Create a logical **"Masters"** group in the sidebar that contains all master management links, separate from transactional modules.

---

## 📋 Execution Tasks

### TASK 1 — Add VaccineTab to Masters Page
**Priority: HIGH**
**Files:** `frontend/src/pages/Masters.jsx`

1. Add `VaccineTab` function component (same pattern as `SpeciesTab`, `BreedTab`)
2. Fetch species from `GET /masters/species` for the species dropdown
3. Fetch vaccines from `GET /vaccines/` (check if this returns the catalog or records — may need backend fix)
4. Display table columns: Code, Name, Species, Disease, Interval Days, Dose, Status
5. Add/Edit modal with all vaccine fields listed in Gap 1
6. Deactivate via `is_active = false` (no hard delete)
7. Append `'Vaccine'` to the `TABS` array

---

### TASK 2 — Fix Backend Vaccine Catalog Routes
**Priority: HIGH**
**Files:** `backend/routes/vaccines.py`

Check & ensure these routes exist for **vaccine master CRUD** (not vaccination records):
```
GET  /vaccines/                    → list all vaccines (active + inactive)
POST /vaccines/                    → create new vaccine
PUT  /vaccines/{vaccine_id}        → update vaccine
DELETE /vaccines/{vaccine_id}      → soft deactivate
```

The schema in `models/stage3.py → Vaccine` already has all needed fields.
Add to `backend/schemas/vaccines.py` if VaccineCreate/VaccineOut schemas are missing.

---

### TASK 3 — Refactor Medicines Page
**Priority: HIGH**
**Files:** `frontend/src/pages/Medicines.jsx`

Replace raw axios with `api`:
```js
// BEFORE
import axios from 'axios'
const API_BASE = 'http://localhost:8000'
await axios.get(`${API_BASE}/inventory/medicines`, ...)

// AFTER  
import api from '../api'
await api.get('/inventory/medicines', ...)
```

Replace alerts with toasts:
```js
// BEFORE
alert("Save failed")

// AFTER
import { toast } from 'react-hot-toast'
toast.error("Save failed")
```

Refactor visual elements:
- Wrap in `<div className="space-y-4">`
- Header row with title + Add button using `btn-primary`
- Replace custom table with `<Table>` component
- Replace inline modal with `<FormModal>` component
- All inputs use `input-field` class, labels use `label` class

---

### TASK 4 — Reorganise Sidebar Navigation
**Priority: MEDIUM**
**Files:** `frontend/src/components/Sidebar.jsx`

Proposed final sidebar groups:
```
MASTERS
  Clinic Setup          → /clinic-setup     (Hospital icon)
  Lookup Masters        → /masters          (Layers icon — tabs: City/Species/Breed/GST/HSN/Vaccine)
  Pet Owners            → /owners           (Users icon)
  Pets                  → /pets             (PawPrint icon)
  Doctors & Staff       → /doctors          (Stethoscope icon)
  Medicines             → /medicines        (Pill icon)
  Suppliers             → /suppliers        (Truck icon)
  Referral Agents       → /agents           (Handshake icon)

CLINICAL
  Appointments          → /appointments
  Consultations         → /consultations
  Procedures            → /procedures
  Vaccination Records   → /vaccination

PHARMACY & STOCK
  Sales Billing         → /sales-billing
  Purchases             → /purchases
  Inventory             → /inventory

ACCOUNTS
  Chart of Accounts     → /ledger

MANAGEMENT
  User Management       → /users
```

---

### TASK 5 — Masters Page Header Polish
**Priority: LOW**
**Files:** `frontend/src/pages/Masters.jsx`

Add a proper page-level header above the tab strip:
```jsx
<div className="flex items-center justify-between mb-4">
  <div>
    <h1 className="text-lg font-bold text-slate-800">Lookup Masters</h1>
    <p className="text-xs text-slate-400 mt-0.5">
      Manage foundational reference data used across the system
    </p>
  </div>
</div>
```

Make the tab bar horizontally scrollable on small screens.

---

## 🗂️ File Change Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `frontend/src/pages/Masters.jsx` | Add `VaccineTab` + header | **HIGH** |
| `backend/routes/vaccines.py` | Verify/add CRUD for vaccine catalog | **HIGH** |
| `backend/schemas/vaccines.py` | Add `VaccineCreate`/`VaccineOut` if missing | **HIGH** |
| `frontend/src/pages/Medicines.jsx` | Refactor to app design system | **HIGH** |
| `frontend/src/components/Sidebar.jsx` | Reorganise nav groups | **MEDIUM** |

---

## 🚀 Execution Order

```
Step 1  Verify backend vaccine catalog routes (Task 2)
Step 2  Add VaccineTab to Masters.jsx (Task 1)
Step 3  Refactor Medicines.jsx (Task 3)
Step 4  Reorganise Sidebar.jsx (Task 4)
Step 5  Add Masters page header (Task 5)
Step 6  End-to-end test all 13 masters
```

---

## ✅ Definition of Done

Each master module is **complete** when:
- [ ] DB table exists with correct columns
- [ ] SQLAlchemy model is defined
- [ ] Pydantic schemas (Create + Out) exist
- [ ] API routes: GET list, POST create, PUT update, DELETE/deactivate
- [ ] Frontend renders data in `Table` component
- [ ] Add/Edit modal uses `FormModal` + design system classes
- [ ] All API calls use shared `api.js` instance (not raw axios)
- [ ] Toast notifications on success/error
- [ ] FK guard on delete (no orphaned records)
- [ ] Sidebar links to correct route

---

## 📐 Quick Schema Reference

### vaccines (Vaccine Master)
```
vaccine_id    SERIAL PK
vaccine_code  VARCHAR(30) UNIQUE
vaccine_name  VARCHAR(200) NOT NULL
species_id    INT FK → species
company       VARCHAR(100)
disease       VARCHAR(200)
dosage        VARCHAR(100)
route         VARCHAR(50)       -- IM / SC / Oral
dose_number   SMALLINT DEFAULT 1
interval_days INT DEFAULT 0
medicine_id   INT FK → medicines (nullable)
is_active     BOOLEAN DEFAULT TRUE
created_at    TIMESTAMP
```

### medicines (Medicine Master)
```
medicine_id    SERIAL PK
medicine_code  VARCHAR(30) UNIQUE
medicine_name  VARCHAR(200) NOT NULL
medicine_name2 VARCHAR(200)       -- generic/alternate
hsn_id         INT FK → hsn_codes
gst_rate_id    INT FK → gst_rates
unit_id        INT FK → units
reorder_level  NUMERIC(10,2) DEFAULT 0
current_stock  NUMERIC(10,2) DEFAULT 0  -- auto-updated
is_active      BOOLEAN DEFAULT TRUE
created_at     TIMESTAMP
updated_at     TIMESTAMP
```

---

*Generated: 2026-05-09 | Conversation: df37a3cd*
