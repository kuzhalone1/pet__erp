from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from database import get_db
from models.accounts import JournalVoucher, JournalLine, GLPosting
from schemas.accounts import (
    JournalCreate, JournalOut
)
from utils.doc_sequence import get_next_doc_no, format_fy

router = APIRouter(prefix="/accounts/journal-vouchers", tags=["Accounts"])

@router.post("/", response_model=JournalOut)
def create_journal_voucher(data: JournalCreate, db: Session = Depends(get_db)):
    # Validate Balance (use rounding to handle float/Decimal precision)
    total_cr = sum(line.cr_amount for line in data.lines)
    total_dr = sum(line.dr_amount for line in data.lines)
    
    if round(total_cr, 2) != round(total_dr, 2):
        diff = abs(total_cr - total_dr)
        raise HTTPException(
            status_code=400, 
            detail=f"Journal does not balance. CR total: {total_cr}, DR total: {total_dr}, Difference: {round(diff, 2)}"
        )

    if not data.voucher_no:
        formatted_fy = format_fy(data.fy_code) if data.fy_code else ""
        db.execute(text("""
            INSERT INTO doc_sequences (doc_type, prefix, current_no, pad_length, use_fin_year, fin_year, reset_on_year)
            VALUES ('JV', 'JV-', 0, 5, true, :fy, true)
            ON CONFLICT (doc_type) DO UPDATE
                SET fin_year = EXCLUDED.fin_year
                WHERE doc_sequences.fin_year != EXCLUDED.fin_year;
        """), {"fy": formatted_fy})
        db.commit()
        data.voucher_no = get_next_doc_no(db, "JV")
        
    try:
        # Create Header
        jv = JournalVoucher(
            fy_code=data.fy_code,
            voucher_no=data.voucher_no,
            voucher_date=data.voucher_date,
            bill_ref_no=data.bill_ref_no,
            narration=data.narration,
            total_cr=total_cr,
            total_dr=total_dr,
            status="Posted"
        )
        db.add(jv)
        db.flush()

        # Create Lines & GL Postings
        for i, line in enumerate(data.lines, start=1):
            jv_line = JournalLine(
                journal_id=jv.journal_id,
                line_no=i,
                gl_cr_id=line.gl_cr_id,
                cr_account_name=line.cr_account_name,
                gl_dr_id=line.gl_dr_id,
                dr_account_name=line.dr_account_name,
                cr_amount=line.cr_amount,
                dr_amount=line.dr_amount
            )
            db.add(jv_line)
            
            # Post to GL for DR side if amount > 0
            if line.dr_amount > 0 and line.gl_dr_id:
                dr_post = GLPosting(
                    fy_code=data.fy_code,
                    posting_date=data.voucher_date,
                    gl_id=line.gl_dr_id,
                    voucher_type="JournalVoucher",
                    voucher_no=data.voucher_no,
                    voucher_ref_id=jv.journal_id,
                    dr_amount=line.dr_amount,
                    cr_amount=0,
                    narration=data.narration
                )
                db.add(dr_post)
            
            # Post to GL for CR side if amount > 0
            if line.cr_amount > 0 and line.gl_cr_id:
                cr_post = GLPosting(
                    fy_code=data.fy_code,
                    posting_date=data.voucher_date,
                    gl_id=line.gl_cr_id,
                    voucher_type="JournalVoucher",
                    voucher_no=data.voucher_no,
                    voucher_ref_id=jv.journal_id,
                    dr_amount=0,
                    cr_amount=line.cr_amount,
                    narration=data.narration
                )
                db.add(cr_post)

        db.commit()
        db.refresh(jv)
        return jv
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create journal voucher: {e}")

@router.get("/", response_model=List[JournalOut])
def list_journal_vouchers(
    fy_code: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(JournalVoucher)
    if fy_code:
        query = query.filter(JournalVoucher.fy_code == fy_code)
    if start_date:
        query = query.filter(JournalVoucher.voucher_date >= start_date)
    if end_date:
        query = query.filter(JournalVoucher.voucher_date <= end_date)
        
    return query.order_by(JournalVoucher.created_at.desc()).all()

@router.get("/{journal_id}", response_model=JournalOut)
def get_journal_voucher(journal_id: int, db: Session = Depends(get_db)):
    jv = db.query(JournalVoucher).filter(JournalVoucher.journal_id == journal_id).first()
    if not jv:
        raise HTTPException(status_code=404, detail="Journal Voucher not found")
    return jv

@router.delete("/{journal_id}")
def delete_journal_voucher(journal_id: int, db: Session = Depends(get_db)):
    jv = db.query(JournalVoucher).filter(JournalVoucher.journal_id == journal_id).first()
    if not jv:
        raise HTTPException(status_code=404, detail="Journal Voucher not found")
        
    try:
        jv.status = "Cancelled"
        
        # Reverse GL Postings
        db.query(GLPosting).filter(
            GLPosting.voucher_type == 'JournalVoucher',
            GLPosting.voucher_ref_id == journal_id
        ).delete()
        
        db.commit()
        return {"message": "Journal Voucher cancelled successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to cancel journal voucher: {e}")
