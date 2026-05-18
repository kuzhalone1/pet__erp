"""routes/pharmacy.py — Purchase Bills, Dispensing, and Stock Logic"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from database import get_db
from models.stage3 import (
    Medicine, MedicineBatch, StockLedger
)
from models.phase3 import (
    Supplier,
    PurchaseBill, PurchaseBillItem,
    PharmacyBill, PharmacyBillItem
)
from schemas.pharmacy import (
    PurchaseBillCreate, PurchaseBillOut,
    PharmacyBillCreate, PharmacyBillOut
)
from utils.doc_sequence import get_next_doc_no

router = APIRouter(prefix="/pharmacy", tags=["Pharmacy"])

# ── PURCHASE BILLING (INWARD STOCK) ──────────────────────────
@router.post("/purchase", response_model=PurchaseBillOut)
def record_purchase(data: PurchaseBillCreate, db: Session = Depends(get_db)):
    """Records a purchase bill and adds items to batch-wise stock"""
    bill_no = get_next_doc_no(db, "PUR")
    
    # 1. Create Purchase Bill Header
    bill = PurchaseBill(
        bill_no=bill_no,
        supplier_id=data.supplier_id,
        supplier_invoice_no=data.supplier_invoice_no,
        bill_date=data.bill_date,
        discount_amount=data.discount_amount,
        notes=data.notes,
        status="Completed"
    )
    db.add(bill)
    db.flush() # Get bill_id
    
    total_net = Decimal("0")
    
    # 2. Process Items
    for item in data.items:
        # Calculate totals
        gross = item.purchase_price * (item.quantity + item.free_quantity)
        gst_amt = gross * (item.gst_pct / 100)
        net = gross + gst_amt
        total_net += net
        
        # Add Bill Item
        pb_item = PurchaseBillItem(
            bill_id=bill.bill_id,
            medicine_id=item.medicine_id,
            batch_no=item.batch_no,
            mfg_date=item.mfg_date,
            expiry_date=item.expiry_date,
            quantity=item.quantity,
            free_quantity=item.free_quantity,
            purchase_price=item.purchase_price,
            sale_price=item.sale_price,
            gst_pct=item.gst_pct,
            line_total=net
        )
        db.add(pb_item)
        
        # 3. Update Inventory (Batches)
        batch = db.query(MedicineBatch).filter(
            MedicineBatch.medicine_id == item.medicine_id,
            MedicineBatch.batch_no == item.batch_no
        ).first()
        
        if batch:
            batch.current_qty += (item.quantity + item.free_quantity)
            batch.purchase_price = item.purchase_price
            batch.sale_price = item.sale_price
        else:
            batch = MedicineBatch(
                medicine_id=item.medicine_id,
                batch_no=item.batch_no,
                mfg_date=item.mfg_date,
                expiry_date=item.expiry_date,
                purchase_price=item.purchase_price,
                sale_price=item.sale_price,
                current_qty=(item.quantity + item.free_quantity)
            )
            db.add(batch)
            db.flush()
            
        # 4. Update Medicine Master Total Stock
        med = db.query(Medicine).filter(Medicine.medicine_id == item.medicine_id).first()
        if med:
            med.current_stock += (item.quantity + item.free_quantity)
            
        # 5. Add Stock Ledger Entry
        ledger = StockLedger(
            medicine_id=item.medicine_id,
            batch_id=batch.batch_id,
            txn_date=bill.bill_date,
            txn_type="PURCHASE",
            qty=(item.quantity + item.free_quantity),
            qty_in=(item.quantity + item.free_quantity),
            qty_out=0,
            ref_type="PUR",
            ref_id=bill.bill_id,
            ref_number=bill.bill_no
        )
        db.add(ledger)

    bill.net_amount = total_net
    db.commit()
    db.refresh(bill)
    return bill
    

@router.get("/purchase", response_model=List[PurchaseBillOut])
def list_purchase_bills(
    q: Optional[str] = Query(None),
    supplier_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(PurchaseBill).options(joinedload(PurchaseBill.items))
    if q:
        query = query.filter(
            (PurchaseBill.bill_no.ilike(f"%{q}%")) |
            (PurchaseBill.supplier_invoice_no.ilike(f"%{q}%"))
        )
    if supplier_id:
        query = query.filter(PurchaseBill.supplier_id == supplier_id)
    return query.order_by(PurchaseBill.created_at.desc()).all()


@router.get("/purchase/{bill_id}", response_model=PurchaseBillOut)
def get_purchase_bill(bill_id: int, db: Session = Depends(get_db)):
    bill = db.query(PurchaseBill).options(joinedload(PurchaseBill.items)).filter(PurchaseBill.bill_id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Purchase bill not found")
    return bill


@router.delete("/purchase/{bill_id}")
def delete_purchase_bill(bill_id: int, db: Session = Depends(get_db)):
    bill = db.query(PurchaseBill).filter(PurchaseBill.bill_id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Stock Reversal logic
    items = db.query(PurchaseBillItem).filter(PurchaseBillItem.bill_id == bill_id).all()
    for item in items:
        # Subtract stock from batch
        batch = db.query(MedicineBatch).filter(
            MedicineBatch.medicine_id == item.medicine_id,
            MedicineBatch.batch_no == item.batch_no
        ).first()
        if batch:
            batch.current_qty -= (item.quantity + item.free_quantity)
            
        # Subtract from master
        med = db.query(Medicine).filter(Medicine.medicine_id == item.medicine_id).first()
        if med:
            med.current_stock -= (item.quantity + item.free_quantity)
            
        # Delete ledger entries
        db.query(StockLedger).filter(
            StockLedger.ref_type == "PUR",
            StockLedger.ref_id == bill_id
        ).delete()
        
    db.delete(bill)
    db.commit()
    return {"message": "Purchase bill deleted and stock reversed"}


@router.put("/purchase/{bill_id}", response_model=PurchaseBillOut)
def update_purchase_bill(bill_id: int, data: PurchaseBillCreate, db: Session = Depends(get_db)):
    """Updates a purchase bill by reversing old stock and applying new data"""
    bill = db.query(PurchaseBill).filter(PurchaseBill.bill_id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    # 1. Reverse stock for existing items
    old_items = db.query(PurchaseBillItem).filter(PurchaseBillItem.bill_id == bill_id).all()
    for item in old_items:
        batch = db.query(MedicineBatch).filter(
            MedicineBatch.medicine_id == item.medicine_id,
            MedicineBatch.batch_no == item.batch_no
        ).first()
        if batch:
            batch.current_qty -= (item.quantity + item.free_quantity)
            
        med = db.query(Medicine).filter(Medicine.medicine_id == item.medicine_id).first()
        if med:
            med.current_stock -= (item.quantity + item.free_quantity)
            
        db.query(StockLedger).filter(
            StockLedger.ref_type == "PUR",
            StockLedger.ref_id == bill_id
        ).delete()
    
    # 2. Clear old items
    db.query(PurchaseBillItem).filter(PurchaseBillItem.bill_id == bill_id).delete()
    
    # 3. Update header fields
    bill.supplier_id = data.supplier_id
    bill.supplier_invoice_no = data.supplier_invoice_no
    bill.bill_date = data.bill_date
    bill.discount_amount = data.discount_amount
    bill.notes = data.notes
    
    # 4. Re-apply new items (logic copied from record_purchase)
    total_net = Decimal("0")
    for item in data.items:
        gross = item.purchase_price * (item.quantity + item.free_quantity)
        gst_amt = gross * (item.gst_pct / 100)
        net = gross + gst_amt
        total_net += net
        
        pb_item = PurchaseBillItem(
            bill_id=bill.bill_id,
            medicine_id=item.medicine_id,
            batch_no=item.batch_no,
            mfg_date=item.mfg_date,
            expiry_date=item.expiry_date,
            quantity=item.quantity,
            free_quantity=item.free_quantity,
            purchase_price=item.purchase_price,
            sale_price=item.sale_price,
            gst_pct=item.gst_pct,
            line_total=net
        )
        db.add(pb_item)
        
        batch = db.query(MedicineBatch).filter(
            MedicineBatch.medicine_id == item.medicine_id,
            MedicineBatch.batch_no == item.batch_no
        ).first()
        if batch:
            batch.current_qty += (item.quantity + item.free_quantity)
            batch.purchase_price = item.purchase_price
            batch.sale_price = item.sale_price
        else:
            batch = MedicineBatch(
                medicine_id=item.medicine_id,
                batch_no=item.batch_no,
                mfg_date=item.mfg_date,
                expiry_date=item.expiry_date,
                purchase_price=item.purchase_price,
                sale_price=item.sale_price,
                current_qty=(item.quantity + item.free_quantity)
            )
            db.add(batch)
            db.flush()
            
        med = db.query(Medicine).filter(Medicine.medicine_id == item.medicine_id).first()
        if med:
            med.current_stock += (item.quantity + item.free_quantity)
            
        ledger = StockLedger(
            medicine_id=item.medicine_id,
            batch_id=batch.batch_id,
            txn_date=bill.bill_date,
            txn_type="PURCHASE",
            qty=(item.quantity + item.free_quantity),
            qty_in=(item.quantity + item.free_quantity),
            qty_out=0,
            ref_type="PUR",
            ref_id=bill.bill_id,
            ref_number=bill.bill_no
        )
        db.add(ledger)

    bill.net_amount = total_net
    db.commit()
    db.refresh(bill)
    return bill


# ── PHARMACY BILLING (DISPENSING / SALES) ────────────────────
@router.post("/bill", response_model=PharmacyBillOut)
def record_sale(data: PharmacyBillCreate, db: Session = Depends(get_db)):
    """Records a pharmacy bill and deducts items from batch-wise stock"""
    bill_no = get_next_doc_no(db, "PHM")
    
    bill = PharmacyBill(
        pharma_bill_no=bill_no,
        owner_id=data.owner_id,
        pet_id=data.pet_id,
        prescription_id=data.prescription_id,
        bill_date=datetime.now().date(),
        payment_mode=data.payment_mode,
        discount_amount=data.discount_amount,
        status="Completed"
    )
    db.add(bill)
    db.flush()
    
    total_net = Decimal("0")
    
    for item in data.items:
        # Verify Stock Availability
        batch = db.query(MedicineBatch).filter(MedicineBatch.batch_id == item.batch_id).first()
        if not batch or batch.current_qty < item.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock in batch {batch.batch_no if batch else 'N/A'}")
            
        # Calculate item total
        gross = item.sale_price * item.quantity
        disc = gross * (item.discount_pct / 100)
        net = gross - disc
        total_net += net
        
        # Create Bill Line
        med = db.query(Medicine).filter(Medicine.medicine_id == item.medicine_id).first()
        pb_item = PharmacyBillItem(
            pharmacy_bill_id=bill.pharmacy_bill_id,
            medicine_id=item.medicine_id,
            batch_id=item.batch_id,
            medicine_name=med.medicine_name if med else "Unknown",
            batch_no=batch.batch_no,
            expiry_date=batch.expiry_date,
            quantity=item.quantity,
            sale_price=item.sale_price,
            discount_pct=item.discount_pct,
            line_total=net,
            rx_item_id=item.rx_item_id
        )
        db.add(pb_item)
        
        # ── STOCK DEDUCTION ──
        batch.current_qty -= item.quantity
        if med:
            med.current_stock -= item.quantity
            
        # Stock Ledger
        ledger = StockLedger(
            medicine_id=item.medicine_id,
            batch_id=batch.batch_id,
            txn_date=bill.bill_date,
            txn_type="SALE",
            qty=item.quantity,
            qty_in=0,
            qty_out=item.quantity,
            ref_type="PHM",
            ref_id=bill.pharmacy_bill_id,
            ref_number=bill.pharma_bill_no
        )
        db.add(ledger)

    bill.net_amount = total_net - data.discount_amount
    db.commit()
    db.refresh(bill)
    return bill

@router.get("/bills", response_model=List[PharmacyBillOut])
def list_pharmacy_bills(db: Session = Depends(get_db)):
    return db.query(PharmacyBill).order_by(PharmacyBill.created_at.desc()).all()
