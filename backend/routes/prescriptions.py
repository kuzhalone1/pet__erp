"""routes/prescriptions.py — E-Prescription CRUD"""
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from database import get_db
from models.phase2 import Prescription, PrescriptionItem, Consultation
from models.clinic import ClinicSetup
from models.people import Pet, PetOwner
from models.doctors import Doctor
from schemas.prescriptions import (
    PrescriptionCreate, PrescriptionUpdate, PrescriptionOut, RxItemOut
)
from utils.doc_sequence import get_next_doc_no
from utils.pdf_generator import generate_prescription_pdf

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


def _get_items(db: Session, prescription_id: int) -> List[RxItemOut]:
    return db.query(PrescriptionItem).filter(
        PrescriptionItem.prescription_id == prescription_id
    ).all()


@router.get("", response_model=List[PrescriptionOut])
def list_prescriptions(db: Session = Depends(get_db)):
    rxs = db.query(Prescription).order_by(Prescription.rx_date.desc()).limit(200).all()
    for rx in rxs:
        rx.items = _get_items(db, rx.prescription_id)
    return rxs


@router.get("/consult/{consult_id}", response_model=List[PrescriptionOut])
def rx_by_consult(consult_id: int, db: Session = Depends(get_db)):
    rxs = db.query(Prescription).filter(Prescription.consult_id == consult_id).all()
    for rx in rxs:
        rx.items = _get_items(db, rx.prescription_id)
    return rxs


@router.get("/pet/{pet_id}", response_model=List[PrescriptionOut])
def rx_by_pet(pet_id: int, db: Session = Depends(get_db)):
    rxs = db.query(Prescription).filter(
        Prescription.pet_id == pet_id
    ).order_by(Prescription.rx_date.desc()).all()
    for rx in rxs:
        rx.items = _get_items(db, rx.prescription_id)
    return rxs


@router.get("/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(prescription_id: int, db: Session = Depends(get_db)):
    rx = db.query(Prescription).filter(Prescription.prescription_id == prescription_id).first()
    if not rx:
        raise HTTPException(404, "Prescription not found")
    rx.items = _get_items(db, rx.prescription_id)
    return rx


@router.post("", response_model=PrescriptionOut)
def create_prescription(data: PrescriptionCreate, db: Session = Depends(get_db)):
    if not data.items:
        raise HTTPException(400, "Prescription must have at least one medicine")

    rx_no = get_next_doc_no(db, "RX")
    rx = Prescription(
        rx_no=rx_no,
        rx_date=date.today(),
        consult_id=data.consult_id,
        pet_id=data.pet_id,
        owner_id=data.owner_id,
        doctor_id=data.doctor_id,
        notes=data.notes,
    )
    db.add(rx); db.flush()

    for item in data.items:
        ri = PrescriptionItem(prescription_id=rx.prescription_id, **item.model_dump())
        db.add(ri)

    db.commit(); db.refresh(rx)
    rx.items = _get_items(db, rx.prescription_id)
    return rx


@router.put("/{prescription_id}", response_model=PrescriptionOut)
def update_prescription(prescription_id: int, data: PrescriptionUpdate, db: Session = Depends(get_db)):
    rx = db.query(Prescription).filter(Prescription.prescription_id == prescription_id).first()
    if not rx:
        raise HTTPException(404, "Prescription not found")
    if rx.dispensed:
        raise HTTPException(400, "Cannot edit a dispensed prescription")

    if data.notes is not None:
        rx.notes = data.notes

    if data.items is not None:
        db.query(PrescriptionItem).filter(
            PrescriptionItem.prescription_id == prescription_id
        ).delete()
        for item in data.items:
            ri = PrescriptionItem(prescription_id=prescription_id, **item.model_dump())
            db.add(ri)

    db.commit(); db.refresh(rx)
    rx.items = _get_items(db, rx.prescription_id)
    return rx


@router.get("/{prescription_id}/pdf")
def download_prescription_pdf(prescription_id: int, db: Session = Depends(get_db)):
    # 1. Fetch main record
    rx = db.query(Prescription).filter(Prescription.prescription_id == prescription_id).first()
    if not rx: raise HTTPException(404, "Prescription not found")
    
    # 2. Fetch all relations
    items = _get_items(db, prescription_id)
    clinic = db.query(ClinicSetup).first()
    if not clinic: raise HTTPException(404, "Clinic info not setup")
    
    pet = db.query(Pet).filter(Pet.pet_id == rx.pet_id).first()
    owner = db.query(PetOwner).filter(PetOwner.owner_id == rx.owner_id).first()
    doctor = db.query(Doctor).filter(Doctor.doctor_id == rx.doctor_id).first()
    
    # 3. Generate PDF
    try:
        pdf_bytes = generate_prescription_pdf(rx, clinic, pet, owner, doctor, items)
    except Exception as e:
        raise HTTPException(500, f"PDF Generation Error: {str(e)}")
        
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Prescription_{rx.rx_no}.pdf"
        }
    )
