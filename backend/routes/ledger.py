"""routes/ledger.py — General Ledger (Chart of Accounts) CRUD"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from database import get_db
from models.phase4 import GLMaster

router = APIRouter(prefix="/ledger", tags=["Ledger"])


# ─── Schemas (inline for simplicity) ─────────────────────────
class GLBase(BaseModel):
    gl_code:         str
    gl_name:         str
    group_name:      str
    sub_group:       Optional[str] = None
    opening_balance: Optional[Decimal] = Decimal("0")
    balance_type:    str = "DR"


class GLCreate(GLBase):
    pass


class GLOut(GLBase):
    gl_id:      int
    is_system:  bool = False
    is_active:  bool = True
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Routes ──────────────────────────────────────────────────
@router.get("/gl", response_model=List[GLOut])
def list_gl(
    group_name: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db)
):
    q = db.query(GLMaster)
    if not include_inactive:
        q = q.filter(GLMaster.is_active == True)
    if group_name:
        q = q.filter(GLMaster.group_name == group_name)
    return q.order_by(GLMaster.group_name, GLMaster.gl_name).all()


@router.get("/gl/groups")
def list_groups(db: Session = Depends(get_db)):
    """Return distinct group_name values for filter dropdown."""
    rows = db.query(GLMaster.group_name).distinct().order_by(GLMaster.group_name).all()
    return [r[0] for r in rows]


@router.get("/gl/{gl_id}", response_model=GLOut)
def get_gl(gl_id: int, db: Session = Depends(get_db)):
    gl = db.query(GLMaster).filter(GLMaster.gl_id == gl_id).first()
    if not gl:
        raise HTTPException(status_code=404, detail="GL account not found")
    return gl


@router.post("/gl", response_model=GLOut)
def create_gl(data: GLCreate, db: Session = Depends(get_db)):
    existing = db.query(GLMaster).filter(GLMaster.gl_code == data.gl_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="GL code already exists")
    gl = GLMaster(**data.model_dump())
    db.add(gl)
    db.commit()
    db.refresh(gl)
    return gl


@router.put("/gl/{gl_id}", response_model=GLOut)
def update_gl(gl_id: int, data: GLCreate, db: Session = Depends(get_db)):
    gl = db.query(GLMaster).filter(GLMaster.gl_id == gl_id).first()
    if not gl:
        raise HTTPException(status_code=404, detail="GL account not found")
    if gl.is_system:
        # System accounts: only allow editing opening_balance (not code/name/group)
        gl.opening_balance = data.opening_balance
        gl.balance_type = data.balance_type
    else:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(gl, k, v)
    db.commit()
    db.refresh(gl)
    return gl


@router.delete("/gl/{gl_id}")
def deactivate_gl(gl_id: int, db: Session = Depends(get_db)):
    gl = db.query(GLMaster).filter(GLMaster.gl_id == gl_id).first()
    if not gl:
        raise HTTPException(status_code=404, detail="GL account not found")
    if gl.is_system:
        raise HTTPException(status_code=400, detail="System accounts cannot be deleted")
    gl.is_active = False
    db.commit()
    return {"message": "GL account deactivated"}
