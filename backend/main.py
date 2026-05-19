"""
main.py — Pet Clinic ERP Backend Entry Point
Run: uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import create_engine, text
from database import engine, master_engine, get_engine_for_db, Base, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, MASTER_DB_NAME
import models  # noqa: F401 — ensures all models are registered
from utils.doc_sequence import init_sequences_for_db

from routes import auth, clinic, masters, owners, pets, doctors
from routes.appointments import router as appt_router, schedule_router
from routes.consultations import router as consult_router, proc_router
from routes.prescriptions import router as rx_router
from routes.vaccines import router as vaccine_router
from routes.inventory import router as inv_router
from routes.pharmacy import router as phm_router
from routes.ledger import router as ledger_router
from routes.agents import router as agents_router
from routes.users import router as users_router
from routes.billing import router as billing_router
from routes.services import router as services_router
from routes.companies import router as companies_router

# ─── Ensure Master Database Exists Before Creating Tables ─────────────────
try:
    root_engine = create_engine(f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/postgres", isolation_level="AUTOCOMMIT")
    with root_engine.connect() as conn:
        res = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{MASTER_DB_NAME}'"))
        if not res.fetchone():
            print(f"⚠️ Master database '{MASTER_DB_NAME}' does not exist. Auto-creating...")
            conn.execute(text(f"CREATE DATABASE {MASTER_DB_NAME}"))
            print(f"✅ Created database '{MASTER_DB_NAME}' successfully.")
except Exception as e:
    print(f"⚠️ Could not check/create master database automatically: {e}")

# ─── Create all tables in both Master DB and Company DB ─────────────────
Base.metadata.create_all(bind=master_engine)
Base.metadata.create_all(bind=engine)

# ─── Auto-Seed Default Admin & Company if Empty (Cloud Hardening) ───────────
try:
    # 1. Seed Master User
    from models.master_sys import MasterUser, CompanyProfile, Tenant
    from models.users import User
    from database import MasterSessionLocal, SessionLocal, DB_NAME
    from utils.encryption import encrypt_db_uri
    
    m_db = MasterSessionLocal()
    try:
        # Tenant
        if not m_db.query(Tenant).filter_by(tenant_id=1).first():
            m_db.add(Tenant(tenant_id=1, tenant_name="Default Tenant", email="admin@petclinicerp.com", password_hash="$2b$12$.OTMdc4ivJApNDSoFAOgnevbFmic/bRFAFJi80iY5jI70n0FpcUw."))
            m_db.commit()
            
        # MasterUser
        if not m_db.query(MasterUser).filter_by(email="admin@petclinicerp.com").first():
            m_db.add(MasterUser(
                tenant_id=1, full_name="System Admin", email="admin@petclinicerp.com",
                password_hash="$2b$12$.OTMdc4ivJApNDSoFAOgnevbFmic/bRFAFJi80iY5jI70n0FpcUw.", phone="1234567890", is_active=True
            ))
            m_db.commit()
            
        # CompanyProfile
        if not m_db.query(CompanyProfile).filter_by(company_code="DEF").first():
            db_uri_plain = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
            m_db.add(CompanyProfile(
                tenant_id=1, company_code="DEF", company_name="Default Pet Clinic", db_name=DB_NAME,
                db_uri=encrypt_db_uri(db_uri_plain), address_line1="Main Clinic Address", city="Metropolis",
                state="State", pincode="123456", current_fy="2026-27", status="Active"
            ))
            m_db.commit()
    finally:
        m_db.close()
        
    # 2. Seed Company User (admin / admin123)
    c_db = SessionLocal()
    try:
        if not c_db.query(User).filter_by(username="admin").first():
            c_db.add(User(
                username="admin", password_hash="$2b$12$.OTMdc4ivJApNDSoFAOgnevbFmic/bRFAFJi80iY5jI70n0FpcUw.",
                full_name="System Administrator", role="Admin", email="admin@petclinic.com", is_active=True
            ))
            c_db.commit()
    finally:
        c_db.close()
except Exception as e:
    print(f"⚠️ Auto-seeding check failed: {e}")

# ─── Initialize Document Sequences for Default DB & All Company DBs ─────────
try:
    print("🔄 Initializing document sequences and PL/pgSQL functions for primary DB...")
    init_sequences_for_db(engine)
    print("✅ Primary DB sequences initialized successfully.")
    
    # Iterate over all registered company databases
    with master_engine.connect() as m_conn:
        res = m_conn.execute(text("SELECT db_name FROM company_profiles WHERE status = 'Active'"))
        for row in res.fetchall():
            c_db_name = row[0]
            try:
                print(f"🔄 Initializing sequences and checking migrations for company DB '{c_db_name}'...")
                c_engine = get_engine_for_db(c_db_name)
                Base.metadata.create_all(bind=c_engine)
                init_sequences_for_db(c_engine)
                
                # Auto-migrate fy_code column if missing in Phase 3 tables
                with c_engine.connect() as c_conn:
                    for t_name in ["purchase_bills", "pharmacy_bills", "sales_bills", "stock_ledger"]:
                        try:
                            c_conn.execute(text(f"ALTER TABLE {t_name} ADD COLUMN fy_code VARCHAR(10)"))
                            c_conn.commit()
                            print(f"➕ Added missing column 'fy_code' to {t_name} in '{c_db_name}'.")
                        except Exception:
                            c_conn.rollback()  # Column already exists
                print(f"✅ Company DB '{c_db_name}' sequences and migrations checked successfully.")
            except Exception as sub_e:
                print(f"⚠️ Could not init sequences/migrations for '{c_db_name}': {sub_e}")
except Exception as e:
    print(f"⚠️ Global sequence initialization check: {e}")

# ─── Auto-Migrate Master DB Columns if missing ──────────────────────────────
try:
    with master_engine.connect() as conn:
        columns = [
            ("address_line2", "VARCHAR(200)"),
            ("address_line3", "VARCHAR(200)"),
            ("district", "VARCHAR(100)"),
            ("state_code", "VARCHAR(5)"),
            ("phone", "VARCHAR(20)"),
            ("alt_phone", "VARCHAR(20)"),
            ("email", "VARCHAR(100)"),
            ("website", "VARCHAR(200)"),
            ("reg_number", "VARCHAR(100)"),
            ("established_on", "DATE"),
        ]
        for col_name, col_type in columns:
            try:
                conn.execute(text(f"ALTER TABLE company_profiles ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"➕ Added missing column '{col_name}' to company_profiles.")
            except Exception:
                conn.rollback()  # Column already exists
except Exception as e:
    print(f"⚠️ Master DB column migration check: {e}")

# ─── FastAPI App ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="🐾 Pet Clinic ERP",
    description="Full-featured ERP for Pet Clinics — Consultation, Pharmacy, Billing & more",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ─── CORS (Explicitly list Vercel & Localhost for Mobile/Production CORS) ────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000", 
        "http://localhost:8000", 
        "https://pet-erp-six.vercel.app",
        "https://pet-erp-git-main-kuzhalone.vercel.app"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register Routers ─────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(clinic.router)
app.include_router(masters.router)
app.include_router(owners.router)
app.include_router(pets.router)
app.include_router(doctors.router)
# Stage 1 & 2 additions
app.include_router(ledger_router)
app.include_router(agents_router)
app.include_router(users_router)
# Phase 2 — Clinical Core
app.include_router(appt_router)
app.include_router(schedule_router)
app.include_router(consult_router)
app.include_router(proc_router)
app.include_router(rx_router)
app.include_router(vaccine_router)
# Phase 3 — Pharmacy, Stock & Billing
app.include_router(inv_router)
app.include_router(phm_router)
app.include_router(billing_router)
app.include_router(services_router)
# Master System — Companies
app.include_router(companies_router)


# ─── Health Check Endpoint ───────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "status": "✅ Pet Clinic ERP is running",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
