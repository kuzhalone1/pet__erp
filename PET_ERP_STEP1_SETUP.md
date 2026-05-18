# 🐾 Pet Clinic ERP — Step 1: Project Setup Guide
**For Antigravity | April 2026**

---

## 🧑‍💻 What You (The Developer) Must Do First
> These are one-time manual installs on your machine. Antigravity cannot do these for you.

### 1. Install Python (if not already)
- Download from: https://www.python.org/downloads/
- Version: **3.11 or higher**
- ✅ During install, check **"Add Python to PATH"**
- Verify: open terminal → `python --version`

### 2. Install Node.js (for frontend)
- Download from: https://nodejs.org/
- Version: **LTS (20.x or higher)**
- Verify: `node --version` and `npm --version`

### 3. Install PostgreSQL
- Download from: https://www.postgresql.org/download/
- Version: **16.x**
- During install, set a password for the `postgres` user — **remember this password**
- Default port: `5432` — leave as is
- Verify: open pgAdmin or terminal → `psql -U postgres`

### 4. Install Git (if not already)
- Download from: https://git-scm.com/downloads
- Verify: `git --version`

### 5. Install VS Code (recommended editor)
- Download from: https://code.visualstudio.com/
- Install extensions: **Python**, **Pylance**, **ESLint**, **Prettier**

### 6. Create the Project Folder
Open your terminal and run:
```bash
mkdir pet_erp
cd pet_erp
```
> All work from here happens inside this `pet_erp` folder.

---

## 🤖 What Antigravity Will Do
> Hand this document to Antigravity. It will create everything below inside `pet_erp/`.

---

## 📁 Final Folder Structure to Create

```
pet_erp/
│
├── backend/                        ← Python FastAPI server
│   ├── main.py                     ← App entry point
│   ├── database.py                 ← PostgreSQL connection
│   ├── config.py                   ← Environment config
│   ├── requirements.txt            ← Python dependencies
│   │
│   ├── models/                     ← Database table definitions (SQLAlchemy)
│   │   ├── __init__.py
│   │   ├── clinic.py               ← clinic_setup table
│   │   ├── users.py                ← users + roles table
│   │   ├── masters.py              ← city, species, breed tables
│   │   ├── people.py               ← pet_owners, pets tables
│   │   └── doctors.py              ← doctors, staff tables
│   │
│   ├── routes/                     ← API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py                 ← Login / logout / JWT
│   │   ├── clinic.py               ← Clinic setup endpoints
│   │   ├── masters.py              ← City, species, breed endpoints
│   │   ├── owners.py               ← Pet owner CRUD
│   │   ├── pets.py                 ← Pet CRUD
│   │   └── doctors.py             ← Doctor/staff CRUD
│   │
│   └── schemas/                    ← Pydantic request/response models
│       ├── __init__.py
│       ├── auth.py
│       ├── clinic.py
│       ├── masters.py
│       ├── owners.py
│       ├── pets.py
│       └── doctors.py
│
├── frontend/                       ← React web UI
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── main.jsx                ← React entry point
│       ├── App.jsx                 ← Router + layout
│       ├── api.js                  ← Axios base config
│       │
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── ClinicSetup.jsx
│       │   ├── Masters.jsx         ← City / Species / Breed
│       │   ├── PetOwners.jsx
│       │   ├── Pets.jsx
│       │   └── Doctors.jsx
│       │
│       └── components/
│           ├── Sidebar.jsx
│           ├── Topbar.jsx
│           ├── Table.jsx           ← Reusable data table
│           └── FormModal.jsx       ← Reusable add/edit modal
│
├── database/
│   ├── init.sql                    ← All CREATE TABLE statements (Postgres)
│   └── seed.sql                    ← Sample data for testing
│
├── .env                            ← Environment variables (DB password etc.)
├── .env.example                    ← Template for .env (safe to commit)
├── .gitignore
└── README.md
```

---

## 🗄️ Database Tables — Step 1 (Foundation Only)

Antigravity will create these 9 tables in `database/init.sql`:

| # | Table | Purpose |
|---|---|---|
| 1 | `clinic_setup` | Clinic name, address, GSTIN, logo, reg number |
| 2 | `users` | Login credentials, role, linked to staff/doctor |
| 3 | `cities` | City master (reused from textile ERP logic) |
| 4 | `species` | Dog, Cat, Bird, Rabbit, etc. |
| 5 | `breeds` | Labrador, Persian, etc. — linked to species |
| 6 | `pet_owners` | Owner name, phone, address, city |
| 7 | `pets` | Pet name, DOB, gender, linked to owner + breed |
| 8 | `doctors` | Vet details, qualification, fee, reg number |
| 9 | `staff` | Receptionist, nurse, pharmacist — non-doctor staff |

---

## 🔌 Backend — What Gets Built

### `requirements.txt` will include:
```
fastapi==0.111.0
uvicorn==0.29.0
sqlalchemy==2.0.30
psycopg2-binary==2.9.9
python-jose==3.3.0
passlib==1.7.4
python-dotenv==1.0.1
pydantic==2.7.1
bcrypt==4.1.3
python-multipart==0.0.9
```

### `.env` file template:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pet_erp
DB_USER=postgres
DB_PASSWORD=your_password_here
SECRET_KEY=your_secret_key_here_make_it_long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

### API Endpoints — Step 1:

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/auth/login` | Login, returns JWT token |
| GET | `/auth/me` | Get logged-in user info |
| GET/POST | `/clinic/setup` | Get or save clinic profile |
| GET/POST | `/masters/cities` | List and add cities |
| GET/POST | `/masters/species` | List and add species |
| GET/POST | `/masters/breeds` | List and add breeds |
| GET/POST/PUT | `/owners` | Pet owner CRUD |
| GET/POST/PUT | `/pets` | Pet CRUD |
| GET/POST/PUT | `/doctors` | Doctor/vet CRUD |
| GET/POST/PUT | `/staff` | Staff CRUD |

---

## 🖥️ Frontend — What Gets Built

### Tech Stack:
- **React 18** with Vite (fast dev server)
- **Tailwind CSS** (responsive, works on tablet + desktop)
- **React Router v6** (page navigation)
- **Axios** (API calls)
- **React Hot Toast** (notifications)

### Pages in Step 1:

| Page | What it shows |
|---|---|
| `/login` | Login form with clinic logo placeholder |
| `/dashboard` | Welcome screen, quick stats (owners, pets, doctors count) |
| `/clinic-setup` | Clinic profile form |
| `/masters` | Tabs: City / Species / Breed — list + add |
| `/owners` | Pet owners list + add/edit modal |
| `/pets` | Pets list + add/edit modal (with owner linkage) |
| `/doctors` | Doctors list + add/edit modal |

### Sidebar Navigation:
```
🏥 Clinic Setup
📋 Masters
    └── City
    └── Species & Breed
👤 Pet Owners
🐾 Pets
👨‍⚕️ Doctors & Staff
```

---

## ⚙️ How to Run — After Antigravity Builds It

### Step A: Create the database
```bash
# Open terminal, login to postgres
psql -U postgres

# Inside psql:
CREATE DATABASE pet_erp;
\q

# Run the init script
psql -U postgres -d pet_erp -f database/init.sql
psql -U postgres -d pet_erp -f database/seed.sql
```

### Step B: Start the backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
> Backend runs at: http://localhost:8000
> API docs at: http://localhost:8000/docs

### Step C: Start the frontend
```bash
cd frontend
npm install
npm run dev
```
> Frontend runs at: http://localhost:5173

### Step D: Open from any device on same WiFi
On a tablet or another laptop connected to the same WiFi:
```
http://<your-pc-ip>:5173
```
> Find your PC's IP: run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) → look for IPv4 address like `192.168.1.10`

---

## 🔐 Default Login After Setup

Antigravity will insert one default admin user in `seed.sql`:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |
| Role | `admin` |

> **Change this immediately after first login.**

---

## ✅ Step 1 Deliverable Checklist

When Antigravity is done, you should be able to:

- [ ] Run `uvicorn main:app --reload` with no errors
- [ ] Open `http://localhost:8000/docs` and see all API endpoints
- [ ] Run `npm run dev` and open the frontend
- [ ] Login with admin / admin123
- [ ] Add a city, species, breed
- [ ] Add a pet owner
- [ ] Add a pet linked to an owner
- [ ] Add a doctor
- [ ] See the dashboard with live counts
- [ ] Open the same URL on a tablet/phone on the same WiFi

---

## 📌 Notes for Antigravity

1. Use **SQLAlchemy ORM** for all database models — not raw SQL queries in routes.
2. All passwords must be **bcrypt hashed** — never store plain text.
3. All routes except `/auth/login` must be **JWT protected**.
4. Frontend must use **Tailwind CSS** — no Bootstrap, no Material UI.
5. The UI must be **responsive** — sidebar collapses on tablet, stacks on mobile.
6. Keep all forms in **modals** (not separate pages) for fast data entry.
7. Every list table must have **search/filter** by name.
8. Use **React Hot Toast** for success/error notifications.
9. `.env` file must be in `.gitignore` — never commit credentials.
10. Seed file must include: 5 sample cities, 5 species (Dog/Cat/Bird/Rabbit/Hamster), 10 common breeds.

---

*Pet Clinic ERP — Step 1 Setup Plan | Antigravity | April 2026*
