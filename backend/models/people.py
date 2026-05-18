"""models/people.py — PetOwner and Pet tables"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Date, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class PetOwner(Base):
    __tablename__ = "pet_owners"

    owner_id        = Column(Integer, primary_key=True, index=True)
    owner_code      = Column(String(30), unique=True, nullable=False)
    name            = Column(String(200), nullable=False, index=True)

    # Contact
    phone           = Column(String(20), nullable=False, index=True)
    alt_phone       = Column(String(20), nullable=True)
    email           = Column(String(100), nullable=True)

    # Address
    address         = Column(String, nullable=True) # legacy
    address1        = Column(Text)
    address2        = Column(Text)
    address3        = Column(Text)
    city_id         = Column(Integer, ForeignKey("cities.city_id"), nullable=True)
    city_name       = Column(String(100), nullable=True) # legacy
    district        = Column(String(100))
    state           = Column(String(100), nullable=True) # legacy
    state_name      = Column(String(100))
    state_code      = Column(String(5))
    pincode         = Column(String(10), nullable=True)

    # Tax
    gstin           = Column(String(20), nullable=True)
    pan             = Column(String(12), nullable=True)
    notes           = Column(String, nullable=True)
    agent_id        = Column(Integer, ForeignKey("agents.agent_id", ondelete="SET NULL"), nullable=True)

    # Financial
    is_active       = Column(Boolean, default=True)
    opening_balance = Column(Numeric(12, 2), default=0)
    balance_type    = Column(String(2), default="DR")
    discount_pct    = Column(Numeric(5, 2), default=0)

    # GL Link
    gl_account_id   = Column(Integer, ForeignKey("gl_master.gl_id"), nullable=True)

    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())

    city_link       = relationship("City", foreign_keys=[city_id])
    gl_account      = relationship("GLMaster", foreign_keys=[gl_account_id])


class Pet(Base):
    __tablename__ = "pets"

    pet_id          = Column(Integer, primary_key=True, index=True)
    pet_code        = Column(String(30), unique=True, nullable=False)
    name            = Column(String(150), nullable=False, index=True)
    owner_id        = Column(Integer, ForeignKey("pet_owners.owner_id", ondelete="RESTRICT"), nullable=False)
    species_id      = Column(Integer, ForeignKey("species.species_id"), nullable=False)
    breed_id        = Column(Integer, ForeignKey("breeds.breed_id"), nullable=True)
    gender          = Column(String(10), nullable=True)
    dob             = Column(Date, nullable=True)
    age_years       = Column(Integer, nullable=True)
    age_months      = Column(Integer, nullable=True)
    color           = Column(String(100), nullable=True)
    weight_kg       = Column(Numeric(6, 2), nullable=True)
    microchip_no    = Column(String(50), nullable=True)
    blood_group     = Column(String(10), nullable=True)
    is_neutered     = Column(Boolean, default=False)
    photo_path      = Column(String, nullable=True)
    notes           = Column(String, nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())
    updated_at      = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PetClinicalSummary(Base):
    __tablename__ = "pet_clinical_summary"
    summary_id         = Column(Integer, primary_key=True)
    pet_id             = Column(Integer, ForeignKey("pets.pet_id", ondelete="CASCADE"), unique=True, nullable=False)
    blood_group        = Column(String(20))
    microchip_no       = Column(String(50), unique=True)
    is_spayed_neutered = Column(Boolean, default=False)
    spay_neuter_date   = Column(Date)
    lifestyle_note     = Column(Text)
    dietary_note       = Column(Text)
    insurance_provider = Column(String(100))
    insurance_policy_no= Column(String(100))
    warning_flags      = Column(Text)  # Comma-separated string of warning flags e.g. "AGGRESSIVE,EPILEPTIC"

    pet = relationship("Pet", backref="clinical_summary")


class PetAllergy(Base):
    __tablename__ = "pet_allergies"
    allergy_id      = Column(Integer, primary_key=True)
    pet_id          = Column(Integer, ForeignKey("pets.pet_id", ondelete="CASCADE"), nullable=False)
    allergen        = Column(String(150), nullable=False)
    reaction_type   = Column(String(100))
    severity        = Column(String(20)) # Mild, Moderate, Severe, Life-Threatening
    discovered_date = Column(Date)
    notes           = Column(Text)
    is_active       = Column(Boolean, default=True)


class PetVitalsLog(Base):
    __tablename__ = "pet_vitals_log"
    vital_id             = Column(Integer, primary_key=True)
    pet_id               = Column(Integer, ForeignKey("pets.pet_id", ondelete="CASCADE"), nullable=False)
    consult_id           = Column(Integer)
    recorded_at          = Column(DateTime, default=func.now())
    weight_kg            = Column(Numeric(6, 2))
    temp_celsius         = Column(Numeric(4, 1))
    heart_rate           = Column(Integer)
    resp_rate            = Column(Integer)
    body_condition_score = Column(Integer) # 1 to 9 scale


class PetLabRecord(Base):
    __tablename__ = "pet_lab_records"
    lab_record_id         = Column(Integer, primary_key=True)
    pet_id                = Column(Integer, ForeignKey("pets.pet_id", ondelete="CASCADE"), nullable=False)
    consult_id            = Column(Integer)
    test_name             = Column(String(200), nullable=False)
    test_category         = Column(String(50)) # Blood, Urine, Stool, Cytology, Imaging
    sample_collected_date = Column(DateTime, default=func.now())
    results_summary       = Column(Text)
    attachment_url        = Column(Text)
    performed_by          = Column(String(100))
    created_at            = Column(DateTime, default=func.now())


class PetTimelineEvent(Base):
    __tablename__ = "pet_timeline_events"
    event_id        = Column(Integer, primary_key=True)
    pet_id          = Column(Integer, ForeignKey("pets.pet_id", ondelete="CASCADE"), nullable=False)
    event_date      = Column(DateTime, nullable=False)
    event_type      = Column(String(50), nullable=False) # CONSULTATION, VACCINE, SURGERY, LAB_TEST, PRESCRIPTION
    ref_id          = Column(Integer, nullable=False)
    title           = Column(String(200), nullable=False)
    summary_snippet = Column(Text)
    doctor_id       = Column(Integer, ForeignKey("doctors.doctor_id"))
    clinic_branch_id= Column(Integer)

