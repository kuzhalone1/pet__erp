"""schemas/masters.py — City, Species, Breed schemas"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ─── CITY ────────────────────────────────────────────────────
class CityBase(BaseModel):
    city_name:  str
    state:      Optional[str] = None
    pincode:    Optional[str] = None



class CityCreate(CityBase):
    pass


class CityOut(CityBase):
    city_id:    int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── SPECIES ─────────────────────────────────────────────────
class SpeciesBase(BaseModel):
    species_name:   str
    notes:          Optional[str] = None
    is_active:      bool = True


class SpeciesCreate(SpeciesBase):
    pass


class SpeciesOut(SpeciesBase):
    species_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── BREED ───────────────────────────────────────────────────
class BreedBase(BaseModel):
    species_id: int
    breed_name: str
    notes:      Optional[str] = None
    is_active:  bool = True


class BreedCreate(BreedBase):
    pass


class BreedOut(BreedBase):
    breed_id:       int
    created_at:     Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── HSN CODE ─────────────────────────────────────────────────
class HsnCodeBase(BaseModel):
    hsn_code:       str
    description:    str
    default_gst_pct: float = 12.0


class HsnCodeCreate(HsnCodeBase):
    pass


class HsnCodeOut(HsnCodeBase):
    hsn_id:     int
    is_active:  bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── GST RATE ─────────────────────────────────────────────────
class GstRateBase(BaseModel):
    rate_name:   str
    gst_percent: float
    cgst_pct:    float
    sgst_pct:    float
    igst_pct:    float


class GstRateCreate(GstRateBase):
    pass


class GstRateOut(GstRateBase):
    gst_rate_id: int
    is_active:   bool = True
    created_at:  Optional[datetime] = None

    class Config:
        from_attributes = True
