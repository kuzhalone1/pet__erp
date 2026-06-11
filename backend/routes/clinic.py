from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from database import get_db
from models.clinic import ClinicSetup
from schemas.clinic import ClinicSetupCreate, ClinicSetupUpdate, ClinicSetupOut
from config import DB_CLEAN_PASSWORD
from utils.doc_sequence import init_sequences_for_db

router = APIRouter(prefix="/clinic", tags=["Clinic Setup"])


class ClearDataPayload(BaseModel):
    password: str


@router.post("/clear-data")
def clear_database_data(payload: ClearDataPayload, db: Session = Depends(get_db)):
    if payload.password != DB_CLEAN_PASSWORD:
        raise HTTPException(status_code=400, detail="Invalid database clear password")
    
    try:
        # 1. Fetch all tables from the public schema dynamically
        res = db.execute(text(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
        ))
        all_tables = [row[0] for row in res.fetchall()]
        
        # 2. Define tables that must be preserved
        preserve_tables = {
            "users", 
            "financial_years", 
            "cities", 
            "species", 
            "breeds", 
            "hsn_codes", 
            "gst_rates", 
            "clinic_setup", 
            "units"
        }
        
        # 3. Filter tables to truncate
        tables_to_truncate = [t for t in all_tables if t not in preserve_tables]
        
        if tables_to_truncate:
            # Join table names and truncate them CASCADE
            truncate_sql = f"TRUNCATE TABLE {', '.join(tables_to_truncate)} CASCADE;"
            db.execute(text(truncate_sql))
            db.commit()
            
            # 4. Re-initialize doc_sequences and units on the active connection engine
            engine_bind = db.get_bind()
            init_sequences_for_db(engine_bind)
            
            # 5. Re-seed system GL accounts in gl_master
            system_gls = [
                ('CASH',       'Cash in Hand',              'Cash',             'Cash',                True, 'DR'),
                ('BANK',       'Bank Account',              'Bank',             'Bank',                True, 'DR'),
                ('DEBTOR',     'Sundry Debtors',            'Debtors',          'Current Assets',      True, 'DR'),
                ('CREDITOR',   'Sundry Creditors',          'Creditors',        'Current Liabilities', True, 'CR'),
                ('CONSULT_INC','Consultation Income',       'Income',           'Service Income',      True, 'CR'),
                ('PHARMA_SALE','Pharmacy Sales',            'Income',           'Sales Income',        True, 'CR'),
                ('PROC_INC',   'Procedure Income',          'Income',           'Service Income',      True, 'CR'),
                ('MED_PURCH',  'Medicine Purchase',         'Expense',          'Direct Expense',      True, 'DR'),
                ('SALARY_EXP', 'Salary & Wages',            'Expense',          'Indirect Expense',    True, 'DR'),
                ('CGST_PAY',   'CGST Payable',              'Duties & Taxes',   'Tax Liabilities',     True, 'CR'),
                ('SGST_PAY',   'SGST Payable',              'Duties & Taxes',   'Tax Liabilities',     True, 'CR'),
                ('IGST_PAY',   'IGST Payable',              'Duties & Taxes',   'Tax Liabilities',     True, 'CR'),
                ('CGST_INPUT', 'CGST Input Credit',         'Duties & Taxes',   'Current Assets',      True, 'DR'),
                ('SGST_INPUT', 'SGST Input Credit',         'Duties & Taxes',   'Current Assets',      True, 'DR'),
                ('IGST_INPUT', 'IGST Input Credit',         'Duties & Taxes',   'Current Assets',      True, 'DR'),
                ('DISC_ALLOW', 'Discount Allowed',          'Expense',          'Indirect Expense',    True, 'DR'),
                ('COMM_EXP',   'Agent Commission',          'Expense',          'Indirect Expense',    True, 'DR'),
                ('CAPITAL',    'Owner Capital',             'Capital',          'Capital Account',     True, 'CR'),
                ('RETAIN',     'Retained Earnings',         'Capital',          'Capital Account',     True, 'CR')
            ]
            for code, name, grp, sub_grp, is_sys, bal_type in system_gls:
                db.execute(text("""
                    INSERT INTO gl_master (gl_code, gl_name, group_name, sub_group, is_system, balance_type)
                    VALUES (:code, :name, :grp, :sub_grp, :is_sys, :bal_type)
                    ON CONFLICT (gl_code) DO NOTHING;
                """), {"code": code, "name": name, "grp": grp, "sub_grp": sub_grp, "is_sys": is_sys, "bal_type": bal_type})
            db.commit()

            # 6. Re-seed default admin user
            db.execute(text("""
                INSERT INTO users (username, password_hash, full_name, role, email, is_active)
                VALUES ('admin', '$2b$12$3HQ7TYW3eaDm.JBWjwnafOTGDWsqXHPqpc7RkvJ9wjni9XNiHAyu6', 'System Administrator', 'Admin', 'admin@petclinic.com', true)
                ON CONFLICT (username) DO NOTHING;
            """))
            db.commit()
            
            return {"status": "success", "message": "All transaction and client data cleared successfully. System metadata preserved."}
        else:
            return {"status": "success", "message": "No tables found to clear."}
            
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear database: {str(e)}")



@router.get("/setup", response_model=ClinicSetupOut)
def get_clinic(db: Session = Depends(get_db)):
    clinic = db.query(ClinicSetup).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not set up yet")
    return clinic


@router.post("/setup", response_model=ClinicSetupOut)
def create_clinic(data: ClinicSetupCreate, db: Session = Depends(get_db)):
    existing = db.query(ClinicSetup).first()
    if existing:
        raise HTTPException(status_code=400, detail="Clinic already configured. Use PUT to update.")
    clinic = ClinicSetup(**data.model_dump())
    db.add(clinic)
    db.commit()
    db.refresh(clinic)
    return clinic


@router.put("/setup", response_model=ClinicSetupOut)
def update_clinic(data: ClinicSetupUpdate, db: Session = Depends(get_db)):
    clinic = db.query(ClinicSetup).first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(clinic, key, value)
    db.commit()
    db.refresh(clinic)
    return clinic
