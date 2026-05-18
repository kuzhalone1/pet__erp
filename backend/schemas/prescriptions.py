"""schemas/prescriptions.py"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


class RxItemCreate(BaseModel):
    medicine_name: str
    dosage_form: Optional[str] = None
    strength: Optional[str] = None
    dose: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    duration_days: Optional[int] = None
    instructions: Optional[str] = None
    quantity: Optional[Decimal] = None


class RxItemOut(BaseModel):
    rx_item_id: int
    prescription_id: int
    medicine_id: Optional[int]
    medicine_name: str
    dosage_form: Optional[str]
    strength: Optional[str]
    dose: Optional[str]
    frequency: Optional[str]
    route: Optional[str]
    duration_days: Optional[int]
    instructions: Optional[str]
    quantity: Optional[Decimal]
    dispensed_qty: Optional[Decimal]

    class Config:
        from_attributes = True


class PrescriptionCreate(BaseModel):
    consult_id: int
    pet_id: int
    owner_id: int
    doctor_id: int
    notes: Optional[str] = None
    items: List[RxItemCreate]


class PrescriptionUpdate(BaseModel):
    notes: Optional[str] = None
    items: Optional[List[RxItemCreate]] = None


class PrescriptionOut(BaseModel):
    prescription_id: int
    rx_no: str
    rx_date: date
    consult_id: int
    pet_id: int
    owner_id: int
    doctor_id: int
    notes: Optional[str]
    dispensed: bool
    created_at: Optional[datetime]
    items: Optional[List[RxItemOut]] = []

    class Config:
        from_attributes = True
