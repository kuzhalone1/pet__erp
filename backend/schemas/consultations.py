"""schemas/consultations.py"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime
from decimal import Decimal


class ProcedureOut(BaseModel):
    procedure_id: int
    procedure_code: str
    procedure_name: str
    category: Optional[str]
    fee: Optional[Decimal]
    is_active: bool

    class Config:
        from_attributes = True


class ProcedureCreate(BaseModel):
    procedure_code: str
    procedure_name: str
    category: Optional[str] = None
    fee: Optional[Decimal] = 0


class ConsultProcedureCreate(BaseModel):
    procedure_id: int
    quantity: int = 1
    fee: Optional[Decimal] = None
    notes: Optional[str] = None


class ConsultProcedureOut(BaseModel):
    cp_id: int
    consult_id: int
    procedure_id: int
    quantity: int
    fee: Optional[Decimal]
    notes: Optional[str]

    class Config:
        from_attributes = True


class ConsultationCreate(BaseModel):
    consult_date: date
    consult_time: time
    appointment_id: Optional[int] = None
    pet_id: int
    owner_id: int
    doctor_id: int
    visit_type: str = "OPD"
    chief_complaint: Optional[str] = None
    temp_celsius: Optional[Decimal] = None
    weight_kg: Optional[Decimal] = None
    heart_rate: Optional[int] = None
    resp_rate: Optional[int] = None
    clinical_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    advice: Optional[str] = None
    followup_date: Optional[date] = None
    followup_notes: Optional[str] = None
    consult_fee: Optional[Decimal] = 0
    procedures: Optional[List[ConsultProcedureCreate]] = []


class ConsultationUpdate(BaseModel):
    chief_complaint: Optional[str] = None
    temp_celsius: Optional[Decimal] = None
    weight_kg: Optional[Decimal] = None
    heart_rate: Optional[int] = None
    resp_rate: Optional[int] = None
    clinical_notes: Optional[str] = None
    diagnosis: Optional[str] = None
    advice: Optional[str] = None
    followup_date: Optional[date] = None
    followup_notes: Optional[str] = None
    consult_fee: Optional[Decimal] = None
    procedures: Optional[List[ConsultProcedureCreate]] = None


class ConsultationOut(BaseModel):
    consult_id: int
    consult_no: str
    consult_date: date
    consult_time: time
    appointment_id: Optional[int]
    pet_id: int
    owner_id: int
    doctor_id: int
    visit_type: str
    chief_complaint: Optional[str]
    temp_celsius: Optional[Decimal]
    weight_kg: Optional[Decimal]
    heart_rate: Optional[int]
    resp_rate: Optional[int]
    clinical_notes: Optional[str]
    diagnosis: Optional[str]
    advice: Optional[str]
    followup_date: Optional[date]
    followup_notes: Optional[str]
    consult_fee: Optional[Decimal]
    status: str
    closed_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True
