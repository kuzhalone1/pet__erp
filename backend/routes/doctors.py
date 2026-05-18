"""routes/doctors.py — Doctor and Staff CRUD"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.doctors import Doctor, Staff
from schemas.doctors import (
    DoctorCreate, DoctorUpdate, DoctorOut,
    StaffCreate, StaffUpdate, StaffOut
)
from utils.doc_sequence import get_next_doc_no
from utils.gl_utils import create_gl_account

router = APIRouter(tags=["Doctors & Staff"])


# ─── DOCTORS ─────────────────────────────────────────────────
@router.get("/doctors", response_model=List[DoctorOut])
def list_doctors(
    search: Optional[str] = Query(None), 
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db)
):
    q = db.query(Doctor)
    if not include_inactive:
        q = q.filter(Doctor.is_active == True)
    if search:
        q = q.filter(Doctor.name.ilike(f"%{search}%"))
    return q.order_by(Doctor.name).all()


@router.get("/doctors/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doc


@router.post("/doctors", response_model=DoctorOut)
def create_doctor(data: DoctorCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    if not payload.get("doctor_code"):
        payload["doctor_code"] = get_next_doc_no(db, "DR")
    
    # Auto-create GL Account
    gl_id = create_gl_account("doctor", data.name, db, **data.model_dump(exclude={"name"}))
    payload["gl_account_id"] = gl_id
    
    doc = Doctor(**payload)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.put("/doctors/{doctor_id}", response_model=DoctorOut)
def update_doctor(doctor_id: int, data: DoctorUpdate, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(doc, k, v)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/doctors/{doctor_id}")
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doc.is_active = False
    db.commit()
    return {"message": "Doctor deactivated"}


@router.put("/doctors/{doctor_id}/reactivate", response_model=DoctorOut)
def reactivate_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doc = db.query(Doctor).filter(Doctor.doctor_id == doctor_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doc.is_active = True
    db.commit()
    db.refresh(doc)
    return doc


# ─── STAFF ───────────────────────────────────────────────────
@router.get("/staff", response_model=List[StaffOut])
def list_staff(
    search: Optional[str] = Query(None), 
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db)
):
    q = db.query(Staff)
    if not include_inactive:
        q = q.filter(Staff.is_active == True)
    if search:
        q = q.filter(Staff.name.ilike(f"%{search}%"))
    return q.order_by(Staff.name).all()


@router.get("/staff/{staff_id}", response_model=StaffOut)
def get_staff(staff_id: int, db: Session = Depends(get_db)):
    s = db.query(Staff).filter(Staff.staff_id == staff_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Staff not found")
    return s


@router.post("/staff", response_model=StaffOut)
def create_staff(data: StaffCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    if not payload.get("staff_code"):
        payload["staff_code"] = get_next_doc_no(db, "ST")
    
    # Auto-create GL Account
    gl_id = create_gl_account("staff", data.name, db, **data.model_dump(exclude={"name"}))
    payload["gl_account_id"] = gl_id
    
    s = Staff(**payload)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.put("/staff/{staff_id}", response_model=StaffOut)
def update_staff(staff_id: int, data: StaffUpdate, db: Session = Depends(get_db)):
    s = db.query(Staff).filter(Staff.staff_id == staff_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Staff not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/staff/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db)):
    s = db.query(Staff).filter(Staff.staff_id == staff_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Staff not found")
    s.is_active = False
    db.commit()
    return {"message": "Staff deactivated"}


@router.put("/staff/{staff_id}/reactivate", response_model=StaffOut)
def reactivate_staff(staff_id: int, db: Session = Depends(get_db)):
    s = db.query(Staff).filter(Staff.staff_id == staff_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Staff not found")
    s.is_active = True
    db.commit()
    db.refresh(s)
    return s
