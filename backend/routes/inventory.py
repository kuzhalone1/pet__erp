"""routes/inventory.py — Medicine Master, Suppliers, and Stock tracking (Stage 3)"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.stage3 import Medicine, MedicineBatch, StockLedger, Unit
from models.phase3 import Supplier
from schemas.pharmacy import (
    SupplierCreate, SupplierOut,
    MedicineCreate, MedicineOut,
    BatchCreate, BatchOut,
    UnitCreate, UnitOut, StockLedgerOut
)
from utils.doc_sequence import get_next_doc_no
from utils.gl_utils import create_gl_account
from utils.stock import post_stock_ledger

router = APIRouter(prefix="/inventory", tags=["Inventory"])

# ── UNITS ───────────────────────────────────────────────────
@router.get("/units", response_model=List[UnitOut])
def list_units(db: Session = Depends(get_db)):
    return db.query(Unit).filter(Unit.is_active == True).order_by(Unit.unit_name).all()

@router.post("/units", response_model=UnitOut)
def create_unit(data: UnitCreate, db: Session = Depends(get_db)):
    existing = db.query(Unit).filter(Unit.unit_name.ilike(data.unit_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Unit already exists")
    u = Unit(**data.model_dump())
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

# ── SUPPLIERS ────────────────────────────────────────────────
@router.get("/suppliers", response_model=List[SupplierOut])
def list_suppliers(search: Optional[str] = Query(None), include_inactive: bool = Query(False), db: Session = Depends(get_db)):
    q = db.query(Supplier)
    if not include_inactive:
        q = q.filter(Supplier.is_active == True)
    if search:
        q = q.filter(Supplier.supplier_name.ilike(f"%{search}%"))
    return q.order_by(Supplier.supplier_name).all()

@router.post("/suppliers", response_model=SupplierOut)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    if not payload.get("supplier_code"):
        payload["supplier_code"] = get_next_doc_no(db, "SUP")
    
    # Auto-create GL Account
    gl_id = create_gl_account("supplier", data.supplier_name, db, **payload)
    payload["gl_account_id"] = gl_id

    s = Supplier(**payload)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s

@router.put("/suppliers/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: int, data: SupplierCreate, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.supplier_id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return s

@router.delete("/suppliers/{supplier_id}")
def deactivate_supplier(supplier_id: int, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.supplier_id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    s.is_active = False
    db.commit()
    return {"message": "Supplier deactivated"}

@router.put("/suppliers/{supplier_id}/reactivate", response_model=SupplierOut)
def reactivate_supplier(supplier_id: int, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.supplier_id == supplier_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Supplier not found")
    s.is_active = True
    db.commit()
    db.refresh(s)
    return s


# ── MEDICINES ────────────────────────────────────────────────
@router.get("/medicines", response_model=List[MedicineOut])
def list_medicines(search: Optional[str] = Query(None), include_inactive: bool = Query(False), db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    q = db.query(Medicine).options(joinedload(Medicine.gst_rate))
    if not include_inactive:
        q = q.filter(Medicine.is_active == True)
    if search:
        q = q.filter(Medicine.medicine_name.ilike(f"%{search}%") | Medicine.medicine_name2.ilike(f"%{search}%"))
    
    results = q.order_by(Medicine.medicine_name).all()
    for m in results:
        m.gst_pct = m.gst_rate.gst_percent if m.gst_rate else 12
    return results

@router.post("/medicines", response_model=MedicineOut)
def create_medicine(data: MedicineCreate, db: Session = Depends(get_db)):
    payload = data.model_dump()
    if not payload.get("medicine_code"):
        payload["medicine_code"] = get_next_doc_no(db, "MEDICINE")
    m = Medicine(**payload)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m

@router.put("/medicines/{medicine_id}", response_model=MedicineOut)
def update_medicine(medicine_id: int, data: MedicineCreate, db: Session = Depends(get_db)):
    m = db.query(Medicine).filter(Medicine.medicine_id == medicine_id).first()
    if not m: raise HTTPException(404, "Medicine not found")
    for k, v in data.model_dump().items(): setattr(m, k, v)
    db.commit(); db.refresh(m)
    return m

# ── BATCHES & STOCK ──────────────────────────────────────────
@router.get("/batches/{medicine_id}", response_model=List[BatchOut])
def get_medicine_batches(medicine_id: int, db: Session = Depends(get_db)):
    """Get all batches for a medicine"""
    return db.query(MedicineBatch).filter(
        MedicineBatch.medicine_id == medicine_id
    ).order_by(MedicineBatch.expiry_date.asc()).all()

@router.post("/batches", response_model=BatchOut)
def create_opening_batch(data: BatchCreate, db: Session = Depends(get_db)):
    """Add manual opening stock batch"""
    payload = data.model_dump()
    qty = payload.pop("opening_qty", 0)
    
    b = MedicineBatch(**payload, opening_qty=qty)
    db.add(b)
    db.flush() # get b.batch_id
    
    if qty > 0:
        post_stock_ledger(
            db, b.medicine_id, b.batch_id, 
            txn_type="OPENING", qty=qty,
            ref_type="Opening", ref_id=None, ref_number="OPENING",
            created_by=1 # System user for now
        )
    
    db.commit(); db.refresh(b)
    return b

@router.get("/stock-ledger", response_model=List[StockLedgerOut])
def get_stock_ledger(medicine_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(StockLedger)
    if medicine_id:
        q = q.filter(StockLedger.medicine_id == medicine_id)
    return q.order_by(StockLedger.created_at.desc()).limit(100).all()
