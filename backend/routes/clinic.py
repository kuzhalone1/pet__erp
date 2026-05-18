"""routes/clinic.py — Clinic Setup endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.clinic import ClinicSetup
from schemas.clinic import ClinicSetupCreate, ClinicSetupUpdate, ClinicSetupOut

router = APIRouter(prefix="/clinic", tags=["Clinic Setup"])


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
