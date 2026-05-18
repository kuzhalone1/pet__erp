"""schemas/owners.py — Pet Owner schemas"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from schemas.pets import PetSummary


class PetOwnerBase(BaseModel):
    name:               str
    address:            Optional[str] = None # legacy
    address1:           Optional[str] = None
    address2:           Optional[str] = None
    address3:           Optional[str] = None
    city_id:            Optional[int] = None
    city_name:          Optional[str] = None # legacy
    district:           Optional[str] = None
    state:              Optional[str] = None # legacy
    state_name:         Optional[str] = None
    state_code:         Optional[str] = None
    pincode:            Optional[str] = None
    phone:              str
    alt_phone:          Optional[str] = None
    email:              Optional[str] = None
    gstin:              Optional[str] = None
    pan:                Optional[str] = None
    notes:              Optional[str] = None
    agent_id:           Optional[int] = None
    is_active:          bool = True
    opening_balance:    Optional[Decimal] = Decimal("0")
    balance_type:       Optional[str] = "DR"
    discount_pct:       Optional[Decimal] = Decimal("0")
    gl_account_id:      Optional[int] = None


class PetOwnerCreate(PetOwnerBase):
    pass


class PetOwnerUpdate(PetOwnerBase):
    pass


class PetOwnerOut(PetOwnerBase):
    owner_id:   int
    owner_code: str
    pet_count:  Optional[int] = 0
    pets:       Optional[List[PetSummary]] = []
    agent_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
