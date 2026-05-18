"""routes/appointments.py — Appointment booking, check-in, and doctor schedule"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import date, datetime

from database import get_db
from models.phase2 import Appointment, DoctorSchedule, Consultation
from models.doctors import Doctor
from models.people import Pet, PetOwner
from schemas.appointments import (
    AppointmentCreate, AppointmentUpdate, AppointmentOut,
    DoctorScheduleCreate, DoctorScheduleOut
)
from utils.doc_sequence import get_next_doc_no

router = APIRouter(prefix="/appointments", tags=["Appointments"])
schedule_router = APIRouter(prefix="/doctor-schedule", tags=["Doctor Schedule"])


# ── DOCTOR SCHEDULE ─────────────────────────────────────────

@schedule_router.get("/{doctor_id}", response_model=List[DoctorScheduleOut])
def get_schedule(doctor_id: int, db: Session = Depends(get_db)):
    return db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id == doctor_id,
        DoctorSchedule.is_active == True
    ).all()


@schedule_router.post("", response_model=DoctorScheduleOut)
def upsert_schedule(data: DoctorScheduleCreate, db: Session = Depends(get_db)):
    existing = db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id == data.doctor_id,
        DoctorSchedule.day_of_week == data.day_of_week
    ).first()
    if existing:
        for k, v in data.model_dump().items():
            setattr(existing, k, v)
        db.commit(); db.refresh(existing); return existing
    s = DoctorSchedule(**data.model_dump())
    db.add(s); db.commit(); db.refresh(s)
    return s


@schedule_router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    s = db.query(DoctorSchedule).filter(DoctorSchedule.schedule_id == schedule_id).first()
    if not s:
        raise HTTPException(404, "Schedule not found")
    s.is_active = False
    db.commit()
    return {"message": "Schedule deactivated"}


# ── APPOINTMENTS ─────────────────────────────────────────────

@router.get("", response_model=List[AppointmentOut])
def list_appointments(
    appt_date: Optional[date] = Query(None),
    doctor_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    pet_id: Optional[int] = Query(None),
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Appointment)
    if appt_date:
        q = q.filter(Appointment.appt_date == appt_date)
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if status:
        q = q.filter(Appointment.status == status)
    if pet_id:
        q = q.filter(Appointment.pet_id == pet_id)
    return q.order_by(Appointment.appt_date, Appointment.appt_time).offset(skip).limit(limit).all()


@router.get("/{appt_id}", response_model=AppointmentOut)
def get_appointment(appt_id: int, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.appt_id == appt_id).first()
    if not a:
        raise HTTPException(404, "Appointment not found")
    return a


@router.post("", response_model=AppointmentOut)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db)):
    appt_no = get_next_doc_no(db, "APT")
    appt = Appointment(appt_no=appt_no, **data.model_dump())
    db.add(appt); db.commit(); db.refresh(appt)
    return appt


@router.put("/{appt_id}", response_model=AppointmentOut)
def update_appointment(appt_id: int, data: AppointmentUpdate, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.appt_id == appt_id).first()
    if not a:
        raise HTTPException(404, "Appointment not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit(); db.refresh(a)
    return a


@router.put("/{appt_id}/checkin", response_model=AppointmentOut)
def checkin(appt_id: int, db: Session = Depends(get_db)):
    """Check-in: marks appointment as Arrived. Consultation is created separately by doctor."""
    a = db.query(Appointment).filter(Appointment.appt_id == appt_id).first()
    if not a:
        raise HTTPException(404, "Appointment not found")
    
    # If already arrived, this could be a mistake, but we allow 're-checkin' or just ignore
    # Let's add a separate undo checkin route if needed, or just allow Scheduled -> Arrived.
    if a.status not in ("Scheduled", "Cancelled", "No-Show"):
         # If already In-Consultation or Completed, don't allow reverting via check-in
         raise HTTPException(400, f"Cannot check-in appointment with status '{a.status}'")
    
    a.status = "Arrived"
    a.arrived_at = datetime.utcnow()
    db.commit(); db.refresh(a)
    return a


@router.put("/{appt_id}/undo-checkin", response_model=AppointmentOut)
def undo_checkin(appt_id: int, db: Session = Depends(get_db)):
    """Reverts status from Arrived back to Scheduled."""
    a = db.query(Appointment).filter(Appointment.appt_id == appt_id).first()
    if not a:
        raise HTTPException(404, "Appointment not found")
    if a.status != "Arrived":
        raise HTTPException(400, "Can only undo check-in for 'Arrived' appointments")
    
    a.status = "Scheduled"
    a.arrived_at = None
    db.commit(); db.refresh(a)
    return a


@router.put("/{appt_id}/cancel")
def cancel_appointment(appt_id: int, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.appt_id == appt_id).first()
    if not a:
        raise HTTPException(404, "Appointment not found")
    if a.status in ("Completed", "In-Consultation"):
        raise HTTPException(400, f"Cannot cancel an appointment that is '{a.status}'")
    a.status = "Cancelled"
    db.commit()
    return {"message": "Appointment cancelled"}


@router.put("/{appt_id}/no-show")
def no_show(appt_id: int, db: Session = Depends(get_db)):
    a = db.query(Appointment).filter(Appointment.appt_id == appt_id).first()
    if not a:
        raise HTTPException(404, "Appointment not found")
    if a.status in ("Completed", "In-Consultation"):
        raise HTTPException(400, f"Cannot mark as no-show an appointment that is '{a.status}'")
    a.status = "No-Show"
    db.commit()
    return {"message": "Marked as no-show"}


@router.get("/slots/{doctor_id}")
def available_slots(
    doctor_id: int,
    appt_date: date = Query(...),
    db: Session = Depends(get_db)
):
    """Return available time slots for a doctor on a given date."""
    # Get doctor's schedule for this day (0=Mon … 6=Sun)
    dow = appt_date.weekday()
    sched = db.query(DoctorSchedule).filter(
        DoctorSchedule.doctor_id == doctor_id,
        DoctorSchedule.day_of_week == dow,
        DoctorSchedule.is_active == True
    ).first()
    if not sched:
        return {"slots": [], "message": "Doctor not available on this day"}

    # Get booked slots
    booked = db.query(Appointment.appt_time).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appt_date == appt_date,
        Appointment.status.notin_(["Cancelled", "No-Show"])
    ).all()
    booked_times = {str(b[0])[:5] for b in booked}

    # Generate all slots
    from datetime import datetime, timedelta
    slot_start = datetime.combine(appt_date, sched.start_time)
    slot_end   = datetime.combine(appt_date, sched.end_time)
    duration   = timedelta(minutes=sched.slot_duration)

    slots = []
    while slot_start + duration <= slot_end:
        t = slot_start.strftime("%H:%M")
        slots.append({"time": t, "available": t not in booked_times})
        slot_start += duration

    return {"slots": slots, "date": str(appt_date), "doctor_id": doctor_id}
