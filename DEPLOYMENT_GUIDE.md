# 🚀 Pet ERP — Production Deployment Guide (Vercel & Railway)

This comprehensive guide outlines the complete blueprint for deploying your full-stack Pet ERP system to **Vercel** (Frontend) and **Railway** (Backend & PostgreSQL). E.g. it includes project cleanup recommendations, directory structuring, environment variable configurations, and step-by-step deployment instructions.

---

## 🧹 1. Project Cleanup & Structuring

Before pushing your repository to GitHub/GitLab for deployment, clean up development artifacts, local database dumps, and one-off scratch scripts to keep your repository lightweight and secure.

### 🗑️ Files to Delete or Add to `.gitignore`
1. **`database/pet_erp_backup_may06.sql` (158 MB)**: Massive local database dump. Do not commit this to Git.
2. **`backend/pet_erp.db`**: Legacy SQLite local development database file.
3. **`scratch/` & `backend/scratch/`**: One-off debug, inspection, and local migration scripts.
4. **`*.bat` Windows Scripts**: (`debug_backend.bat`, `reset_admin_password.bat`, `start_backend.bat`, `start_frontend.bat`). Not needed for Linux-based cloud containers.
5. **`docs/` Migration**: Move all root planning files (`COMPANY_AND_PET_BOOK_PLAN.md`, `PetERP_Stage4_Requirements.docx`, `PET_ERP_EXECUTION_PLAN_V2.md`, etc.) into a dedicated `docs/` folder to keep your root directory clean.

### 📁 Final Production Directory Structure
```text
pet_erp/
├── .gitignore
├── README.md
├── DEPLOYMENT_GUIDE.md
├── docs/                     # Moved planning & requirements docs
├── database/                 # DDL schemas and migration scripts
│   ├── init.sql
│   ├── seed.sql
│   └── doc_sequences.sql
├── backend/                  # Railway Production Backend
│   ├── requirements.txt      # Production dependencies
│   ├── main.py               # FastAPI entry point
│   ├── config.py             # Environment config
│   ├── database.py           # Engine & Session management
│   ├── models/
│   ├── routes/
│   ├── schemas/
│   └── utils/
└── frontend/                 # Vercel Production Frontend
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
```

---

## 🚂 2. Backend & Database Deployment (Railway)

Railway is the ideal platform for hosting both your PostgreSQL database and your Python FastAPI backend in the same private network.

### Step 2.1: Provision PostgreSQL Database
1. Log in to [Railway.app](https://railway.app) and create a **New Project**.
2. Select **Provision PostgreSQL**.
3. Once deployed, click on the PostgreSQL card, go to **Connect**, and copy the **Database URL** (e.g., `postgresql://postgres:password@containers-us-west-XX.railway.app:5432/railway`).

### Step 2.2: Deploy FastAPI Backend
1. In the same Railway project, click **+ New** -> **GitHub Repo** and select your `pet_erp` repository.
2. Go to the newly created service settings -> **General** -> **Root Directory** and set it to:
   ```text
   /backend
   ```
   *(This tells Railway's Nixpacks builder to look for `backend/requirements.txt` and `backend/main.py`).*
3. Go to **Variables** and add the following environment variables:
   ```env
   DATABASE_URL=postgresql://postgres:password@containers-us-west-XX.railway.app:5432/railway
   SECRET_KEY=your_super_secret_production_jwt_key_here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=480
   PORT=8000
   ```
   *(Note: Replace `DATABASE_URL` with your actual Railway connection string. Railway also allows you to reference `${{Postgres.DATABASE_URL}}` dynamically).*

4. Go to **Networking** -> **Public Networking** and click **Generate Domain** (e.g., `pet-erp-backend-production.up.railway.app`). Copy this URL for your frontend configuration.

### Step 2.3: Initialize Database Schema
When the backend container starts, `backend/main.py` will connect to your Railway PostgreSQL instance. E.g. to ensure all tables, sequences, and initial seeds are created:
1. Railway provides a built-in PostgreSQL query runner or CLI. E.g. you can run the contents of `database/init.sql`, `database/seed.sql`, and `database/doc_sequences.sql` directly in the Railway Postgres console, OR let SQLAlchemy `Base.metadata.create_all(bind=master_engine)` generate the initial tables.

---

## ⚡ 3. Frontend Deployment (Vercel)

Vercel provides lightning-fast global CDN deployment for Vite/React applications.

### Step 3.1: Configure Environment Variables
In your local `frontend/src/api.js`, the base URL points to `http://localhost:8000`. E.g. for production, it should use an environment variable:
```javascript
// frontend/src/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```
*(Ensure `frontend/src/api.js` uses `import.meta.env.VITE_API_BASE_URL`).*

### Step 3.2: Deploy on Vercel
1. Log in to [Vercel.com](https://vercel.com) and click **Add New** -> **Project**.
2. Import your `pet_erp` GitHub repository.
3. In the **Configure Project** section:
   * **Framework Preset**: Vite
   * **Root Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   ```env
   VITE_API_BASE_URL=https://pet-erp-backend-production.up.railway.app
   ```
   *(Replace with your actual Railway public domain generated in Step 2.2).*
5. Click **Deploy**. Vercel will build your React application and provide a live production URL (e.g., `https://pet-erp-frontend.vercel.app`).

---

## 🔒 4. Post-Deployment Verification & CORS

Once both services are live:
1. **CORS Configuration**: Ensure `backend/main.py` includes your Vercel domain in the allowed origins:
   ```python
   # backend/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:5173", "https://pet-erp-frontend.vercel.app"], # Add Vercel URL
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```
2. **Login Test**: Open your Vercel URL, enter the default admin credentials (`admin` / `admin123`), and verify successful authentication and multi-tenant database routing.
3. **Master Data Test**: Go to the **Masters** page and verify that GST rates, HSN codes, and Units load correctly from the Railway database.

🎉 **Your Pet ERP system is now fully deployed, secure, and running in production!**
