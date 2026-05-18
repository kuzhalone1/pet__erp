"""schemas/appointments.py"""
from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime


class AppointmentCreate(BaseModel):
    appt_date: date
    appt_time: time
    pet_id: int
    owner_id: int
    doctor_id: int
    reason: Optional[str] = None
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    appt_date: Optional[date] = None
    appt_time: Optional[time] = None
    doctor_id: Optional[int] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class AppointmentOut(BaseModel):
    appt_id: int
    appt_no: str
    appt_date: date
    appt_time: time
    pet_id: int
    owner_id: int
    doctor_id: int
    reason: Optional[str]
    status: str
    arrived_at: Optional[datetime]
    consult_id: Optional[int]
    notes: Optional[str]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class DoctorScheduleCreate(BaseModel):
    doctor_id: int
    day_of_week: int          # 0=Mon … 6=Sun
    start_time: time
    end_time: time
    slot_duration: int = 15


class DoctorScheduleOut(BaseModel):
    schedule_id: int
    doctor_id: int
    day_of_week: int
    start_time: time
    end_time: time
    slot_duration: int
    is_active: bool

    class Config:
        from_attributes = True
