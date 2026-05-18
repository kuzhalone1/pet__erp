"""models/doctors.py — Doctor and Staff tables"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Date, Time, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id           = Column(Integer, primary_key=True, index=True)
    doctor_code         = Column(String(30), unique=True, nullable=False)
    name                = Column(String(200), nullable=False)
    qualification       = Column(String(200), nullable=True)
    specialization      = Column(String(200), nullable=True)
    reg_number          = Column(String(100), nullable=True)

    # Contact
    phone               = Column(String(20), nullable=True)
    alt_phone           = Column(String(20), nullable=True)
    email               = Column(String(100), nullable=True)

    # Address
    address1            = Column(Text)
    address2            = Column(Text)
    address3            = Column(Text)
    city_id             = Column(Integer, ForeignKey("cities.city_id"), nullable=True)
    district            = Column(String(100))
    state_name          = Column(String(100))
    state_code          = Column(String(5))
    pincode             = Column(String(10), nullable=True)

    # Tax
    pan                 = Column(String(10))

    # HR
    doj                 = Column(Date, nullable=True)
    salary              = Column(Numeric(10, 2), default=0)
    salary_type         = Column(String(50), default="Fixed")
    consultation_fee    = Column(Numeric(10, 2), default=0)
    follow_up_fee       = Column(Numeric(10, 2), default=0)
    emergency_fee       = Column(Numeric(10, 2), default=0)
    available_days      = Column(String(100), nullable=True)
    available_from      = Column(Time, nullable=True)
    available_to        = Column(Time, nullable=True)
    signature_path      = Column(String, nullable=True)

    # Financial
    opening_balance     = Column(Numeric(10, 2), default=0)
    balance_type        = Column(String(20), default="CR")
    notes               = Column(String, nullable=True)

    # GL Link
    gl_account_id       = Column(Integer, ForeignKey("gl_master.gl_id"), nullable=True)

    is_active           = Column(Boolean, default=True)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime, server_default=func.now(), onupdate=func.now())

    gl_account          = relationship("GLMaster", foreign_keys=[gl_account_id])


class Staff(Base):
    __tablename__ = "staff"

    staff_id    = Column(Integer, primary_key=True, index=True)
    staff_code  = Column(String(30), unique=True, nullable=False)
    name        = Column(String(200), nullable=False)
    role        = Column(String(50), nullable=True)

    # Contact
    phone       = Column(String(20), nullable=True)
    alt_phone   = Column(String(20), nullable=True)
    email       = Column(String(100), nullable=True)

    # Address
    address     = Column(String, nullable=True) # legacy
    address1    = Column(Text)
    address2    = Column(Text)
    address3    = Column(Text)
    city_id     = Column(Integer, ForeignKey("cities.city_id"), nullable=True)
    district    = Column(String(100))
    state_name  = Column(String(100))
    state_code  = Column(String(5))
    pincode     = Column(String(10), nullable=True)

    # Tax
    pan         = Column(String(10))

    # HR
    doj         = Column(Date, nullable=True)
    salary      = Column(Numeric(10, 2), default=0)

    # Financial
    opening_balance = Column(Numeric(10, 2), default=0)
    balance_type    = Column(String(20), default="CR")
    notes           = Column(String, nullable=True)

    # GL Link
    gl_account_id   = Column(Integer, ForeignKey("gl_master.gl_id"), nullable=True)

    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, server_default=func.now(), onupdate=func.now())

    gl_account  = relationship("GLMaster", foreign_keys=[gl_account_id])
