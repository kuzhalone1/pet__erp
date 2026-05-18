"""routes/consultations.py — OPD consultation and procedures master CRUD"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime

from database import get_db
from models.stage3 import (
    Procedure as ProcedureMaster
)
from models.phase2 import (
    Consultation, ConsultationProcedure, Appointment
)
from schemas.consultations import (
    ConsultationCreate, ConsultationUpdate, ConsultationOut,
    ProcedureCreate, ProcedureOut,
    ConsultProcedureCreate, ConsultProcedureOut
)
from utils.doc_sequence import get_next_doc_no

router = APIRouter(prefix="/consultations", tags=["Consultations"])
proc_router = APIRouter(prefix="/procedures-master", tags=["Procedures Master"])


# ── PROCEDURES MASTER ─────────────────────────────────────────

@proc_router.get("", response_model=List[ProcedureOut])
def list_procedures(db: Session = Depends(get_db)):
    return db.query(ProcedureMaster).filter(ProcedureMaster.is_active == True).order_by(ProcedureMaster.procedure_name).all()


@proc_router.post("", response_model=ProcedureOut)
def create_procedure(data: ProcedureCreate, db: Session = Depends(get_db)):
    # Auto-generate procedure code
    count = db.query(ProcedureMaster).count()
    code = f"PROC{count + 1:03d}"
    p = ProcedureMaster(procedure_code=code, **data.model_dump())
    db.add(p); db.commit(); db.refresh(p)
    return p


@proc_router.put("/{procedure_id}", response_model=ProcedureOut)
def update_procedure(procedure_id: int, data: ProcedureCreate, db: Session = Depends(get_db)):
    p = db.query(ProcedureMaster).filter(ProcedureMaster.procedure_id == procedure_id).first()
    if not p:
        raise HTTPException(404, "Procedure not found")
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit(); db.refresh(p)
    return p


# ── CONSULTATIONS ─────────────────────────────────────────────

@router.get("", response_model=List[ConsultationOut])
def list_consultations(
    consult_date: Optional[date] = Query(None),
    doctor_id: Optional[int] = Query(None),
    pet_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Consultation)
    if consult_date:
        q = q.filter(Consultation.consult_date == consult_date)
    if doctor_id:
        q = q.filter(Consultation.doctor_id == doctor_id)
    if pet_id:
        q = q.filter(Consultation.pet_id == pet_id)
    if status:
        q = q.filter(Consultation.status == status)
    return q.order_by(Consultation.consult_date.desc(), Consultation.consult_time.desc()).offset(skip).limit(limit).all()


@router.get("/pet/{pet_id}", response_model=List[ConsultationOut])
def pet_history(pet_id: int, db: Session = Depends(get_db)):
    """Full visit history for a pet — most recent first."""
    return db.query(Consultation).filter(
        Consultation.pet_id == pet_id
    ).order_by(Consultation.consult_date.desc()).all()


@router.get("/{consult_id}", response_model=ConsultationOut)
def get_consultation(consult_id: int, db: Session = Depends(get_db)):
    c = db.query(Consultation).filter(Consultation.consult_id == consult_id).first()
    if not c:
        raise HTTPException(404, "Consultation not found")
    return c


@router.get("/{consult_id}/procedures", response_model=List[ConsultProcedureOut])
def get_consult_procedures(consult_id: int, db: Session = Depends(get_db)):
    return db.query(ConsultationProcedure).filter(
        ConsultationProcedure.consult_id == consult_id
    ).all()


@router.post("", response_model=ConsultationOut)
def create_consultation(data: ConsultationCreate, db: Session = Depends(get_db)):
    consult_no = get_next_doc_no(db, "CON")
    payload = data.model_dump(exclude={"procedures"})
    c = Consultation(consult_no=consult_no, **payload)
    db.add(c); db.flush()

    # Save procedures
    for proc in (data.procedures or []):
        cp = ConsultationProcedure(consult_id=c.consult_id, **proc.model_dump())
        db.add(cp)

    # If linked to appointment, update it
    if data.appointment_id:
        appt = db.query(Appointment).filter(Appointment.appt_id == data.appointment_id).first()
        if appt:
            appt.status = "In-Consultation"
            appt.consult_id = c.consult_id

    db.commit(); db.refresh(c)
    return c


@router.put("/{consult_id}", response_model=ConsultationOut)
def update_consultation(consult_id: int, data: ConsultationUpdate, db: Session = Depends(get_db)):
    c = db.query(Consultation).filter(Consultation.consult_id == consult_id).first()
    if not c:
        raise HTTPException(404, "Consultation not found")
    if c.status == "Billed":
        raise HTTPException(400, "Cannot edit a billed consultation")

    for k, v in data.model_dump(exclude={"procedures"}, exclude_unset=True).items():
        setattr(c, k, v)

    # Replace procedures if provided
    if data.procedures is not None:
        db.query(ConsultationProcedure).filter(ConsultationProcedure.consult_id == consult_id).delete()
        for proc in data.procedures:
            cp = ConsultationProcedure(consult_id=consult_id, **proc.model_dump())
            db.add(cp)

    db.commit(); db.refresh(c)
    return c


@router.put("/{consult_id}/close", response_model=ConsultationOut)
def close_consultation(consult_id: int, db: Session = Depends(get_db)):
    """Close consultation — marks as Closed and sets closed_at timestamp."""
    c = db.query(Consultation).filter(Consultation.consult_id == consult_id).first()
    if not c:
        raise HTTPException(404, "Consultation not found")
    if c.status != "Open":
        raise HTTPException(400, f"Consultation is already '{c.status}'")
    c.status = "Closed"
    c.closed_at = datetime.utcnow()

    # Update linked appointment to Completed
    if c.appointment_id:
        appt = db.query(Appointment).filter(Appointment.appt_id == c.appointment_id).first()
        if appt:
            appt.status = "Completed"

    db.commit(); db.refresh(c)
    return c
