# 🐾 Pet Clinic ERP — Step 1

Full-stack Pet Clinic ERP built with:
- **Backend**: Python FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: React 18 + Vite + Tailwind CSS

---

## 🚀 Quick Start

### Step 1 — Create the Database

Open **pgAdmin** or run in terminal:

```powershell
# Find your psql path (PostgreSQL 18)
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE pet_erp;"

# Run the schema
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d pet_erp -f database/init.sql

# Run seed data
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d pet_erp -f database/seed.sql
```

### Step 2 — Configure Environment

1. Open `.env` in this folder
2. Replace `your_postgres_password_here` with your actual PostgreSQL password

### Step 3 — Start Backend

```powershell
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Backend: http://localhost:8000  
API Docs: http://localhost:8000/docs

### Step 4 — Start Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

### Step 5 — Login

| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin123 | Admin |

> **Change your password after first login!**

---

## 📁 Folder Structure

```
pet_erp/
├── backend/          ← FastAPI server
│   ├── main.py
│   ├── database.py
│   ├── config.py
│   ├── requirements.txt
│   ├── models/       ← SQLAlchemy ORM models
│   ├── routes/       ← API endpoints
│   └── schemas/      ← Pydantic schemas
├── frontend/         ← React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/    ← Login, Dashboard, Masters, etc.
│   │   └── components/ ← Sidebar, Table, Modal...
│   └── package.json
├── database/
│   ├── init.sql      ← All table definitions
│   └── seed.sql      ← Sample data
├── .env              ← Your database password (DO NOT COMMIT)
└── README.md
```

---

## 🌐 Access from Tablet / Phone

1. Find your PC's IP: run `ipconfig` → look for IPv4 like `192.168.1.10`
2. On the tablet browser: `http://192.168.1.10:5173`

---

## ✅ Step 1 Deliverables

- [x] Login with JWT authentication
- [x] Clinic Setup form
- [x] Masters — City, Species, Breed
- [x] Pet Owners — CRUD with search
- [x] Pets — CRUD with owner & species linkage
- [x] Doctors & Staff — CRUD
- [x] Live Dashboard with counts

---

*Pet Clinic ERP — Step 1 | Built with Antigravity*
