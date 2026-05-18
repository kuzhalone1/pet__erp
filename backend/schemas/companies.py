"""
companies.py — Pydantic schemas for Company Management
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date

class CompanyCreate(BaseModel):
    tenant_id: int
    company_code: str = Field(..., max_length=10)
    company_name: str = Field(..., max_length=200)
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    address_line3: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    reg_number: Optional[str] = None
    drug_license_no: Optional[str] = None
    established_on: Optional[date] = None
    logo_url: Optional[str] = None
    current_fy: str = "2026-27"
    fy_start_month: int = 4

class CompanyOut(BaseModel):
    company_id: int
    tenant_id: int
    company_code: str
    company_name: str
    db_name: str
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    address_line3: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    alt_phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    reg_number: Optional[str] = None
    drug_license_no: Optional[str] = None
    established_on: Optional[date] = None
    logo_url: Optional[str] = None
    status: str
    current_fy: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserModuleAccessItem(BaseModel):
    module_code: str
    can_view: bool = True
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_export: bool = False

class UserModuleAccessUpdate(BaseModel):
    user_id: int
    modules: list[UserModuleAccessItem]

class UserModuleAccessOut(BaseModel):
    user_id: int
    full_name: str
    email: Optional[str] = None
    role: str
    modules: list[UserModuleAccessItem]

