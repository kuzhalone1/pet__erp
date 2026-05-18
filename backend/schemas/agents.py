"""schemas/agents.py — Agent / Referral Master schemas"""
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from datetime import datetime


class AgentBase(BaseModel):
    name:             str
    clinic_name:      Optional[str] = None
    phone:            Optional[str] = None
    alt_phone:        Optional[str] = None
    email:            Optional[str] = None
    address:          Optional[str] = None # legacy
    address1:         Optional[str] = None
    address2:         Optional[str] = None
    address3:         Optional[str] = None
    city_id:          Optional[int] = None
    district:         Optional[str] = None
    state_name:       Optional[str] = None
    state_code:       Optional[str] = None
    pincode:          Optional[str] = None
    gstin:            Optional[str] = None
    pan:              Optional[str] = None
    commission_type:  str = "Flat"            # Flat | Percent of Bill | Per Visit
    commission_rate:  Optional[Decimal] = Decimal("0")
    opening_balance:  Optional[Decimal] = Decimal("0")
    balance_type:     str = "CR"              # CR = we owe agent; DR = agent owes us
    gl_account_id:    Optional[int] = None
    notes:            Optional[str] = None


class AgentCreate(AgentBase):
    pass


class AgentUpdate(AgentBase):
    pass


class AgentOut(AgentBase):
    agent_id:   int
    agent_code: str
    city_name:  Optional[str] = None
    is_active:  bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
