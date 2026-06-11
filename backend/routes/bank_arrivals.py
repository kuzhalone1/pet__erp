from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from database import get_db
from models.accounts import BankArrival
from schemas.accounts import (
    BankArrivalCreate, BankArrivalUpdate, BankArrivalOut
)
from utils.doc_sequence import get_next_doc_no, format_fy

router = APIRouter(prefix="/accounts/bank-arrivals", tags=["Accounts"])

def _ensure_ba_sequence(db: Session, fy_code: str):
    db.execute(text("""
        INSERT INTO doc_sequences (doc_type, prefix, current_no, pad_length, use_fin_year, fin_year, reset_on_year)
        VALUES ('BA', 'BA-', 0, 5, true, :fy, true)
        ON CONFLICT (doc_type) DO NOTHING;
    """), {"fy": format_fy(fy_code)})
    db.commit()

@router.get("/next-voucher-no")
def get_next_voucher_preview(fy_code: str = Query("2025-26"), db: Session = Depends(get_db)):
    _ensure_ba_sequence(db, fy_code)
    result = db.execute(text("""
        SELECT
            CASE
                WHEN use_fin_year AND fin_year != ''
                    THEN prefix || fin_year || LPAD((current_no + 1)::TEXT, pad_length, '0')
                ELSE
                    prefix || LPAD((current_no + 1)::TEXT, pad_length, '0')
            END AS next_no
        FROM doc_sequences
        WHERE doc_type = 'BA'
    """)).fetchone()
    return {"voucher_no": result[0] if result else "BA-Auto"}

@router.post("/", response_model=BankArrivalOut)
def create_bank_arrival(data: BankArrivalCreate, db: Session = Depends(get_db)):
    if not data.voucher_no:
        _ensure_ba_sequence(db, data.fy_code)
        data.voucher_no = get_next_doc_no(db, "BA")
        
    ba = BankArrival(
        fy_code=data.fy_code,
        voucher_no=data.voucher_no,
        voucher_date=data.voucher_date,
        gl_party_id=data.gl_party_id,
        party_name=data.party_name,
        gl_bank_id=data.gl_bank_id,
        bank_name=data.bank_name,
        amount=data.amount,
        entered_amount=Decimal("0"),
        ref_doc_no=data.ref_doc_no,
        ref_doc_date=data.ref_doc_date,
        narration=data.narration,
        status="Open"
    )
    db.add(ba)
    db.commit()
    db.refresh(ba)
    return ba

@router.get("/", response_model=List[BankArrivalOut])
def list_bank_arrivals(
    fy_code: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    gl_party_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(BankArrival)
    if fy_code:
        query = query.filter(BankArrival.fy_code == fy_code)
    if status:
        query = query.filter(BankArrival.status == status)
    if gl_party_id:
        query = query.filter(BankArrival.gl_party_id == gl_party_id)
        
    return query.order_by(BankArrival.created_at.desc()).all()

@router.get("/{arrival_id}", response_model=BankArrivalOut)
def get_bank_arrival(arrival_id: int, db: Session = Depends(get_db)):
    ba = db.query(BankArrival).filter(BankArrival.arrival_id == arrival_id).first()
    if not ba:
        raise HTTPException(status_code=404, detail="Bank Arrival not found")
    return ba

@router.put("/{arrival_id}", response_model=BankArrivalOut)
def update_bank_arrival(arrival_id: int, data: BankArrivalUpdate, db: Session = Depends(get_db)):
    ba = db.query(BankArrival).filter(BankArrival.arrival_id == arrival_id).first()
    if not ba:
        raise HTTPException(status_code=404, detail="Bank Arrival not found")
        
    if data.voucher_date is not None:
        ba.voucher_date = data.voucher_date
    if data.ref_doc_no is not None:
        ba.ref_doc_no = data.ref_doc_no
    if data.ref_doc_date is not None:
        ba.ref_doc_date = data.ref_doc_date
    if data.narration is not None:
        ba.narration = data.narration
    if data.status is not None:
        ba.status = data.status
        
    db.commit()
    db.refresh(ba)
    return ba

@router.delete("/{arrival_id}")
def delete_bank_arrival(arrival_id: int, db: Session = Depends(get_db)):
    ba = db.query(BankArrival).filter(BankArrival.arrival_id == arrival_id).first()
    if not ba:
        raise HTTPException(status_code=404, detail="Bank Arrival not found")
        
    ba.status = "Cancelled"
    db.commit()
    return {"message": "Bank Arrival cancelled successfully"}
