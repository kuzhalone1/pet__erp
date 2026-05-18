"""models/phase2.py — SQLAlchemy ORM models for Phase 2 (Clinical Core)"""
from sqlalchemy import (
    Column, Integer, SmallInteger, String, Text, Boolean,
    Numeric, Date, Time, DateTime, ForeignKey, func
)
from database import Base


class DoctorSchedule(Base):
    __tablename__ = "doctor_schedule"
    schedule_id   = Column(Integer, primary_key=True)
    doctor_id     = Column(Integer, ForeignKey("doctors.doctor_id"), nullable=False)
    day_of_week   = Column(SmallInteger, nullable=False)  # 0=Mon … 6=Sun
    start_time    = Column(Time, nullable=False)
    end_time      = Column(Time, nullable=False)
    slot_duration = Column(SmallInteger, default=15)
    is_active     = Column(Boolean, default=True)


class Appointment(Base):
    __tablename__ = "appointments"
    appt_id    = Column(Integer, primary_key=True)
    appt_no    = Column(String, unique=True, nullable=False)
    appt_date  = Column(Date, nullable=False)
    appt_time  = Column(Time, nullable=False)
    pet_id     = Column(Integer, ForeignKey("pets.pet_id"), nullable=False)
    owner_id   = Column(Integer, ForeignKey("pet_owners.owner_id"), nullable=False)
    doctor_id  = Column(Integer, ForeignKey("doctors.doctor_id"), nullable=False)
    reason     = Column(Text)
    status     = Column(String, default="Scheduled")
    arrived_at = Column(DateTime)
    consult_id = Column(Integer, ForeignKey("consultations.consult_id"))
    notes      = Column(Text)
    booked_by  = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=func.now())


# ProcedureMaster moved to models.stage3.Procedure


class Consultation(Base):
    __tablename__ = "consultations"
    consult_id      = Column(Integer, primary_key=True)
    consult_no      = Column(String, unique=True, nullable=False)
    consult_date    = Column(Date, nullable=False)
    consult_time    = Column(Time, nullable=False)
    appointment_id  = Column(Integer, ForeignKey("appointments.appt_id"))
    pet_id          = Column(Integer, ForeignKey("pets.pet_id"), nullable=False)
    owner_id        = Column(Integer, ForeignKey("pet_owners.owner_id"), nullable=False)
    doctor_id       = Column(Integer, ForeignKey("doctors.doctor_id"), nullable=False)
    visit_type      = Column(String, default="OPD")
    chief_complaint = Column(Text)
    temp_celsius    = Column(Numeric(4, 1))
    weight_kg       = Column(Numeric(5, 2))
    heart_rate      = Column(SmallInteger)
    resp_rate       = Column(SmallInteger)
    clinical_notes  = Column(Text)
    diagnosis       = Column(Text)
    advice          = Column(Text)
    followup_date   = Column(Date)
    followup_notes  = Column(Text)
    consult_fee     = Column(Numeric(10, 2), default=0)
    status          = Column(String, default="Open")
    billing_stub_id = Column(Integer)
    closed_at       = Column(DateTime)
    created_by      = Column(Integer, ForeignKey("users.user_id"))
    created_at      = Column(DateTime, default=func.now())


class ConsultationProcedure(Base):
    __tablename__ = "consultation_procedures"
    cp_id        = Column(Integer, primary_key=True)
    consult_id   = Column(Integer, ForeignKey("consultations.consult_id"), nullable=False)
    procedure_id = Column(Integer, ForeignKey("procedures.procedure_id"), nullable=False)
    quantity     = Column(SmallInteger, default=1)
    fee          = Column(Numeric(10, 2))
    notes        = Column(Text)


class Prescription(Base):
    __tablename__ = "prescriptions"
    prescription_id = Column(Integer, primary_key=True)
    rx_no           = Column(String, unique=True, nullable=False)
    rx_date         = Column(Date, nullable=False)
    consult_id      = Column(Integer, ForeignKey("consultations.consult_id"), nullable=False)
    pet_id          = Column(Integer, ForeignKey("pets.pet_id"), nullable=False)
    owner_id        = Column(Integer, ForeignKey("pet_owners.owner_id"), nullable=False)
    doctor_id       = Column(Integer, ForeignKey("doctors.doctor_id"), nullable=False)
    notes           = Column(Text)
    dispensed       = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=func.now())


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"
    rx_item_id      = Column(Integer, primary_key=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.prescription_id"), nullable=False)
    medicine_id     = Column(Integer)           # linked in Phase 3
    medicine_name   = Column(String, nullable=False)
    dosage_form     = Column(String)
    strength        = Column(String)
    dose            = Column(String)
    frequency       = Column(String)
    route           = Column(String)
    duration_days   = Column(SmallInteger)
    instructions    = Column(Text)
    quantity        = Column(Numeric(8, 2))
    dispensed_qty   = Column(Numeric(8, 2), default=0)


# Vaccine moved to models.stage3.Vaccine


class VaccinationRecord(Base):
    __tablename__ = "vaccination_records"
    vacc_record_id = Column(Integer, primary_key=True)
    vacc_record_no = Column(String(30), unique=True, nullable=False)
    consult_id     = Column(Integer, ForeignKey("consultations.consult_id"))
    pet_id         = Column(Integer, ForeignKey("pets.pet_id"), nullable=False)
    owner_id       = Column(Integer, ForeignKey("pet_owners.owner_id"), nullable=False)
    doctor_id      = Column(Integer, ForeignKey("doctors.doctor_id"))
    vaccine_id     = Column(Integer, ForeignKey("vaccines.vaccine_id"), nullable=False)
    given_date     = Column(Date, nullable=False)
    batch_no       = Column(String)
    manufacturer   = Column(String)
    expiry_date    = Column(Date)
    dose_ml        = Column(Numeric(5, 2))
    next_due_date  = Column(Date)
    site           = Column(String)
    notes          = Column(Text)
    vaccination_code = Column(String(50))
    given_by       = Column(Integer, ForeignKey("users.user_id"))
    created_at     = Column(DateTime, default=func.now())


class VaccinationReminder(Base):
    __tablename__ = "vaccination_reminders"
    reminder_id     = Column(Integer, primary_key=True)
    vacc_record_id  = Column(Integer, ForeignKey("vaccination_records.vacc_record_id"), nullable=False)
    pet_id          = Column(Integer, ForeignKey("pets.pet_id"), nullable=False)
    owner_id        = Column(Integer, ForeignKey("pet_owners.owner_id"), nullable=False)
    due_date        = Column(Date, nullable=False)
    reminder_status = Column(String, default="Pending")
    notified_at     = Column(DateTime)
    notified_via    = Column(String)
    created_at      = Column(DateTime, default=func.now())
