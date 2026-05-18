"""routes/masters.py — City, Species, Breed, HSN Code, GST Rate endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.masters import City, Species, Breed, HsnCode, GstRate
from models.people import PetOwner

from schemas.masters import (
    CityCreate, CityOut,
    SpeciesCreate, SpeciesOut,
    BreedCreate, BreedOut,
    HsnCodeCreate, HsnCodeOut,
    GstRateCreate, GstRateOut
)

router = APIRouter(prefix="/masters", tags=["Masters"])


# ─── CITIES ──────────────────────────────────────────────────
@router.get("/cities", response_model=List[CityOut])
def list_cities(search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(City)
    if search:
        q = q.filter(City.city_name.ilike(f"%{search}%"))
    return q.order_by(City.city_name).all()


@router.post("/cities", response_model=CityOut)
def create_city(data: CityCreate, db: Session = Depends(get_db)):
    city = City(**data.model_dump())
    db.add(city)
    db.commit()
    db.refresh(city)
    return city


@router.put("/cities/{city_id}", response_model=CityOut)
def update_city(city_id: int, data: CityCreate, db: Session = Depends(get_db)):
    city = db.query(City).filter(City.city_id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(city, k, v)
    db.commit()
    db.refresh(city)
    return city


@router.delete("/cities/{city_id}")
def delete_city(city_id: int, db: Session = Depends(get_db)):
    city = db.query(City).filter(City.city_id == city_id).first()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")
    
    # FK Guard: check if any pet owner uses this city
    owners_count = db.query(PetOwner).filter(PetOwner.city_id == city_id).count()
    if owners_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"City is in use by {owners_count} pet owners. Cannot delete."
        )

    db.delete(city)
    db.commit()
    return {"message": "City deleted successfully"}


# ─── SPECIES ─────────────────────────────────────────────────
@router.get("/species", response_model=List[SpeciesOut])
def list_species(db: Session = Depends(get_db)):
    return db.query(Species).filter(Species.is_active == True).order_by(Species.species_name).all()


@router.post("/species", response_model=SpeciesOut)
def create_species(data: SpeciesCreate, db: Session = Depends(get_db)):
    existing = db.query(Species).filter(Species.species_name.ilike(data.species_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Species already exists")
    sp = Species(**data.model_dump())
    db.add(sp)
    db.commit()
    db.refresh(sp)
    return sp


@router.put("/species/{species_id}", response_model=SpeciesOut)
def update_species(species_id: int, data: SpeciesCreate, db: Session = Depends(get_db)):
    sp = db.query(Species).filter(Species.species_id == species_id).first()
    if not sp:
        raise HTTPException(status_code=404, detail="Species not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sp, k, v)
    db.commit()
    db.refresh(sp)
    return sp


# ─── BREEDS ──────────────────────────────────────────────────
@router.get("/breeds", response_model=List[BreedOut])
def list_breeds(species_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Breed).filter(Breed.is_active == True)
    if species_id:
        q = q.filter(Breed.species_id == species_id)
    return q.order_by(Breed.breed_name).all()


@router.post("/breeds", response_model=BreedOut)
def create_breed(data: BreedCreate, db: Session = Depends(get_db)):
    breed = Breed(**data.model_dump())
    db.add(breed)
    db.commit()
    db.refresh(breed)
    return breed


@router.put("/breeds/{breed_id}", response_model=BreedOut)
def update_breed(breed_id: int, data: BreedCreate, db: Session = Depends(get_db)):
    breed = db.query(Breed).filter(Breed.breed_id == breed_id).first()
    if not breed:
        raise HTTPException(status_code=404, detail="Breed not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(breed, k, v)
    db.commit()
    db.refresh(breed)
    return breed


# ─── HSN CODES ───────────────────────────────────────────────
@router.get("/hsn", response_model=List[HsnCodeOut])
def list_hsn(search: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(HsnCode).filter(HsnCode.is_active == True)
    if search:
        q = q.filter(
            HsnCode.hsn_code.ilike(f"%{search}%") |
            HsnCode.description.ilike(f"%{search}%")
        )
    return q.order_by(HsnCode.hsn_code).all()


@router.post("/hsn", response_model=HsnCodeOut)
def create_hsn(data: HsnCodeCreate, db: Session = Depends(get_db)):
    existing = db.query(HsnCode).filter(HsnCode.hsn_code == data.hsn_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="HSN code already exists")
    h = HsnCode(**data.model_dump())
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.put("/hsn/{hsn_id}", response_model=HsnCodeOut)
def update_hsn(hsn_id: int, data: HsnCodeCreate, db: Session = Depends(get_db)):
    h = db.query(HsnCode).filter(HsnCode.hsn_id == hsn_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="HSN code not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(h, k, v)
    db.commit()
    db.refresh(h)
    return h


@router.delete("/hsn/{hsn_id}")
def delete_hsn(hsn_id: int, db: Session = Depends(get_db)):
    h = db.query(HsnCode).filter(HsnCode.hsn_id == hsn_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="HSN code not found")
    h.is_active = False
    db.commit()
    return {"message": "HSN code deactivated"}


# ─── GST RATES ───────────────────────────────────────────────
@router.get("/gst-rates", response_model=List[GstRateOut])
def list_gst_rates(db: Session = Depends(get_db)):
    return db.query(GstRate).filter(GstRate.is_active == True).order_by(GstRate.gst_percent).all()


@router.post("/gst-rates", response_model=GstRateOut)
def create_gst_rate(data: GstRateCreate, db: Session = Depends(get_db)):
    r = GstRate(**data.model_dump())
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.put("/gst-rates/{gst_rate_id}", response_model=GstRateOut)
def update_gst_rate(gst_rate_id: int, data: GstRateCreate, db: Session = Depends(get_db)):
    r = db.query(GstRate).filter(GstRate.gst_rate_id == gst_rate_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="GST rate not found")
    # Only allow updating rate_name — never the percent values (would corrupt history)
    r.rate_name = data.rate_name
    db.commit()
    db.refresh(r)
    return r
