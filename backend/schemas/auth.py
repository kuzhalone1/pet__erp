"""schemas/auth.py — Login request and token response"""
from pydantic import BaseModel
from typing import Optional, List


class LoginRequest(BaseModel):
    username: str
    password: str


class CompanySimple(BaseModel):
    company_id: int
    company_code: str
    company_name: str
    db_name: str
    current_fy: str


class LoginDiscoveryResponse(BaseModel):
    temp_token: str
    full_name: str
    role: str
    user_id: int
    companies: List[CompanySimple]


class SelectCompanyRequest(BaseModel):
    company_id: int
    username: str
    temp_token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user_id: int
    company_id: Optional[int] = None
    company_name: Optional[str] = None
    db_name: Optional[str] = None
    current_fy: Optional[str] = None
    modules: Optional[List[str]] = None


class UserOut(BaseModel):
    user_id: int
    username: str
    full_name: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True
