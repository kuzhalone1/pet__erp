"""models/agents.py — Agent / Referral Master table"""
from sqlalchemy import Column, Integer, String, Boolean, Numeric, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Agent(Base):
    __tablename__ = "agents"

    agent_id        = Column(Integer, primary_key=True, index=True)
    agent_code      = Column(String(30), unique=True, nullable=False)
    name            = Column(String(200), nullable=False, index=True)
    clinic_name     = Column(String(200), nullable=True)

    # Contact
    phone           = Column(String(20), nullable=True)
    alt_phone       = Column(String(20), nullable=True)
    email           = Column(String(100), nullable=True)

    # Address
    address         = Column(Text, nullable=True) # legacy
    address1        = Column(Text)
    address2        = Column(Text)
    address3        = Column(Text)
    city_id         = Column(Integer, ForeignKey("cities.city_id", ondelete="SET NULL"), nullable=True)
    district        = Column(String(100))
    state_name      = Column(String(100))
    state_code      = Column(String(5))
    pincode         = Column(String(10))

    # Tax & compliance
    gstin           = Column(String(20), nullable=True)
    pan             = Column(String(10), nullable=True)

    # Commission
    commission_type = Column(String(30), nullable=False, default="Flat")
    commission_rate = Column(Numeric(10, 2), default=0)

    # Financial
    opening_balance = Column(Numeric(12, 2), default=0)
    balance_type    = Column(String(2), default="CR")
    notes           = Column(Text, nullable=True)

    # GL Link
    gl_account_id   = Column(Integer, ForeignKey("gl_master.gl_id"), nullable=True)

    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    gl_account      = relationship("GLMaster", foreign_keys=[gl_account_id])
