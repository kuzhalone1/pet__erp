"""schemas/pets.py — Pet schemas"""
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal


class PetBase(BaseModel):
    name:           str
    owner_id:       int
    species_id:     int
    breed_id:       Optional[int] = None
    gender:         Optional[str] = None
    dob:            Optional[date] = None
    age_years:      Optional[int] = None
    age_months:     Optional[int] = None
    color:          Optional[str] = None
    weight_kg:      Optional[Decimal] = None
    microchip_no:   Optional[str] = None
    blood_group:    Optional[str] = None
    is_neutered:    bool = False
    photo_path:     Optional[str] = None
    notes:          Optional[str] = None
    is_active:      bool = True


class PetCreate(PetBase):
    pass


class PetUpdate(PetBase):
    pass


class PetOut(PetBase):
    pet_id:     int
    pet_code:   str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PetSummary(BaseModel):
    pet_id:     int
    pet_code:   str
    name:       str
    species_id: int
    is_active:  bool

    class Config:
        from_attributes = True
