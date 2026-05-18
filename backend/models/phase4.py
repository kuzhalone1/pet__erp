"""models/phase4.py — SQLAlchemy ORM models for Phase 4 (Billing, Accounts, FY, Opening Balances)"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    Numeric, Date, DateTime, ForeignKey, func, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class FinancialYear(Base):
    __tablename__ = "financial_years"
    fy_id       = Column(Integer, primary_key=True, index=True)
    fy_code     = Column(String(10), unique=True, nullable=False) # '2026-27'
    start_date  = Column(Date, nullable=False)
    end_date    = Column(Date, nullable=False)
    is_current  = Column(Boolean, default=False)
    is_locked   = Column(Boolean, default=False)
    locked_at   = Column(DateTime)
    locked_by   = Column(Integer)


class OpeningBalance(Base):
    __tablename__ = "opening_balances"
    ob_id        = Column(Integer, primary_key=True, index=True)
    fy_code      = Column(String(10), ForeignKey("financial_years.fy_code"), nullable=False, index=True)
    gl_id        = Column(Integer, ForeignKey("gl_master.gl_id"), nullable=False)
    amount       = Column(Numeric(14, 2), default=0)
    balance_type = Column(String(2), default="DR") # DR or CR

    __table_args__ = (UniqueConstraint('fy_code', 'gl_id', name='uq_ob_fy_gl'),)


class GLMaster(Base):
    __tablename__ = "gl_master"
    gl_id           = Column(Integer, primary_key=True)
    gl_code         = Column(String, unique=True, nullable=False)
    gl_name         = Column(String, nullable=False)
    group_name      = Column(String, nullable=False)
    sub_group       = Column(String)

    # Contact
    phone           = Column(String(20))
    alt_phone       = Column(String(20))
    email           = Column(String(100))

    # Address
    address1        = Column(Text)
    address2        = Column(Text)
    address3        = Column(Text)
    city_id         = Column(Integer, ForeignKey("cities.city_id"))
    district        = Column(String(100))
    state_name      = Column(String(100))
    state_code      = Column(String(5))
    pincode         = Column(String(10))

    # Tax & Compliance
    gstin           = Column(String(20))
    pan             = Column(String(10))

    # Financial
    opening_balance = Column(Numeric(14, 2), default=0)
    balance_type    = Column(String, default="DR")
    discount_pct    = Column(Numeric(5, 2), default=0)

    # Links
    agent_id        = Column(Integer, ForeignKey("agents.agent_id"))

    is_system       = Column(Boolean, default=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    city            = relationship("City")
    agent           = relationship("Agent", foreign_keys=[agent_id])


class BillingMaster(Base):
    __tablename__ = "billing_master"
    billing_id       = Column(Integer, primary_key=True)
    fy_code          = Column(String(10), ForeignKey("financial_years.fy_code"), nullable=True, index=True)
    bill_no          = Column(String, unique=True, nullable=False)
    bill_date        = Column(Date, nullable=False)
    pet_id           = Column(Integer, ForeignKey("pets.pet_id"), nullable=False)
    owner_id         = Column(Integer, ForeignKey("pet_owners.owner_id"), nullable=False)
    consult_id       = Column(Integer, ForeignKey("consultations.consult_id"))
    pharmacy_bill_id = Column(Integer, ForeignKey("pharmacy_bills.pharmacy_bill_id"))
    consult_fee      = Column(Numeric(10, 2), default=0)
    procedure_total  = Column(Numeric(10, 2), default=0)
    pharmacy_total   = Column(Numeric(10, 2), default=0)
    subtotal         = Column(Numeric(12, 2), default=0)
    discount_amount  = Column(Numeric(10, 2), default=0)
    gst_amount       = Column(Numeric(10, 2), default=0)
    net_amount       = Column(Numeric(12, 2), default=0)
    payment_status   = Column(String, default="Unpaid")
    payment_mode     = Column(String)
    notes            = Column(Text)
    created_by       = Column(Integer, ForeignKey("users.user_id"))
    created_at       = Column(DateTime, default=func.now())


class BillingItem(Base):
    __tablename__ = "billing_items"
    item_id        = Column(Integer, primary_key=True)
    billing_id     = Column(Integer, ForeignKey("billing_master.billing_id"), nullable=False)
    item_type      = Column(String, nullable=False)
    description    = Column(String, nullable=False)
    hsn_code       = Column(String)
    quantity       = Column(Numeric(8, 2), default=1)
    unit_price     = Column(Numeric(10, 2))
    discount_pct   = Column(Numeric(5, 2), default=0)
    taxable_amount = Column(Numeric(10, 2), default=0)
    gst_pct        = Column(Numeric(5, 2), default=0)
    cgst_amount    = Column(Numeric(10, 2), default=0)
    sgst_amount    = Column(Numeric(10, 2), default=0)
    igst_amount    = Column(Numeric(10, 2), default=0)
    net_amount     = Column(Numeric(10, 2), default=0)
    ref_id         = Column(Integer)


class ReceiptVoucher(Base):
    __tablename__ = "receipt_vouchers"
    receipt_id   = Column(Integer, primary_key=True)
    fy_code      = Column(String(10), ForeignKey("financial_years.fy_code"), nullable=True, index=True)
    receipt_no   = Column(String, unique=True, nullable=False)
    receipt_date = Column(Date, nullable=False)
    billing_id   = Column(Integer, ForeignKey("billing_master.billing_id"), nullable=False)
    owner_id     = Column(Integer, ForeignKey("pet_owners.owner_id"), nullable=False)
    amount       = Column(Numeric(12, 2), nullable=False)
    payment_mode = Column(String, nullable=False)
    reference_no = Column(String)
    gl_dr_id     = Column(Integer, ForeignKey("gl_master.gl_id"))
    gl_cr_id     = Column(Integer, ForeignKey("gl_master.gl_id"))
    narration    = Column(Text)
    created_by   = Column(Integer, ForeignKey("users.user_id"))
    created_at   = Column(DateTime, default=func.now())


class Voucher(Base):
    __tablename__ = "vouchers"
    voucher_id   = Column(Integer, primary_key=True)
    fy_code      = Column(String(10), ForeignKey("financial_years.fy_code"), nullable=True, index=True)
    voucher_no   = Column(String, unique=True, nullable=False)
    voucher_date = Column(Date, nullable=False)
    voucher_type = Column(String, nullable=False)
    debit_gl     = Column(Integer, ForeignKey("gl_master.gl_id"))
    credit_gl    = Column(Integer, ForeignKey("gl_master.gl_id"))
    amount       = Column(Numeric(12, 2), nullable=False)
    narration    = Column(Text)
    ref_type     = Column(String)
    ref_id       = Column(Integer)
    created_by   = Column(Integer, ForeignKey("users.user_id"))
    created_at   = Column(DateTime, default=func.now())
