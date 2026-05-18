"""models/masters.py — City, Species, Breed, HSN Code, GST Rate tables"""
from sqlalchemy import Column, Integer, SmallInteger, String, Boolean, Numeric, DateTime, ForeignKey, UniqueConstraint, func
from database import Base


class City(Base):
    __tablename__ = "cities"

    city_id     = Column(Integer, primary_key=True, index=True)
    city_name   = Column(String(100), nullable=False)
    state       = Column(String(100), nullable=True)
    pincode     = Column(String(10), nullable=True)

    created_at  = Column(DateTime, server_default=func.now())


class Species(Base):
    __tablename__ = "species"

    species_id      = Column(Integer, primary_key=True, index=True)
    species_name    = Column(String(100), unique=True, nullable=False)
    notes           = Column(String, nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())


class Breed(Base):
    __tablename__ = "breeds"

    breed_id    = Column(Integer, primary_key=True, index=True)
    species_id  = Column(Integer, ForeignKey("species.species_id", ondelete="CASCADE"), nullable=False)
    breed_name  = Column(String(150), nullable=False)
    notes       = Column(String, nullable=True)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("species_id", "breed_name", name="uq_breed_species"),
    )


class HsnCode(Base):
    __tablename__ = "hsn_codes"

    hsn_id          = Column(Integer, primary_key=True, index=True)
    hsn_code        = Column(String(10), unique=True, nullable=False)
    description     = Column(String(300), nullable=False)
    default_gst_pct = Column(Numeric(5, 2), default=12)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())


class GstRate(Base):
    __tablename__ = "gst_rates"

    gst_rate_id = Column(Integer, primary_key=True, index=True)
    rate_name   = Column(String(50), nullable=False)
    gst_percent = Column(Numeric(5, 2), nullable=False)
    cgst_pct    = Column(Numeric(5, 2), nullable=False)
    sgst_pct    = Column(Numeric(5, 2), nullable=False)
    igst_pct    = Column(Numeric(5, 2), nullable=False)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime, server_default=func.now())
