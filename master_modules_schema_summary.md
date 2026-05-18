# Pet ERP — Master Modules Schema Summary

This document provides the exact database table names and field names for all master modules in the Pet ERP system.

---

## 1. City Master
**Table Name:** `cities`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `city_id` | SERIAL (PK) | Primary Key |
| `city_name` | VARCHAR(100) | Name of the city |
| `state` | VARCHAR(100) | State name |
| `pincode` | VARCHAR(10) | Default pincode for the city |
| `is_active` | BOOLEAN | Soft delete flag |
| `created_at` | TIMESTAMP | Record creation time |

---

## 2. Species Master
**Table Name:** `species`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `species_id` | SERIAL (PK) | Primary Key |
| `species_name` | VARCHAR(100) | Unique species name (e.g., Canine, Feline) |
| `notes` | TEXT | Additional info |
| `is_active` | BOOLEAN | Status flag |
| `created_at` | TIMESTAMP | Record creation time |

---

## 3. Breed Master
**Table Name:** `breeds`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `breed_id` | SERIAL (PK) | Primary Key |
| `species_id` | INTEGER (FK) | Reference to `species.species_id` |
| `breed_name` | VARCHAR(150) | Name of the breed |
| `notes` | TEXT | Additional info |
| `is_active` | BOOLEAN | Status flag |
| `created_at` | TIMESTAMP | Record creation time |

---

## 4. GST Rates Master
**Table Name:** `gst_rates`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `gst_rate_id` | SERIAL (PK) | Primary Key |
| `rate_name` | VARCHAR(50) | Display name (e.g., GST 12%) |
| `gst_percent` | NUMERIC(5,2) | Total GST % |
| `cgst_pct` | NUMERIC(5,2) | CGST % |
| `sgst_pct` | NUMERIC(5,2) | SGST % |
| `igst_pct` | NUMERIC(5,2) | IGST % |
| `is_active` | BOOLEAN | Status flag |

---

## 5. HSN Codes Master
**Table Name:** `hsn_codes`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `hsn_id` | SERIAL (PK) | Primary Key |
| `hsn_code` | VARCHAR(10) | 4 to 8 digit HSN/SAC code |
| `description` | VARCHAR(300) | Goods/Service description |
| `default_gst_pct` | NUMERIC(5,2) | Default tax rate for this HSN |
| `is_active` | BOOLEAN | Status flag |

---

## 6. Clinic Setup
**Table Name:** `clinic_setup`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `clinic_id` | SERIAL (PK) | Primary Key |
| `clinic_name` | VARCHAR(200) | Name of the Clinic |
| `gstin` | VARCHAR(20) | Clinic GST Number |
| `pan` | VARCHAR(12) | Clinic PAN |
| `address1` | TEXT | Street / Building |
| `address2` | TEXT | Area / Locality |
| `address3` | TEXT | Landmark |
| `district` | VARCHAR(100) | District Name |
| `state_name` | VARCHAR(100) | Full State Name |
| `state_code` | VARCHAR(5) | 2-digit Indian State Code (e.g., 36) |
| `pincode` | VARCHAR(10) | Pincode |
| `phone` | VARCHAR(20) | Primary Contact |
| `email` | VARCHAR(100) | Official Email |
| `drug_license_no` | VARCHAR(50) | Pharmacy License No |
| `fy_start_month` | SMALLINT | Financial Year start (default 4 for April) |

---

## 7. Pet Owner Master
**Table Name:** `pet_owners`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `owner_id` | SERIAL (PK) | Primary Key |
| `owner_code` | VARCHAR(30) | Unique Code (e.g., OWN0001) |
| `name` | VARCHAR(200) | Owner Full Name |
| `phone` | VARCHAR(20) | Primary Phone |
| `address1` | TEXT | Street / Building |
| `state_code` | VARCHAR(5) | 2-digit State Code for GST |
| `gstin` | VARCHAR(20) | Owner GSTIN (if B2B) |
| `opening_balance` | NUMERIC(12,2) | Balance at go-live |
| `balance_type` | VARCHAR(2) | DR (Owes us) | CR (In Credit) |
| `gl_account_id` | INTEGER (FK) | Link to `gl_master` |

---

## 8. Pets Master
**Table Name:** `pets`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `pet_id` | SERIAL (PK) | Primary Key |
| `pet_code` | VARCHAR(30) | Unique Code (e.g., PET0001) |
| `name` | VARCHAR(150) | Pet Name |
| `owner_id` | INTEGER (FK) | Reference to `pet_owners` |
| `species_id` | INTEGER (FK) | Reference to `species` |
| `breed_id` | INTEGER (FK) | Reference to `breeds` |
| `gender` | VARCHAR(10) | Male | Female | Unknown |
| `dob` | DATE | Date of Birth |
| `weight_kg` | NUMERIC(6,2) | Last recorded weight |

---

## 9. Doctors Master
**Table Name:** `doctors`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `doctor_id` | SERIAL (PK) | Primary Key |
| `doctor_code` | VARCHAR(30) | Unique Code (e.g., DOC0001) |
| `name` | VARCHAR(200) | Doctor Full Name |
| `reg_number` | VARCHAR(100) | Veterinary Council Reg No |
| `consultation_fee`| NUMERIC(10,2) | Standard Fee |
| `address1` | TEXT | Resident Address |
| `pan` | VARCHAR(10) | Doctor PAN |
| `gl_account_id` | INTEGER (FK) | Link to `gl_master` |

---

## 10. Staff Master
**Table Name:** `staff`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `staff_id` | SERIAL (PK) | Primary Key |
| `staff_code` | VARCHAR(30) | Unique Code (e.g., STF0001) |
| `name` | VARCHAR(200) | Staff Name |
| `role` | VARCHAR(50) | Nurse | Pharmacist | Admin | etc. |
| `doj` | DATE | Date of Joining |
| `salary` | NUMERIC(10,2) | Monthly Salary |
| `gl_account_id` | INTEGER (FK) | Link to `gl_master` |

---

## 11. Agent Master
**Table Name:** `agents`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `agent_id` | SERIAL (PK) | Primary Key |
| `agent_code` | VARCHAR(30) | Unique Code (e.g., AGT0001) |
| `name` | VARCHAR(200) | Agent Name |
| `commission_type`| VARCHAR(30) | Flat | Percentage |
| `commission_rate`| NUMERIC(10,2) | Rate |
| `gl_account_id` | INTEGER (FK) | Link to `gl_master` |

---

## 12. Vaccination Master
**Table Name:** `vaccines`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `vaccine_id` | SERIAL (PK) | Primary Key |
| `vaccine_code` | TEXT | Unique Code (e.g., VAC001) |
| `vaccine_name` | TEXT | Name of the Vaccine |
| `disease_covered`| TEXT | e.g., Rabies |
| `interval_days` | SMALLINT | Days to next dose |
| `dose_ml` | NUMERIC(5,2) | Dosage amount |

---

## 13. Medicine Master
**Table Name:** `medicines`

| Field Name | Data Type | Description |
| :--- | :--- | :--- |
| `medicine_id` | SERIAL (PK) | Primary Key |
| `medicine_code` | TEXT | Unique Code (e.g., MED001) |
| `medicine_name` | TEXT | Trade Name |
| `hsn_code` | TEXT | HSN Code for GST |
| `gst_percent` | NUMERIC(5,2) | Tax % |
| `current_stock` | INTEGER | Auto-updated quantity |

---

> [!NOTE]
> All masters except **City** use soft delete (`is_active` flag).
> Address fields are standardized as `address1`, `address2`, `address3` in recent updates.
