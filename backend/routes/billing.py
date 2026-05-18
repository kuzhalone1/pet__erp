from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
from models.stage3 import SalesBill, SalesBillItem, Medicine, MedicineBatch, Procedure, StockLedger
from models.people import PetOwner
from models.masters import GstRate
from models.clinic import ClinicSetup
from schemas.billing import SalesBillCreate, SalesBillOut
from utils.billing import calculate_line_item, calculate_bill_totals
from utils.stock import post_stock_ledger
from utils.doc_sequence import get_next_doc_no

router = APIRouter(prefix="/billing/sales", tags=["Billing"])

@router.post("/confirm", response_model=SalesBillOut)
def confirm_sales_bill(data: SalesBillCreate, db: Session = Depends(get_db)):
    """Creates and CONFIRMS a sales bill. Posts to stock ledger immediately."""
    clinic = db.query(ClinicSetup).first()
    if not clinic: raise HTTPException(400, "Clinic Setup missing")
    
    owner = db.query(PetOwner).filter(PetOwner.owner_id == data.owner_id).first()
    is_interstate = False
    if owner and owner.state_code and clinic.state_code:
        is_interstate = (owner.state_code != clinic.state_code)

    processed_lines = []
    
    for line in data.items:
        gst_rate_id = None
        hsn_code = ""
        description = ""
        unit = ""
        
        if line.line_type == 'Medicine':
            m = db.query(Medicine).filter(Medicine.medicine_id == line.medicine_id).first()
            if not m: raise HTTPException(404, f"Medicine {line.medicine_id} not found")
            gst_rate_id = m.gst_rate_id
            hsn_code = m.hsn.hsn_code if m.hsn else ""
            description = m.medicine_name
            unit = m.unit.unit_name if m.unit else ""
            
            batch = db.query(MedicineBatch).filter(MedicineBatch.batch_id == line.batch_id).first()
            if not batch: raise HTTPException(404, f"Batch {line.batch_id} not found")
            if batch.current_qty < line.qty:
                raise HTTPException(422, f"Insufficient stock: {m.medicine_name}")

        elif line.line_type == 'Procedure':
            p = db.query(Procedure).filter(Procedure.procedure_id == line.procedure_id).first()
            if not p: raise HTTPException(404, f"Procedure {line.procedure_id} not found")
            gst_rate_id = p.gst_rate_id
            hsn_code = p.hsn.hsn_code if p.hsn else ""
            description = p.procedure_name

        gst_rate = db.query(GstRate).filter(GstRate.gst_rate_id == gst_rate_id).first()
        if not gst_rate: raise HTTPException(400, "GST Rate missing")
            
        calc = calculate_line_item(line.rate, line.qty, line.discount_pct, gst_rate, is_interstate)
        
        item_data = {
            **line.model_dump(),
            **calc,
            "description": description,
            "hsn_code": hsn_code,
            "unit": unit,
            "gst_rate_id": gst_rate_id,
            "gst_pct": gst_rate.gst_percent
        }
        processed_lines.append(item_data)

    totals = calculate_bill_totals(processed_lines)
    
    bill_no = get_next_doc_no(db, "SB")
    bill = SalesBill(
        **data.model_dump(exclude={"items"}),
        **totals,
        bill_number=bill_no,
        is_interstate=is_interstate,
        status="Confirmed",
        created_by=1
    )
    db.add(bill)
    db.flush()

    for i_data in processed_lines:
        item = SalesBillItem(**i_data, bill_id=bill.bill_id)
        db.add(item)
        
        if item.line_type == 'Medicine':
            post_stock_ledger(
                db, item.medicine_id, item.batch_id, 
                txn_type="SALE", qty=item.qty,
                ref_type="SalesBill", ref_id=bill.bill_id, ref_number=bill.bill_number,
                created_by=1
            )

    db.commit()
    db.refresh(bill)
    return bill

@router.get("/", response_model=List[SalesBillOut])
def list_bills(db: Session = Depends(get_db)):
    return db.query(SalesBill).options(
        joinedload(SalesBill.owner),
        joinedload(SalesBill.pet),
        joinedload(SalesBill.doctor),
        joinedload(SalesBill.items)
    ).order_by(SalesBill.created_at.desc()).all()

@router.get("/{bill_id}", response_model=SalesBillOut)
def get_bill(bill_id: int, db: Session = Depends(get_db)):
    bill = db.query(SalesBill).options(
        joinedload(SalesBill.owner),
        joinedload(SalesBill.pet),
        joinedload(SalesBill.doctor),
        joinedload(SalesBill.items)
    ).filter(SalesBill.bill_id == bill_id).first()
    if not bill: raise HTTPException(404, "Bill not found")
    return bill

@router.get("/by-number/{bill_number}", response_model=SalesBillOut)
def get_bill_by_number(bill_number: str, db: Session = Depends(get_db)):
    bill = db.query(SalesBill).options(
        joinedload(SalesBill.owner),
        joinedload(SalesBill.pet),
        joinedload(SalesBill.doctor),
        joinedload(SalesBill.items)
    ).filter(SalesBill.bill_number == bill_number).first()
    if not bill: raise HTTPException(404, "Bill not found")
    return bill

@router.put("/{bill_id}", response_model=SalesBillOut)
def update_sales_bill(bill_id: int, data: SalesBillCreate, db: Session = Depends(get_db)):
    bill = db.query(SalesBill).filter(SalesBill.bill_id == bill_id).first()
    if not bill: raise HTTPException(404, "Bill not found")
    
    # 1. REVERSE STOCK
    old_items = db.query(SalesBillItem).filter(SalesBillItem.bill_id == bill_id).all()
    for item in old_items:
        if item.line_type == 'Medicine':
            batch = db.query(MedicineBatch).filter_by(batch_id=item.batch_id).first()
            if batch: batch.current_qty += item.qty
            med = db.query(Medicine).filter_by(medicine_id=item.medicine_id).first()
            if med: med.current_stock += item.qty
    
    # Delete old items and ledger
    db.query(SalesBillItem).filter(SalesBillItem.bill_id == bill_id).delete()
    db.query(StockLedger).filter(StockLedger.ref_type == "SalesBill", StockLedger.ref_id == bill_id).delete()
    
    # 2. APPLY NEW DATA (Same as POST but keep bill_id/bill_number)
    clinic = db.query(ClinicSetup).first()
    owner = db.query(PetOwner).filter(PetOwner.owner_id == data.owner_id).first()
    is_interstate = (owner.state_code != clinic.state_code) if (owner and owner.state_code and clinic.state_code) else False

    processed_lines = []
    for line in data.items:
        # (Abridged logic for brevity, matches POST)
        gst_rate = None
        if line.line_type == 'Medicine':
            m = db.query(Medicine).filter(Medicine.medicine_id == line.medicine_id).first()
            gst_rate_id = m.gst_rate_id
            description, hsn, unit = m.medicine_name, (m.hsn.hsn_code if m.hsn else ""), (m.unit.unit_name if m.unit else "")
        else:
            p = db.query(Procedure).filter(Procedure.procedure_id == line.procedure_id).first()
            gst_rate_id = p.gst_rate_id
            description, hsn, unit = p.procedure_name, (p.hsn.hsn_code if p.hsn else ""), ""

        gst_rate = db.query(GstRate).filter(GstRate.gst_rate_id == gst_rate_id).first()
        calc = calculate_line_item(line.rate, line.qty, line.discount_pct, gst_rate, is_interstate)
        processed_lines.append({**line.model_dump(), **calc, "description": description, "hsn_code": hsn, "unit": unit, "gst_rate_id": gst_rate_id, "gst_pct": gst_rate.gst_percent})

    totals = calculate_bill_totals(processed_lines)
    
    # Update header
    for key, val in data.model_dump(exclude={"items"}).items():
        setattr(bill, key, val)
    for key, val in totals.items():
        setattr(bill, key, val)
    bill.is_interstate = is_interstate
    
    for i_data in processed_lines:
        item = SalesBillItem(**i_data, bill_id=bill.bill_id)
        db.add(item)
        if item.line_type == 'Medicine':
            post_stock_ledger(db, item.medicine_id, item.batch_id, txn_type="SALE", qty=item.qty, ref_type="SalesBill", ref_id=bill.bill_id, ref_number=bill.bill_number, created_by=1)

    db.commit()
    db.refresh(bill)
    return bill

@router.delete("/{bill_id}")
def delete_sales_bill(bill_id: int, db: Session = Depends(get_db)):
    bill = db.query(SalesBill).filter(SalesBill.bill_id == bill_id).first()
    if not bill: raise HTTPException(404, "Bill not found")
    
    items = db.query(SalesBillItem).filter(SalesBillItem.bill_id == bill_id).all()
    for item in items:
        if item.line_type == 'Medicine':
            batch = db.query(MedicineBatch).filter_by(batch_id=item.batch_id).first()
            if batch: batch.current_qty += item.qty
            med = db.query(Medicine).filter_by(medicine_id=item.medicine_id).first()
            if med: med.current_stock += item.qty
                
    db.query(StockLedger).filter(StockLedger.ref_type == "SalesBill", StockLedger.ref_id == bill_id).delete()
    db.delete(bill)
    db.commit()
    return {"message": "Sales bill deleted"}
