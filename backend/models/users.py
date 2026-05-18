"""models/users.py — Users (login) table"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from database import Base


class User(Base):
    __tablename__ = "users"

    user_id             = Column(Integer, primary_key=True, index=True)
    username            = Column(String(50), unique=True, nullable=False, index=True)
    password_hash       = Column(String, nullable=False)
    full_name           = Column(String(150), nullable=False)
    role                = Column(String(30), nullable=False, default="staff")
    email               = Column(String(100), nullable=True)
    phone               = Column(String(20), nullable=True)
    linked_doctor_id    = Column(Integer, ForeignKey("doctors.doctor_id", ondelete="SET NULL"), nullable=True)
    linked_staff_id     = Column(Integer, ForeignKey("staff.staff_id", ondelete="SET NULL"), nullable=True)
    is_active           = Column(Boolean, default=True)
    last_login          = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, server_default=func.now())
