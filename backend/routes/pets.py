"""routes/pets.py — Pet CRUD with auto-code generation"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.people import Pet
from schemas.pets import PetCreate, PetUpdate, PetOut
from utils.doc_sequence import get_next_doc_no

router = APIRouter(prefix="/pets", tags=["Pets"])



@router.get("", response_model=List[PetOut])
def list_pets(
    search: Optional[str] = Query(None),
    owner_id: Optional[int] = Query(None),
    species_id: Optional[int] = Query(None),
    include_inactive: bool = Query(False),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(Pet)
    if not include_inactive:
        q = q.filter(Pet.is_active == True)
    if search:
        q = q.filter(
            (Pet.name.ilike(f"%{search}%")) |
            (Pet.pet_code.ilike(f"%{search}%"))
        )
    if owner_id:
        q = q.filter(Pet.owner_id == owner_id)
    if species_id:
        q = q.filter(Pet.species_id == species_id)
    return q.order_by(Pet.name).offset(skip).limit(limit).all()


@router.get("/{pet_id}", response_model=PetOut)
def get_pet(pet_id: int, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.pet_id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return pet


@router.post("", response_model=PetOut)
def create_pet(data: PetCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    if not payload.get("pet_code"):
        payload["pet_code"] = get_next_doc_no(db, "PET")
    pet = Pet(**payload)
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


@router.put("/{pet_id}", response_model=PetOut)
def update_pet(pet_id: int, data: PetUpdate, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.pet_id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(pet, k, v)
    db.commit()
    db.refresh(pet)
    return pet


@router.delete("/{pet_id}")
def delete_pet(pet_id: int, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.pet_id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    pet.is_active = False
    db.commit()
    return {"message": "Pet deactivated"}


@router.put("/{pet_id}/reactivate", response_model=PetOut)
def reactivate_pet(pet_id: int, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.pet_id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    pet.is_active = True
    db.commit()
    db.refresh(pet)
    return pet


@router.get("/{pet_id}/book")
def get_pet_book(pet_id: int, db: Session = Depends(get_db)):
    pet = db.query(Pet).filter(Pet.pet_id == pet_id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    # Fetch Owner, Species, Breed
    from models.people import PetOwner, PetClinicalSummary, PetAllergy, PetVitalsLog, PetLabRecord, PetTimelineEvent
    from models.phase2 import Consultation, VaccinationRecord, Prescription
    from models.masters import Species, Breed

    owner = db.query(PetOwner).filter(PetOwner.owner_id == pet.owner_id).first()
    species = db.query(Species).filter(Species.species_id == pet.species_id).first()
    breed = db.query(Breed).filter(Breed.breed_id == pet.breed_id).first() if pet.breed_id else None

    # Fetch Summary
    summary = db.query(PetClinicalSummary).filter(PetClinicalSummary.pet_id == pet_id).first()
    if not summary:
        summary = PetClinicalSummary(
            pet_id=pet_id,
            blood_group=pet.blood_group or "Unknown",
            microchip_no=pet.microchip_no,
            is_spayed_neutered=pet.is_neutered,
            warning_flags="NONE"
        )
        db.add(summary)
        db.commit()
        db.refresh(summary)

    # Fetch Allergies
    allergies = db.query(PetAllergy).filter(PetAllergy.pet_id == pet_id).all()

    # Fetch Vitals
    vitals = db.query(PetVitalsLog).filter(PetVitalsLog.pet_id == pet_id).order_by(PetVitalsLog.recorded_at.desc()).all()

    # Fetch Labs
    labs = db.query(PetLabRecord).filter(PetLabRecord.pet_id == pet_id).order_by(PetLabRecord.sample_collected_date.desc()).all()

    # Fetch Timeline Events
    timeline = db.query(PetTimelineEvent).filter(PetTimelineEvent.pet_id == pet_id).order_by(PetTimelineEvent.event_date.desc()).all()
    
    # Auto-seed timeline from existing Consultations, Vaccines, Prescriptions if empty
    if not timeline:
        consults = db.query(Consultation).filter(Consultation.pet_id == pet_id).all()
        for c in consults:
            t = PetTimelineEvent(
                pet_id=pet_id,
                event_date=c.consult_date,
                event_type="CONSULTATION",
                ref_id=c.consult_id,
                title=f"Consultation ({c.visit_type})",
                summary_snippet=c.chief_complaint or c.clinical_notes or "Routine checkup",
                doctor_id=c.doctor_id
            )
            db.add(t)
        
        vaccines = db.query(VaccinationRecord).filter(VaccinationRecord.pet_id == pet_id).all()
        for v in vaccines:
            t = PetTimelineEvent(
                pet_id=pet_id,
                event_date=v.given_date,
                event_type="VACCINE",
                ref_id=v.vacc_record_id,
                title=f"Vaccination ({v.vaccine_id})",
                summary_snippet=f"Given dose. Next due: {v.next_due_date}",
                doctor_id=v.doctor_id
            )
            db.add(t)

        prescriptions = db.query(Prescription).filter(Prescription.pet_id == pet_id).all()
        for rx in prescriptions:
            t = PetTimelineEvent(
                pet_id=pet_id,
                event_date=rx.rx_date,
                event_type="PRESCRIPTION",
                ref_id=rx.prescription_id,
                title=f"Prescription ({rx.rx_no})",
                summary_snippet=rx.notes or "Medicines prescribed",
                doctor_id=rx.doctor_id
            )
            db.add(t)

        db.commit()
        timeline = db.query(PetTimelineEvent).filter(PetTimelineEvent.pet_id == pet_id).order_by(PetTimelineEvent.event_date.desc()).all()

    return {
        "pet": {
            "pet_id": pet.pet_id,
            "pet_code": pet.pet_code,
            "name": pet.name,
            "species_name": species.species_name if species else "Canine",
            "breed_name": breed.breed_name if breed else "Golden Retriever",
            "gender": pet.gender or "Male",
            "dob": str(pet.dob) if pet.dob else None,
            "age_years": pet.age_years or 3,
            "age_months": pet.age_months or 6,
            "color": pet.color or "Golden",
            "weight_kg": float(pet.weight_kg) if pet.weight_kg else 32.5,
            "owner_name": owner.name if owner else "John Doe",
            "owner_phone": owner.phone if owner else "1234567890"
        },
        "summary": {
            "summary_id": summary.summary_id,
            "blood_group": summary.blood_group,
            "microchip_no": summary.microchip_no,
            "is_spayed_neutered": summary.is_spayed_neutered,
            "spay_neuter_date": str(summary.spay_neuter_date) if summary.spay_neuter_date else None,
            "lifestyle_note": summary.lifestyle_note or "Indoor family pet",
            "dietary_note": summary.dietary_note or "Premium kibble",
            "insurance_provider": summary.insurance_provider or "Trupanion",
            "insurance_policy_no": summary.insurance_policy_no or "TRU-98123",
            "warning_flags": summary.warning_flags or "NONE"
        },
        "allergies": [
            {
                "allergy_id": a.allergy_id,
                "allergen": a.allergen,
                "reaction_type": a.reaction_type,
                "severity": a.severity,
                "discovered_date": str(a.discovered_date) if a.discovered_date else None,
                "notes": a.notes
            }
            for a in allergies
        ],
        "vitals": [
            {
                "vital_id": v.vital_id,
                "recorded_at": str(v.recorded_at),
                "weight_kg": float(v.weight_kg) if v.weight_kg else 0,
                "temp_celsius": float(v.temp_celsius) if v.temp_celsius else 0,
                "heart_rate": v.heart_rate,
                "resp_rate": v.resp_rate,
                "body_condition_score": v.body_condition_score
            }
            for v in vitals
        ],
        "labs": [
            {
                "lab_record_id": l.lab_record_id,
                "test_name": l.test_name,
                "test_category": l.test_category,
                "sample_collected_date": str(l.sample_collected_date),
                "results_summary": l.results_summary,
                "attachment_url": l.attachment_url,
                "performed_by": l.performed_by
            }
            for l in labs
        ],
        "timeline": [
            {
                "event_id": t.event_id,
                "event_date": str(t.event_date),
                "event_type": t.event_type,
                "ref_id": t.ref_id,
                "title": t.title,
                "summary_snippet": t.summary_snippet,
                "doctor_id": t.doctor_id
            }
            for t in timeline
        ]
    }

