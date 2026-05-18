"""
master_sys.py — Master Database Models for Multi-Tenancy, RBAC, and Company Routing
"""
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Tenant(Base):
    __tablename__ = "tenants"
    tenant_id = Column(Integer, primary_key=True, index=True)
    tenant_name = Column(String(150), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    companies = relationship("CompanyProfile", back_populates="tenant")

class CompanyProfile(Base):
    __tablename__ = "company_profiles"
    company_id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.tenant_id"))
    company_code = Column(String(10), nullable=False) # ABC, BCD
    company_name = Column(String(200), nullable=False)
    db_name = Column(String(100), nullable=False)
    
    # ENCRYPTED AT REST: Connection string containing DB password
    db_uri = Column(Text, nullable=False) 
    
    # Address
    address_line1 = Column(String(200))
    address_line2 = Column(String(200))
    address_line3 = Column(String(200))
    city = Column(String(100))
    district = Column(String(100))
    state = Column(String(100))
    state_code = Column(String(5))
    pincode = Column(String(10))
    
    # Contact
    phone = Column(String(20))
    alt_phone = Column(String(20))
    email = Column(String(100))
    website = Column(String(200))

    # Tax & Compliance
    gst_number = Column(String(20))
    pan_number = Column(String(20))
    reg_number = Column(String(100))
    drug_license_no = Column(String(50))
    established_on = Column(Date)
    logo_url = Column(Text)

    # Financial
    current_fy = Column(String(10), default="2026-27")
    fy_start_month = Column(Integer, default=4)
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=datetime.utcnow)
    tenant = relationship("Tenant", back_populates="companies")

class MasterUser(Base):
    __tablename__ = "master_users"
    user_id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.tenant_id"))
    full_name = Column(String(150), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    phone = Column(String(15))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Role(Base):
    __tablename__ = "roles"
    role_id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("company_profiles.company_id"))
    role_name = Column(String(50), nullable=False) # Admin, Doctor, Receptionist, Pharmacist
    is_system = Column(Boolean, default=False) # System roles cannot be deleted

class UserCompanyAccess(Base):
    __tablename__ = "user_company_access"
    access_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("master_users.user_id"))
    company_id = Column(Integer, ForeignKey("company_profiles.company_id"))
    role_id = Column(Integer, ForeignKey("roles.role_id"), nullable=False) 
    is_active = Column(Boolean, default=True)

class UserModuleAccess(Base):
    __tablename__ = "user_module_access"
    module_access_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("master_users.user_id"))
    company_id = Column(Integer, ForeignKey("company_profiles.company_id"))
    module_code = Column(String(50), nullable=False)
    can_view = Column(Boolean, default=True)
    can_create = Column(Boolean, default=False)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_export = Column(Boolean, default=False)
