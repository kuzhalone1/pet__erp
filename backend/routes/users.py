"""routes/users.py — User management (admin only)"""
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from database import get_db
from models.users import User
from models.doctors import Doctor, Staff
import bcrypt

router = APIRouter(prefix="/users", tags=["Users"])


# ─── Schemas (inline) ────────────────────────────────────────
class UserCreate(BaseModel):
    username:         str
    full_name:        str
    role:             str = "staff"      # admin | doctor | receptionist | pharmacist | accountant
    email:            Optional[str] = None
    phone:            Optional[str] = None
    linked_doctor_id: Optional[int] = None
    linked_staff_id:  Optional[int] = None
    password:         str


class UserUpdate(BaseModel):
    full_name:        str
    role:             str
    email:            Optional[str] = None
    phone:            Optional[str] = None
    linked_doctor_id: Optional[int] = None
    linked_staff_id:  Optional[int] = None


class UserOut(BaseModel):
    user_id:          int
    username:         str
    full_name:        str
    role:             str
    email:            Optional[str] = None
    phone:            Optional[str] = None
    linked_doctor_id: Optional[int] = None
    linked_staff_id:  Optional[int] = None
    is_active:        bool = True
    last_login:       Optional[datetime] = None
    created_at:       Optional[datetime] = None

    class Config:
        from_attributes = True


class PasswordReset(BaseModel):
    new_password: str


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


# ─── Routes ──────────────────────────────────────────────────
@router.get("", response_model=List[UserOut])
def list_users(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db)
):
    q = db.query(User)
    if not include_inactive:
        q = q.filter(User.is_active == True)
    return q.order_by(User.full_name).all()


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.user_id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


@router.post("", response_model=UserOut)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    payload = data.model_dump(exclude={"password"})
    payload["password_hash"] = hash_password(data.password)
    u = User(**payload)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.user_id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(u, k, v)
    db.commit()
    db.refresh(u)
    return u


@router.put("/{user_id}/deactivate")
def deactivate_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.user_id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = False
    db.commit()
    return {"message": "User deactivated"}


@router.put("/{user_id}/reactivate")
def reactivate_user(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.user_id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.is_active = True
    db.commit()
    return {"message": "User reactivated"}


@router.put("/{user_id}/reset-password")
def admin_reset_password(user_id: int, data: PasswordReset, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.user_id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    u.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password reset successfully"}
