"""schemas/doctors.py — Doctor and Staff schemas"""
from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime
from decimal import Decimal


# ─── DOCTOR ──────────────────────────────────────────────────
class DoctorBase(BaseModel):
    name:               str
    qualification:      Optional[str] = None
    specialization:     Optional[str] = None
    reg_number:         Optional[str] = None
    phone:              Optional[str] = None
    alt_phone:          Optional[str] = None
    email:              Optional[str] = None

    # Address
    address1:           Optional[str] = None
    address2:           Optional[str] = None
    address3:           Optional[str] = None
    city_id:            Optional[int] = None
    district:           Optional[str] = None
    state_name:         Optional[str] = None
    state_code:         Optional[str] = None
    pincode:            Optional[str] = None

    # Tax
    pan:                Optional[str] = None

    consultation_fee:   Optional[Decimal] = Decimal("0")
    follow_up_fee:      Optional[Decimal] = Decimal("0")
    emergency_fee:      Optional[Decimal] = Decimal("0")
    available_days:     Optional[str] = None
    available_from:     Optional[time] = None
    available_to:       Optional[time] = None
    notes:              Optional[str] = None
    doj:                Optional[date] = None
    salary:             Optional[Decimal] = Decimal("0")
    salary_type:        Optional[str] = "Fixed"
    opening_balance:    Optional[Decimal] = Decimal("0")
    balance_type:       Optional[str] = "CR"
    gl_account_id:      Optional[int] = None
    is_active:          bool = True


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(DoctorBase):
    pass


class DoctorOut(DoctorBase):
    doctor_id:  int
    doctor_code: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── STAFF ───────────────────────────────────────────────────
class StaffBase(BaseModel):
    name:       str
    role:       Optional[str] = None
    phone:      Optional[str] = None
    alt_phone:  Optional[str] = None
    email:      Optional[str] = None
    address:    Optional[str] = None # legacy
    address1:   Optional[str] = None
    address2:   Optional[str] = None
    address3:   Optional[str] = None
    city_id:    Optional[int] = None
    district:   Optional[str] = None
    state_name: Optional[str] = None
    state_code: Optional[str] = None
    pincode:    Optional[str] = None
    pan:        Optional[str] = None
    doj:        Optional[date] = None
    salary:     Optional[Decimal] = Decimal("0")
    notes:      Optional[str] = None
    opening_balance: Optional[Decimal] = Decimal("0")
    balance_type:    Optional[str] = "CR"
    gl_account_id:   Optional[int] = None
    is_active:  bool = True


class StaffCreate(StaffBase):
    pass


class StaffUpdate(StaffBase):
    pass


class StaffOut(StaffBase):
    staff_id:   int
    staff_code: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
