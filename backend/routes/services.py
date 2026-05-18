from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.stage3 import Procedure, Vaccine
from schemas.services import (
    ProcedureCreate, ProcedureOut,
    VaccineCreate, VaccineOut
)
from utils.doc_sequence import get_next_doc_no

router = APIRouter(prefix="/services", tags=["Services"])

# ── PROCEDURES ───────────────────────────────────────────────
@router.get("/procedures", response_model=List[ProcedureOut])
def list_procedures(search: Optional[str] = Query(None), include_inactive: bool = Query(False), db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    q = db.query(Procedure).options(joinedload(Procedure.gst_rate))
    if not include_inactive:
        q = q.filter(Procedure.is_active == True)
    if search:
        q = q.filter(Procedure.procedure_name.ilike(f"%{search}%") | Procedure.procedure_code.ilike(f"%{search}%"))
    
    results = q.order_by(Procedure.procedure_name).all()
    for p in results:
        p.gst_pct = p.gst_rate.gst_percent if p.gst_rate else 18
    return results

@router.post("/procedures", response_model=ProcedureOut)
def create_procedure(data: ProcedureCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    if not payload.get("procedure_code"):
        payload["procedure_code"] = get_next_doc_no(db, "PROCEDURE")
    p = Procedure(**payload)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

@router.put("/procedures/{procedure_id}", response_model=ProcedureOut)
def update_procedure(procedure_id: int, data: ProcedureCreate, db: Session = Depends(get_db)):
    p = db.query(Procedure).filter(Procedure.procedure_id == procedure_id).first()
    if not p: raise HTTPException(404, "Procedure not found")
    for k, v in data.model_dump().items(): setattr(p, k, v)
    db.commit(); db.refresh(p)
    return p

# ── VACCINES ─────────────────────────────────────────────────
@router.get("/vaccines", response_model=List[VaccineOut])
def list_vaccines(species_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Vaccine).filter(Vaccine.is_active == True)
    if species_id:
        q = q.filter(Vaccine.species_id == species_id)
    return q.order_by(Vaccine.vaccine_name).all()

@router.post("/vaccines", response_model=VaccineOut)
def create_vaccine(data: VaccineCreate, db: Session = Depends(get_db)):
    v = Vaccine(**data.model_dump())
    db.add(v)
    db.commit()
    db.refresh(v)
    return v
