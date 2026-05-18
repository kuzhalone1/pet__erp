from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# ── PROCEDURES ───────────────────────────────────────────────
class ProcedureBase(BaseModel):
    procedure_code: Optional[str] = None
    procedure_name: str
    category: Optional[str] = None
    fee: Decimal = Decimal("0")
    hsn_id: Optional[int] = None
    gst_rate_id: Optional[int] = None
    is_active: bool = True

class ProcedureCreate(ProcedureBase):
    pass

class ProcedureOut(ProcedureBase):
    procedure_id: int
    gst_pct: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ── VACCINES ─────────────────────────────────────────────────
class VaccineBase(BaseModel):
    vaccine_name: str
    species_id: int
    dose_number: int = 1
    interval_days: int = 0
    medicine_id: Optional[int] = None
    is_active: bool = True

class VaccineCreate(VaccineBase):
    pass

class VaccineOut(VaccineBase):
    vaccine_id: int
    created_at: datetime

    class Config:
        from_attributes = True
