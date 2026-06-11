"""routes/owners.py — Pet Owner CRUD with auto-code generation"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.people import PetOwner, Pet
from models.agents import Agent

from schemas.owners import PetOwnerCreate, PetOwnerUpdate, PetOwnerOut
from utils.doc_sequence import get_next_doc_no
from utils.gl_utils import create_gl_account

router = APIRouter(prefix="/owners", tags=["Pet Owners"])


@router.get("", response_model=List[PetOwnerOut])
def list_owners(
    search: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(PetOwner)
    if not include_inactive:
        q = q.filter(PetOwner.is_active == True)
        
    if search:
        q = q.filter(
            (PetOwner.name.ilike(f"%{search}%")) |
            (PetOwner.phone.ilike(f"%{search}%")) |
            (PetOwner.owner_code.ilike(f"%{search}%"))
        )
    
    owners = q.order_by(PetOwner.name).offset(skip).limit(limit).all()
    
    # Build agent map once (safe - handle pre-migration)
    agent_map = {}
    try:
        agents = db.query(Agent).all()
        agent_map = {a.agent_id: a.name for a in agents}
    except Exception:
        pass

    # Fill pet info and agent name
    for o in owners:
        all_pets = db.query(Pet).filter(Pet.owner_id == o.owner_id).all()
        active_pets = [p for p in all_pets if p.is_active]
        o.pet_count = len(active_pets)
        o.pets = active_pets
        o.agent_name = agent_map.get(o.agent_id) if getattr(o, 'agent_id', None) else None
        
    return owners


@router.get("/{owner_id}", response_model=PetOwnerOut)
def get_owner(owner_id: int, db: Session = Depends(get_db)):
    owner = db.query(PetOwner).filter(PetOwner.owner_id == owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    return owner


@router.post("", response_model=PetOwnerOut)
def create_owner(data: PetOwnerCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    if not payload.get("owner_code"):
        payload["owner_code"] = get_next_doc_no(db, "OWN")
    
    # Auto-create GL Account
    gl_id = create_gl_account("owner", data.name, db, **data.model_dump(exclude={"name"}))
    payload["gl_account_id"] = gl_id
    
    owner = PetOwner(**payload)
    db.add(owner)
    db.commit()
    db.refresh(owner)
    return owner


@router.put("/{owner_id}", response_model=PetOwnerOut)
def update_owner(owner_id: int, data: PetOwnerUpdate, db: Session = Depends(get_db)):
    owner = db.query(PetOwner).filter(PetOwner.owner_id == owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(owner, k, v)
    db.commit()
    db.refresh(owner)
    return owner


@router.delete("/{owner_id}")
def delete_owner(owner_id: int, db: Session = Depends(get_db)):
    owner = db.query(PetOwner).filter(PetOwner.owner_id == owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    owner.is_active = False
    db.commit()
    return {"message": "Owner deactivated"}


@router.put("/{owner_id}/reactivate", response_model=PetOwnerOut)
def reactivate_owner(owner_id: int, db: Session = Depends(get_db)):
    owner = db.query(PetOwner).filter(PetOwner.owner_id == owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    owner.is_active = True
    db.commit()
    db.refresh(owner)
    return owner
