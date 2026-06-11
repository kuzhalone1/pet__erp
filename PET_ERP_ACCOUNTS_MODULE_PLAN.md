# 🐾 Pet ERP — Accounts Module: Complete Planning Document

> **Purpose:** Map AMA ERP accounts logic → Pet ERP. Identify what already exists, what needs to be built, and every data-entry field required for a complete accounts management system.

---

## 📦 Part 1 — What We Have (Pet ERP Today)

### ✅ Already Built

| Component | Location | Status |
|-----------|----------|--------|
| **GL Master** (Chart of Accounts) | `models/phase4.py → GLMaster` | ✅ Full CRUD + Frontend |
| **Financial Year** | `models/phase4.py → FinancialYear` | ✅ Model exists |
| **Opening Balance** | `models/phase4.py → OpeningBalance` | ✅ Model exists |
| **Receipt Voucher** (basic) | `models/phase4.py → ReceiptVoucher` | ⚠️ Model only — no routes/UI |
| **Voucher** (generic) | `models/phase4.py → Voucher` | ⚠️ Model only — no routes/UI |
| **Billing Master** (clinic bill) | `models/phase4.py → BillingMaster` | ⚠️ Model only |
| **Sales Bill** (medicine/procedure) | `models/stage3.py → SalesBill` | ✅ Full — with GST calc |
| **Purchase Bill** | `models/phase3.py → PurchaseBill` | ✅ Full — no payment tracking |
| **Supplier Master** | `models/phase3.py → Supplier` | ✅ with GL link |
| **Pet Owner** | `models/people.py → PetOwner` | ✅ Acts as Customer/Debtor |
| **Ledger Page** (GL list) | `frontend/src/pages/Ledger.jsx` | ✅ Chart of Accounts UI |

### ⚠️ Partially Built / Missing Routes

| Component | Gap |
|-----------|-----|
| Receipt Voucher | Model exists — **no API routes, no UI** |
| Payment Voucher | **Not built at all** |
| Journal Voucher | **Not built at all** |
| Advance Payments | **Not built at all** |
| Bank Arrivals | **Not built at all** |
| Debit Note | **Not built at all** |
| Credit Note | **Not built at all** |
| Account Payables (AP) | Only purchase bills — **no payment tracking** |
| Account Receivables (AR) | Only sales bills — **no receipt tracking** |
| GST Reports | **Not built at all** |
| General Ledger Report | **Not built at all** |
| Trial Balance | **Not built at all** |
| Cash/Bank Book | **Not built at all** |
| Debtor/Creditor Ledger | **Not built at all** |

---

## 🏦 Part 2 — AMA Source Files Analysed (Relevant Logic)

| AMA File | Logic Extracted | Maps To Pet ERP |
|----------|----------------|-----------------|
| `advance_payments.py` | Voucher No gen, party + cash/bank link, docno/docdate | Advance Payment Voucher |
| `bank_arrivals.py` | Bank receipt tracking before invoice matching | Bank Arrivals (Debtors) |
| `receipt_voucher.py` | Bill balance fetch, bill-wise payment grid, partial receipts | Account Receivables |
| `payment_voucher.py` | Purchase bill balance, advance adjustments, bill-wise payment | Account Payables |
| `journal_voucher.py` | Multi-row DR/CR grid, CR=DR validation, account popup | Journal Voucher |
| `credit_note.py` | Item grid with GST (CGST/SGST/IGST), party details, ref bill | Credit Note (Sales Return) |
| `debit_note.py` | Same structure as credit note — supplier side | Debit Note (Purchase Return) |
| `repo_gst.py` | GSTR-1 Sales Register, B2B, HSN Summary, GSTR-3B, PDF/Excel export | GST Compliance Reports |
| `general_ledger.py` | GL statement per account with DR/CR running balance | General Ledger Report |
| `repo_cash_book.py` | Cash inflows/outflows with voucher references | Cash Book Report |
| `repo_bank_book.py` | Bank transactions with cheque/NEFT refs | Bank Book Report |
| `repo_debtor_balance.py` | Outstanding per customer | Debtor Outstanding Report |
| `repo_creditor_balance.py` | Outstanding per supplier | Creditor Outstanding Report |
| `trial_balance.py` | Group-wise DR/CR summary | Trial Balance |

### Key Data Patterns from AMA

```
AMA: glmast (accode, acdesc, add1..., gstin, statecode)  
→ Pet ERP: gl_master (gl_id, gl_code, gl_name, group_name, gstin, state_code) ✅

AMA: doccount (serial, advno, pbrvno, recvno, payvno, jouvno, crvno, drvno)
→ Pet ERP: doc_sequences table needed (extend existing get_next_doc_no utility) ✅

AMA: advance_payments (vno, vdate, accode1, partyname, amount, accode2, cashbank, docno, docdate, narr)
→ Pet ERP: advance_payments table — NEW NEEDED

AMA: bank_arrivals (vno, vdate, accode1, partyname, amount, accode2, cashbank, rdocno, rdocdate, narr, enteredamt, balance)
→ Pet ERP: bank_arrivals table — NEW NEEDED

AMA: daily (vno, vdate, accode1, paidto, accode2, cashbank, amount, paytype, rdocno, rdocdate, narr)
AMA: daily_details (vno, vdate, accode1/2, voutype, bno, bdate, billamt, recamt, balamt, amount, arrivedno)
→ Pet ERP: receipt_vouchers + payment_vouchers + voucher_details tables — EXTEND EXISTING

AMA: journ (vno, slno, vdate, narr, bno, accode1, creditor, accode2, debtor, cramt, dramt)
→ Pet ERP: journal_vouchers + journal_lines tables — NEW NEEDED

AMA: credit_note (bno, bdate, cno, cname, srbno, srbdate, items[], taxable, cgst, sgst, igst, amount)
AMA: debit_note (bno, bdate, accode1, acdesc, items[], taxable, cgst, sgst, igst, amount)
→ Pet ERP: credit_notes + debit_notes + note_items tables — NEW NEEDED
```

---

## 🗄️ Part 3 — New Database Tables Required

### 3.1 `advance_payments`
> Supplier/vendor advance paid before invoice is received

```sql
CREATE TABLE advance_payments (
    adv_id          SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,       -- AD-26001
    voucher_date    DATE NOT NULL,
    -- Party (Supplier or Owner paying in advance)
    gl_party_id     INTEGER REFERENCES gl_master(gl_id) NOT NULL,
    party_name      VARCHAR(200),
    party_type      VARCHAR(10) DEFAULT 'Supplier',    -- Supplier / Customer
    -- Cash / Bank
    gl_cashbank_id  INTEGER REFERENCES gl_master(gl_id) NOT NULL,
    cashbank_name   VARCHAR(200),
    -- Amounts
    amount          NUMERIC(12,2) NOT NULL,
    adjusted_amount NUMERIC(12,2) DEFAULT 0,
    balance         NUMERIC(12,2),                     -- computed: amount - adjusted
    -- Reference
    doc_no          VARCHAR(50),
    doc_date        DATE,
    narration       TEXT,
    status          VARCHAR(20) DEFAULT 'Open',        -- Open / Adjusted / Cancelled
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

**Required Data Entry Fields:**
- Voucher No (auto-generated, editable)
- Voucher Date (default today)
- Party Type: Supplier / Customer toggle
- Party Code + Name (searchable GL Master popup)
- Cash/Bank Account (searchable GL popup — filtered to Assets > Cash/Bank sub-group)
- Amount (₹)
- Doc/Cheque No
- Doc Date
- Narration

---

### 3.2 `bank_arrivals`
> Customer cheque/NEFT received but not yet matched to a bill

```sql
CREATE TABLE bank_arrivals (
    arrival_id      SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,       -- BA-26001
    voucher_date    DATE NOT NULL,
    -- Customer
    gl_party_id     INTEGER REFERENCES gl_master(gl_id) NOT NULL,
    party_name      VARCHAR(200),
    -- Bank Account
    gl_bank_id      INTEGER REFERENCES gl_master(gl_id) NOT NULL,
    bank_name       VARCHAR(200),
    -- Amount
    amount          NUMERIC(12,2) NOT NULL,
    entered_amount  NUMERIC(12,2) DEFAULT 0,          -- matched to receipts
    balance         NUMERIC(12,2),                     -- unmatched balance
    -- Reference
    ref_doc_no      VARCHAR(50),                       -- cheque no / UTR
    ref_doc_date    DATE,
    narration       TEXT,
    status          VARCHAR(20) DEFAULT 'Open',
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

**Required Data Entry Fields:**
- Voucher No (auto)
- Voucher Date
- Customer (GL Popup — Debtor accounts)
- Bank Account (GL Popup — Bank sub-group)
- Amount
- Cheque / UTR / NEFT Ref No
- Ref Date (cheque date)
- Narration

---

### 3.3 `receipt_vouchers` (extend existing model)
> Customer payment collection — links to Sales Bills + Bank Arrivals

```sql
-- Extend existing receipt_vouchers or replace with:
ALTER TABLE receipt_vouchers ADD COLUMN IF NOT EXISTS
    gl_party_id     INTEGER REFERENCES gl_master(gl_id),
    gl_cashbank_id  INTEGER REFERENCES gl_master(gl_id),
    payment_type    VARCHAR(20) DEFAULT 'Cash',   -- Cash/Cheque/NEFT/RTGS/UPI
    ref_no          VARCHAR(50),
    ref_date        DATE,
    narration       TEXT;

CREATE TABLE receipt_voucher_details (
    detail_id       SERIAL PRIMARY KEY,
    receipt_id      INTEGER REFERENCES receipt_vouchers(receipt_id) NOT NULL,
    vou_type        VARCHAR(10),                  -- 'Bill' or 'Arrival'
    bill_no         VARCHAR(50),                  -- Sales Bill No
    bill_date       DATE,
    bill_amount     NUMERIC(12,2),
    prev_received   NUMERIC(12,2) DEFAULT 0,
    balance_amount  NUMERIC(12,2),
    amount_received NUMERIC(12,2)                 -- what is being received now
);
```

**Required Data Entry Fields (Receipt Voucher — Accounts Receivable):**
- Voucher No (auto: RV-YYYY-00001)
- Voucher Date
- Customer / Party (GL Popup → Debtors)
- Cash/Bank Account (GL Popup)
- Total Amount
- Payment Type: Cash / Cheque / NEFT / RTGS / UPI
- Cheque / Ref No
- Ref Date (cheque date)
- Narration
- **Bill Fetch Grid** (click "Fetch Bills" → loads open Sales Bills):
  - Bill No | Bill Date | Bill Amount | Already Received | Balance | ✔ Receiving Now (editable)
- **Bank Arrivals Grid** (pre-cleared cheques):
  - Arrival No | Date | Amount | Entered | Balance

---

### 3.4 `payment_vouchers` (new)
> Supplier payment — links to Purchase Bills + Advance adjustments

```sql
CREATE TABLE payment_vouchers (
    payment_id      SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,       -- PV-26001
    voucher_date    DATE NOT NULL,
    gl_party_id     INTEGER REFERENCES gl_master(gl_id) NOT NULL,
    party_name      VARCHAR(200),
    gl_cashbank_id  INTEGER REFERENCES gl_master(gl_id) NOT NULL,
    cashbank_name   VARCHAR(200),
    total_amount    NUMERIC(12,2) NOT NULL,
    payment_type    VARCHAR(20) DEFAULT 'Cash',
    ref_no          VARCHAR(50),
    ref_date        DATE,
    narration       TEXT,
    status          VARCHAR(20) DEFAULT 'Posted',
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_voucher_details (
    detail_id       SERIAL PRIMARY KEY,
    payment_id      INTEGER REFERENCES payment_vouchers(payment_id) NOT NULL,
    vou_type        VARCHAR(10),                  -- 'Bill' or 'Advance'
    ref_no          VARCHAR(50),
    ref_date        DATE,
    bill_no         VARCHAR(50),
    bill_date       DATE,
    bill_amount     NUMERIC(12,2),
    prev_paid       NUMERIC(12,2) DEFAULT 0,
    balance_amount  NUMERIC(12,2),
    amount_paid     NUMERIC(12,2)
);
```

**Required Data Entry Fields (Payment Voucher — Accounts Payable):**
- Voucher No (auto: PV-YYYY-00001)
- Voucher Date
- Supplier / Party (GL Popup → Creditors)
- Cash/Bank Account (GL Popup)
- Total Amount
- Payment Type: Cash / Cheque / NEFT / RTGS / UPI
- Ref No / Cheque No
- Ref Date
- Narration
- **Bill Fetch Grid** (click "Fetch Bills" → loads open Purchase Bills):
  - Purchase Bill No | Date | Amount | Paid | Balance | ✔ Paying Now
- **Advance Adjustments Grid**:
  - Advance Voucher No | Date | Advance Amount | Used | Balance | ✔ Adjusting Now

---

### 3.5 `journal_vouchers` + `journal_lines`
> Multi-leg accounting entries (depreciation, contra, adjustments)

```sql
CREATE TABLE journal_vouchers (
    journal_id      SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,   -- JV-26001
    voucher_date    DATE NOT NULL,
    bill_ref_no     VARCHAR(50),                   -- reference bill/doc
    narration       TEXT,
    total_cr        NUMERIC(14,2) DEFAULT 0,
    total_dr        NUMERIC(14,2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'Posted',
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE journal_lines (
    line_id         SERIAL PRIMARY KEY,
    journal_id      INTEGER REFERENCES journal_vouchers(journal_id) NOT NULL,
    line_no         INTEGER NOT NULL,
    gl_cr_id        INTEGER REFERENCES gl_master(gl_id),  -- Credit account
    cr_account_name VARCHAR(200),
    gl_dr_id        INTEGER REFERENCES gl_master(gl_id),  -- Debit account
    dr_account_name VARCHAR(200),
    cr_amount       NUMERIC(12,2) DEFAULT 0,
    dr_amount       NUMERIC(12,2) DEFAULT 0
);
-- RULE: SUM(cr_amount) must equal SUM(dr_amount) on save
```

**Required Data Entry Fields (Journal Voucher):**
- Voucher No (auto: JV-YYYY-00001)
- Voucher Date
- Narration (header level)
- Ref Bill No (optional)
- **Line Grid** (minimum 12 rows, expandable):
  - SL# | CR Account Code | CR Account Name | DR Account Code | DR Account Name | CR Amount | DR Amount
- **Totals footer**: Total CR | Total DR | Difference (must be 0 to save)

---

### 3.6 `credit_notes` + `credit_note_items`
> Issued to customers when goods are returned or overbilled

```sql
CREATE TABLE credit_notes (
    cn_id           SERIAL PRIMARY KEY,
    fy_code         VARCHAR(10) REFERENCES financial_years(fy_code),
    voucher_no      VARCHAR(30) UNIQUE NOT NULL,   -- CN-26001
    voucher_date    DATE NOT NULL,
    -- Reference
    ref_bill_no     VARCHAR(50),                   -- original sales bill
    ref_bill_date   DATE,
    -- Customer
    gl_party_id     INTEGER REFERENCES gl_master(gl_id) NOT NULL,
    party_name      VARCHAR(200),
    -- Sales Head Account (credit goes here)
    gl_credit_id    INTEGER REFERENCES gl_master(gl_id),
    credit_desc     VARCHAR(200),
    -- Address
    address1        TEXT,
    address2        TEXT,
    city            VARCHAR(100),
    -- Totals
    total_qty       NUMERIC(10,3) DEFAULT 0,
    gross_amount    NUMERIC(12,2) DEFAULT 0,
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    discount_amt    NUMERIC(10,2) DEFAULT 0,
    taxable_amount  NUMERIC(12,2) DEFAULT 0,
    cgst_rate       NUMERIC(5,2) DEFAULT 0,
    cgst_amount     NUMERIC(10,2) DEFAULT 0,
    sgst_rate       NUMERIC(5,2) DEFAULT 0,
    sgst_amount     NUMERIC(10,2) DEFAULT 0,
    igst_rate       NUMERIC(5,2) DEFAULT 0,
    igst_amount     NUMERIC(10,2) DEFAULT 0,
    round_off       NUMERIC(6,2) DEFAULT 0,
    net_amount      NUMERIC(12,2) DEFAULT 0,
    is_interstate   BOOLEAN DEFAULT FALSE,
    narration       TEXT,
    status          VARCHAR(20) DEFAULT 'Confirmed',
    created_by      INTEGER REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE credit_note_items (
    item_id         SERIAL PRIMARY KEY,
    cn_id           INTEGER REFERENCES credit_notes(cn_id) NOT NULL,
    line_no         INTEGER NOT NULL,
    -- Medicine / Service link
    medicine_id     INTEGER REFERENCES medicines(medicine_id),
    procedure_id    INTEGER REFERENCES procedures(procedure_id),
    item_code       VARCHAR(50),
    item_name       VARCHAR(200) NOT NULL,
    hsn_code        VARCHAR(20),
    unit            VARCHAR(20),
    quantity        NUMERIC(10,3),
    rate            NUMERIC(10,2),
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    discount_amt    NUMERIC(10,2) DEFAULT 0,
    taxable_amount  NUMERIC(10,2),
    gst_pct         NUMERIC(5,2),
    cgst_amount     NUMERIC(10,2),
    sgst_amount     NUMERIC(10,2),
    igst_amount     NUMERIC(10,2),
    line_total      NUMERIC(10,2)
);
```

**Required Data Entry Fields (Credit Note):**

**Header Section:**
- Voucher No (auto: CN-YYYY-00001)
- Voucher Date
- Original Sale Bill No + Date (reference lookup)
- Credit Account (GL Popup — e.g., Sales Returns A/c)
- Customer Code + Name (GL Popup → Debtor)
- Customer Address (auto-fill from GL Master)
- State / GSTIN (for IGST vs CGST determination)

**Item Grid:**
- SL# | Item Code | Item Name (search popup) | HSN | Unit | Qty | Rate | Disc% | Amount

**Footer Calculations:**
- Gross Amount (auto)
- Discount %  + Amount (editable)
- Taxable Amount (auto)
- CGST % + CGST Amt (auto if intra-state)
- SGST % + SGST Amt (auto if intra-state)
- IGST % + IGST Amt (auto if inter-state)
- Round Off (auto)
- **Net Amount** (auto)

---

### 3.7 `debit_notes` + `debit_note_items`
> Issued to suppliers for goods returned or under-billed

Same structure as credit_notes but:
- Party = Supplier (Creditor)
- Debit Account = Purchase Returns A/c
- Ref Bill = Purchase Bill No

**Required Data Entry Fields (Debit Note):** Same as Credit Note, with:
- Supplier Code + Name (instead of Customer)
- Debit Account (Purchase Returns or Expense head)
- Original Purchase Bill No + Date

---

### 3.8 GST Compliance Tables (read-only computed)

No new storage needed — GST reports query existing tables:
- **Sales Bills** (`sales_bills` + `sales_bill_items`) — GSTR-1 outward supplies
- **Purchase Bills** (`purchase_bills` + `purchase_bill_items`) — GSTR-2 inward supplies
- **Credit Notes** → included in GSTR-1 as negative supplies
- **Debit Notes** → included in GSTR-2 as negative purchases

---

## 📊 Part 4 — Reports Needed (No New Tables)

| Report | Data Source | AMA Reference |
|--------|------------|---------------|
| **General Ledger** | All vouchers filtered by GL account + date | `general_ledger.py` |
| **Trial Balance** | GL master + all postings aggregated | `trial_balance.py` |
| **Cash Book** | Vouchers where GL = Cash account | `repo_cash_book.py` |
| **Bank Book** | Vouchers where GL = Bank account | `repo_bank_book.py` |
| **Debtor Outstanding** | Sales bills − receipts per customer | `repo_debtor_balance.py` |
| **Creditor Outstanding** | Purchase bills − payments per supplier | `repo_creditor_balance.py` |
| **GSTR-1 Sales Register** | Sales bills + credit notes by date range | `repo_gst.py` |
| **GSTR-1 B2B** | Filtered to GSTIN holders only | `repo_gst.py` |
| **GSTR-1 B2C** | Consumers without GSTIN | `repo_gst.py` |
| **GSTR-1 HSN Summary** | Aggregated by HSN code | `repo_gst.py` |
| **GSTR-3B Summary** | Tax head-wise aggregation | `repo_gst.py` |
| **Purchase GST Register** | Purchase bills + debit notes | `repo_purchase_gst.py` |
| **Sales Register** | All sales bills in period | `repo_sales_reg.py` |
| **Purchase Register** | All purchase bills in period | `repo_purchase_register.py` |

---

## 🔗 Part 5 — How Pet ERP Data Feeds Accounts

### Sales Bill → Accounts Receivable

```
SalesBill (confirmed) 
    ↓ AUTO-CREATES
    gl_posting: DR → Owner/Customer GL Account (gl_party_id on PetOwner)
               CR → Sales Revenue A/c
               CR → CGST Payable / SGST Payable / IGST Payable

Receipt Voucher (when owner pays)
    ↓ AUTO-CREATES
    gl_posting: DR → Cash/Bank GL
               CR → Owner/Customer GL Account
               CR → Advance Payments A/c (if adjusted)
```

### Purchase Bill → Accounts Payable

```
PurchaseBill (confirmed)
    ↓ AUTO-CREATES
    gl_posting: DR → Purchase/Medicine Expense A/c
               DR → CGST Input / SGST Input / IGST Input
               CR → Supplier GL Account (linked via Supplier.gl_account_id)

Payment Voucher (when supplier is paid)
    ↓ AUTO-CREATES
    gl_posting: DR → Supplier GL Account
               CR → Cash/Bank GL
               DR → Advance Payments A/c (if advance used)
```

### Missing Link: PetOwner needs GL Account

```python
# PetOwner model needs:
gl_account_id = Column(Integer, ForeignKey("gl_master.gl_id"), nullable=True)
# Auto-create GL entry when creating owner:
# Group: "Liabilities > Debtors"
# gl_code: "DEB-" + owner_code
```

---

## 📋 Part 6 — Complete Data Entry Checklist

### Before Accounts Can Work — One-Time Setup

| Setup Item | Where | What to Enter |
|-----------|-------|--------------|
| **Financial Year** | Settings → FY | Start date, End date, mark as current |
| **GL Master seed** | Ledger page | Run migration SQL to create system accounts |
| **Clinic/Company GST** | Clinic Setup | GSTIN, State Code (for CGST vs IGST determination) |
| **Bank Account in GL** | Ledger | Create Bank accounts with sub-group "Bank" |
| **Cash Account in GL** | Ledger | Already seeded as system account |
| **GST accounts in GL** | Ledger | CGST Payable, SGST Payable, IGST Payable, GST Input accounts |
| **Opening Balances** | Settings → Opening | Enter Dr/Cr balance for each GL account at FY start |

### Per-Transaction Data Entry

| Module | Who Enters | Key Fields |
|--------|-----------|-----------|
| **Sales Bill** | Reception/Doctor | Owner, Pet, Services/Medicines, GST auto-calculated |
| **Receipt Voucher** | Cashier | Owner, Cash/Bank, Amount, Bill selection |
| **Purchase Bill** | Pharmacy/Store | Supplier, Items, Batch, Expiry, Rate, GST |
| **Payment Voucher** | Accounts | Supplier, Cash/Bank, Amount, Bill selection |
| **Advance Payment** | Accounts | Supplier/Customer, Amount, Cheque details |
| **Bank Arrival** | Accounts | Customer, Bank, Cheque/NEFT details |
| **Credit Note** | Accounts/Reception | Customer, Original bill ref, Returned items |
| **Debit Note** | Accounts | Supplier, Original PO ref, Returned items |
| **Journal Voucher** | Accounts | Multi-leg DR/CR entries, must balance |

---

## 🏗️ Part 7 — Implementation Roadmap

### Phase A — Foundation (Backend Models + SQL)
1. Create migration SQL: `advance_payments`, `bank_arrivals`, `payment_vouchers`, `payment_voucher_details`
2. Extend `receipt_vouchers` + create `receipt_voucher_details`
3. Create `journal_vouchers` + `journal_lines`
4. Create `credit_notes` + `credit_note_items`
5. Create `debit_notes` + `debit_note_items`
6. Add `gl_account_id` to `PetOwner` model
7. Create `gl_postings` audit table (auto-generated double-entry)

### Phase B — API Routes
8. `POST/GET/PUT/DELETE /accounts/advance-payments`
9. `POST/GET/PUT/DELETE /accounts/bank-arrivals`
10. `POST/GET/PUT/DELETE /accounts/receipt-vouchers` (with bill-fetch endpoint)
11. `POST/GET/PUT/DELETE /accounts/payment-vouchers` (with bill-fetch endpoint)
12. `POST/GET/PUT/DELETE /accounts/journal-vouchers`
13. `POST/GET/PUT/DELETE /accounts/credit-notes`
14. `POST/GET/PUT/DELETE /accounts/debit-notes`
15. `GET /reports/gst/*` (sales register, B2B, HSN, 3B, purchase)
16. `GET /reports/general-ledger`
17. `GET /reports/trial-balance`
18. `GET /reports/cash-book`
19. `GET /reports/bank-book`
20. `GET /reports/debtor-outstanding`
21. `GET /reports/creditor-outstanding`

### Phase C — Frontend Pages
22. **AdvancePayments.jsx** — voucher form with party + cashbank popups
23. **BankArrivals.jsx** — receipt recording form
24. **ReceiptVoucher.jsx** — customer payment with bill-wise grid
25. **PaymentVoucher.jsx** — supplier payment with bill-wise grid
26. **JournalVoucher.jsx** — multi-row DR/CR entry grid
27. **CreditNote.jsx** — item-wise note with GST calculation
28. **DebitNote.jsx** — item-wise note with GST calculation
29. **GSTReports.jsx** — tabbed: Sales Register / B2B / HSN / 3B / Purchase
30. **AccountsReports.jsx** — tabbed: GL / Trial Balance / Cash Book / Bank Book / Debtor / Creditor

### Phase D — Sidebar & Routing
31. Add "Accounts" section to `Sidebar.jsx`
32. Add all routes to `App.jsx`

---

## 🔑 Part 8 — Critical GL Accounts to Seed

The following accounts must exist in `gl_master` before the accounts module works:

```
Group: Assets > Cash & Bank
  - CASH       | Petty Cash
  - BANK-001   | Main Bank Account (SBI / HDFC etc.)

Group: Assets > Debtors / Receivables
  - DEB-CTRL   | Debtors Control Account
  - DEB-{code} | Per Owner (auto-created on owner creation)

Group: Liabilities > Creditors / Payables
  - CRED-CTRL  | Creditors Control Account
  - CRED-{code}| Per Supplier (auto-created)

Group: Liabilities > GST Payable
  - GST-CGST-PAY | CGST Payable
  - GST-SGST-PAY | SGST Payable
  - GST-IGST-PAY | IGST Payable

Group: Assets > GST Input Credit
  - GST-CGST-IN  | CGST Input
  - GST-SGST-IN  | SGST Input
  - GST-IGST-IN  | IGST Input

Group: Income > Sales
  - SALES-VET  | Veterinary Services Income
  - SALES-MED  | Medicine Sales Income
  - SALES-RET  | Sales Returns (CR)

Group: Expense > Purchases
  - PURCH-MED  | Medicine Purchases
  - PURCH-RET  | Purchase Returns (DR)

Group: Liabilities > Advance
  - ADV-SUP    | Advance to Suppliers
  - ADV-CUST   | Advance from Customers
```

---

## ⚠️ Open Questions / Decisions Needed

> [!IMPORTANT]
> **Q1: GL Auto-Creation for Owners/Suppliers?**
> Should the system auto-create a GL account for each new Pet Owner (customer) and Supplier, or use control accounts (one "Debtors Control" account for all owners)?
> **Recommendation:** Auto-create individual GL per party (like AMA's `glmast`) for detailed debtor/creditor tracking.

> [!IMPORTANT]
> **Q2: Double-Entry Posting — Automatic or Manual?**
> When a Sales Bill is confirmed, should the system auto-create the DR/CR posting in `gl_postings`, or rely on manual journal vouchers?
> **Recommendation:** Auto-post on bill confirmation (like AMA does implicitly through report queries).

> [!IMPORTANT]
> **Q3: Existing `SalesBill` Balances**
> There are existing confirmed sales bills. Should the receipt voucher look at `sales_bills` table for AR tracking, or the older `billing_master` table?
> **Decision needed from business.**

> [!WARNING]
> **Q4: Multi-Company Support**
> The Pet ERP has company/tenant infrastructure. Should accounts be company-scoped (separate GL per company)?

> [!NOTE]
> **Q5: GST Filing Format**
> Indian GST portal accepts JSON (for Tally-style upload) or direct API. Do you need JSON export for GSTN portal, or just PDF/Excel for manual filing?

---

## 📁 Part 9 — Files to Create / Modify

### New Backend Files
| File | Purpose |
|------|---------|
| `backend/models/accounts.py` | AdvancePayment, BankArrival, PaymentVoucher, PaymentVoucherDetail, JournalVoucher, JournalLine, CreditNote, CreditNoteItem, DebitNote, DebitNoteItem, GLPosting |
| `backend/routes/accounts.py` | All CRUD routes for above |
| `backend/routes/reports.py` | GST reports, GL, Trial Balance, Cash/Bank Book, Outstanding |
| `backend/schemas/accounts.py` | Pydantic schemas for all account modules |
| `backend/migrations/accounts_v1.sql` | Full DDL for new tables |

### Modified Backend Files
| File | Change |
|------|--------|
| `backend/models/phase4.py` | Add fields to ReceiptVoucher, add ReceiptVoucherDetail |
| `backend/models/phase3.py` | PurchaseBill: add `paid_amount`, `balance_amount` computed fields |
| `backend/models/people.py` | PetOwner: add `gl_account_id` FK |
| `backend/models/__init__.py` | Import new models |
| `backend/main.py` | Register new routers |

### New Frontend Files
| File | Purpose |
|------|---------|
| `frontend/src/pages/AdvancePayments.jsx` | |
| `frontend/src/pages/BankArrivals.jsx` | |
| `frontend/src/pages/ReceiptVoucher.jsx` | |
| `frontend/src/pages/PaymentVoucher.jsx` | |
| `frontend/src/pages/JournalVoucher.jsx` | |
| `frontend/src/pages/CreditNote.jsx` | |
| `frontend/src/pages/DebitNote.jsx` | |
| `frontend/src/pages/GSTReports.jsx` | |
| `frontend/src/pages/AccountsReports.jsx` | |

### Modified Frontend Files
| File | Change |
|------|--------|
| `frontend/src/App.jsx` | Add 9 new routes |
| `frontend/src/components/Sidebar.jsx` | Add "Accounts" nav section |

---

*Document prepared: 2026-06-07 | Pet ERP Accounts Module Planning*
