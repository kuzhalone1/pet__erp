"""models/phase3.py — SQLAlchemy ORM models for Phase 3 (Pharmacy & Stock)"""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    Numeric, Date, DateTime, ForeignKey, func
)
from sqlalchemy.orm import relationship
from database import Base


class Supplier(Base):
    __tablename__ = "suppliers"
    supplier_id     = Column(Integer, primary_key=True)
    supplier_code   = Column(String, unique=True, nullable=False)
    supplier_name   = Column(String, nullable=False)
    contact_person  = Column(String)
    phone           = Column(String)
    alt_phone       = Column(String)
    email           = Column(String)
    address         = Column(Text) # legacy
    address1        = Column(Text)
    address2        = Column(Text)
    address3        = Column(Text)
    city_id         = Column(Integer, ForeignKey("cities.city_id"))
    district        = Column(String(100))
    state_name      = Column(String(100))
    state_code      = Column(String(5))
    pincode         = Column(String(10))
    gstin           = Column(String)
    pan             = Column(String)
    drug_license_no = Column(String)
    payment_terms   = Column(Integer)  # credit days
    opening_balance = Column(Numeric(12, 2), default=0)
    balance_type    = Column(String(2), default="CR")
    
    # GL Link
    gl_account_id   = Column(Integer, ForeignKey("gl_master.gl_id"), nullable=True)

    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    gl_account      = relationship("GLMaster", foreign_keys=[gl_account_id])
# Medicine, MedicineBatch, StockLedger moved to models.stage3


class PurchaseBill(Base):
    __tablename__ = "purchase_bills"
    bill_id               = Column(Integer, primary_key=True)
    fy_code               = Column(String(10), ForeignKey("financial_years.fy_code"), nullable=True, index=True)
    bill_no               = Column(String, unique=True, nullable=False)
    bill_date             = Column(Date, nullable=False)
    supplier_id           = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=False)
    supplier_invoice_no   = Column(String)
    supplier_invoice_date = Column(Date)
    total_amount          = Column(Numeric(12, 2), default=0)
    discount_amount       = Column(Numeric(10, 2), default=0)
    gst_amount            = Column(Numeric(10, 2), default=0)
    net_amount            = Column(Numeric(12, 2), default=0)
    payment_status        = Column(String, default="Unpaid")
    status                = Column(String, default="Draft")
    notes                 = Column(Text)
    created_by            = Column(Integer, ForeignKey("users.user_id"))
    created_at            = Column(DateTime, default=func.now())

    items = relationship("PurchaseBillItem", back_populates="bill", cascade="all, delete-orphan")


class PurchaseBillItem(Base):
    __tablename__ = "purchase_bill_items"
    item_id        = Column(Integer, primary_key=True)
    bill_id        = Column(Integer, ForeignKey("purchase_bills.bill_id"), nullable=False)
    medicine_id    = Column(Integer, ForeignKey("medicines.medicine_id"), nullable=False)

    bill = relationship("PurchaseBill", back_populates="items")
    batch_no       = Column(String, nullable=False)
    mfg_date       = Column(Date)
    expiry_date    = Column(Date, nullable=False)
    quantity       = Column(Integer, nullable=False)
    free_quantity  = Column(Integer, default=0)
    purchase_price = Column(Numeric(10, 2), nullable=False)
    sale_price     = Column(Numeric(10, 2))
    discount_pct   = Column(Numeric(5, 2), default=0)
    gst_pct        = Column(Numeric(5, 2), default=12)
    gst_amount     = Column(Numeric(10, 2), default=0)
    line_total     = Column(Numeric(10, 2), default=0)
    batch_id       = Column(Integer, ForeignKey("medicine_batches.batch_id"))


class PharmacyBill(Base):
    __tablename__ = "pharmacy_bills"
    pharmacy_bill_id = Column(Integer, primary_key=True)
    fy_code          = Column(String(10), ForeignKey("financial_years.fy_code"), nullable=True, index=True)
    pharma_bill_no   = Column(String, unique=True, nullable=False)
    bill_date        = Column(Date, nullable=False)
    owner_id         = Column(Integer, ForeignKey("pet_owners.owner_id"))
    pet_id           = Column(Integer, ForeignKey("pets.pet_id"))
    prescription_id  = Column(Integer, ForeignKey("prescriptions.prescription_id"))
    total_amount     = Column(Numeric(12, 2), default=0)
    discount_amount  = Column(Numeric(10, 2), default=0)
    gst_amount       = Column(Numeric(10, 2), default=0)
    net_amount       = Column(Numeric(12, 2), default=0)
    payment_mode     = Column(String)
    payment_status   = Column(String, default="Unpaid")
    status           = Column(String, default="Draft")
    is_consolidated  = Column(Boolean, default=False)
    billing_id       = Column(Integer)
    created_by       = Column(Integer, ForeignKey("users.user_id"))
    created_at       = Column(DateTime, default=func.now())



class PharmacyBillItem(Base):
    __tablename__ = "pharmacy_bill_items"
    item_id          = Column(Integer, primary_key=True)
    pharmacy_bill_id = Column(Integer, ForeignKey("pharmacy_bills.pharmacy_bill_id"), nullable=False)
    medicine_id      = Column(Integer, ForeignKey("medicines.medicine_id"), nullable=False)
    batch_id         = Column(Integer, ForeignKey("medicine_batches.batch_id"), nullable=False)
    medicine_name    = Column(String, nullable=False)
    batch_no         = Column(String)
    expiry_date      = Column(Date)
    quantity         = Column(Numeric(8, 2), nullable=False)
    sale_price       = Column(Numeric(10, 2), nullable=False)
    discount_pct     = Column(Numeric(5, 2), default=0)
    gst_pct          = Column(Numeric(5, 2), default=12)
    gst_amount       = Column(Numeric(10, 2), default=0)
    line_total       = Column(Numeric(10, 2), default=0)
    rx_item_id       = Column(Integer, ForeignKey("prescription_items.rx_item_id"))
