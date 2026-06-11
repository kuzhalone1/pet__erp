from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import date
from decimal import Decimal

from database import get_db
from models.phase4 import GLMaster, OpeningBalance
from models.accounts import GLPosting
from models.stage3 import SalesBill, SalesBillItem
from models.phase3 import PurchaseBill, PurchaseBillItem
from models.accounts import CreditNote, CreditNoteItem, DebitNote, DebitNoteItem
from sqlalchemy import func

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/general-ledger")
def get_general_ledger(
    gl_id: int = Query(..., description="GL Account ID"),
    fy_code: str = Query(..., description="Financial Year Code"),
    from_date: Optional[date] = Query(None, description="From Date"),
    to_date: Optional[date] = Query(None, description="To Date"),
    db: Session = Depends(get_db)
):
    gl_account = db.query(GLMaster).filter(GLMaster.gl_id == gl_id).first()
    if not gl_account:
        raise HTTPException(status_code=404, detail="GL Account not found")

    # Get Opening Balance for this FY
    ob = db.query(OpeningBalance).filter(
        OpeningBalance.gl_id == gl_id,
        OpeningBalance.fy_code == fy_code
    ).first()
    
    opening_dr = Decimal("0.00")
    opening_cr = Decimal("0.00")
    
    if ob:
        if ob.balance_type == "DR":
            opening_dr = ob.amount or Decimal("0.00")
        else:
            opening_cr = ob.amount or Decimal("0.00")
            
    # Also we need to get any postings before from_date if from_date is provided
    # so we can compute the correct opening balance as of from_date.
    if from_date:
        pre_postings = db.query(GLPosting).filter(
            GLPosting.gl_id == gl_id,
            GLPosting.fy_code == fy_code,
            GLPosting.posting_date < from_date
        ).all()
        for p in pre_postings:
            opening_dr += (p.dr_amount or Decimal("0.00"))
            opening_cr += (p.cr_amount or Decimal("0.00"))
            
    # Calculate net opening balance (DR is positive, CR is negative for running balance context, 
    # but let's just present it clearly or compute a single running_balance number)
    # We will assume running_balance is (Total DR - Total CR). 
    running_balance = opening_dr - opening_cr
    
    # Get Transactions in range
    query = db.query(GLPosting).filter(
        GLPosting.gl_id == gl_id,
        GLPosting.fy_code == fy_code
    )
    if from_date:
        query = query.filter(GLPosting.posting_date >= from_date)
    if to_date:
        query = query.filter(GLPosting.posting_date <= to_date)
        
    postings = query.order_by(GLPosting.posting_date.asc(), GLPosting.posting_id.asc()).all()
    
    transactions = []
    for p in postings:
        running_balance += (p.dr_amount or Decimal("0.00")) - (p.cr_amount or Decimal("0.00"))
        transactions.append({
            "posting_date": p.posting_date,
            "voucher_type": p.voucher_type,
            "voucher_no": p.voucher_no,
            "narration": p.narration,
            "dr_amount": p.dr_amount,
            "cr_amount": p.cr_amount,
            "running_balance": running_balance,
            "balance_type": "DR" if running_balance >= 0 else "CR"
        })
        
    return {
        "account": {
            "gl_code": gl_account.gl_code,
            "gl_name": gl_account.gl_name,
            "group_name": gl_account.group_name
        },
        "opening_balance": {
            "dr": opening_dr,
            "cr": opening_cr,
            "net": opening_dr - opening_cr,
            "balance_type": "DR" if (opening_dr - opening_cr) >= 0 else "CR"
        },
        "transactions": transactions,
        "closing_balance": {
            "net": running_balance,
            "balance_type": "DR" if running_balance >= 0 else "CR"
        }
    }

@router.get("/trial-balance")
def get_trial_balance(
    fy_code: str = Query(..., description="Financial Year Code"),
    as_of_date: Optional[date] = Query(None, description="As of Date (defaults to today)"),
    db: Session = Depends(get_db)
):
    if not as_of_date:
        as_of_date = date.today()
        
    # We can do this efficiently using SQL
    sql = text("""
        WITH opening AS (
            SELECT gl_id, 
                   CASE WHEN balance_type = 'DR' THEN amount ELSE 0 END as op_dr,
                   CASE WHEN balance_type = 'CR' THEN amount ELSE 0 END as op_cr
            FROM opening_balances
            WHERE fy_code = :fy_code
        ),
        postings AS (
            SELECT gl_id,
                   SUM(dr_amount) as trx_dr,
                   SUM(cr_amount) as trx_cr
            FROM gl_postings
            WHERE fy_code = :fy_code AND posting_date <= :as_of_date
            GROUP BY gl_id
        ),
        combined AS (
            SELECT m.gl_id, m.gl_code, m.gl_name, m.group_name,
                   COALESCE(o.op_dr, 0) + COALESCE(p.trx_dr, 0) as total_dr,
                   COALESCE(o.op_cr, 0) + COALESCE(p.trx_cr, 0) as total_cr
            FROM gl_master m
            LEFT JOIN opening o ON m.gl_id = o.gl_id
            LEFT JOIN postings p ON m.gl_id = p.gl_id
        ),
        net_balances AS (
            SELECT gl_id, gl_code, gl_name, group_name,
                   CASE WHEN (total_dr - total_cr) > 0 THEN (total_dr - total_cr) ELSE 0 END as closing_dr,
                   CASE WHEN (total_dr - total_cr) < 0 THEN (total_cr - total_dr) ELSE 0 END as closing_cr
            FROM combined
        )
        SELECT * FROM net_balances
        WHERE closing_dr > 0 OR closing_cr > 0
        ORDER BY group_name, gl_name;
    """)
    
    results = db.execute(sql, {"fy_code": fy_code, "as_of_date": as_of_date}).mappings().all()
    
    # Group by group_name
    grouped = {}
    grand_total_dr = Decimal("0.00")
    grand_total_cr = Decimal("0.00")
    
    for row in results:
        gname = row["group_name"] or "Others"
        if gname not in grouped:
            grouped[gname] = []
            
        grouped[gname].append({
            "gl_id": row["gl_id"],
            "gl_code": row["gl_code"],
            "gl_name": row["gl_name"],
            "dr": row["closing_dr"],
            "cr": row["closing_cr"]
        })
        
        grand_total_dr += row["closing_dr"]
        grand_total_cr += row["closing_cr"]
        
    return {
        "groups": [{"group_name": k, "accounts": v} for k, v in grouped.items()],
        "grand_total_dr": grand_total_dr,
        "grand_total_cr": grand_total_cr,
        "is_balanced": grand_total_dr == grand_total_cr,
        "as_of_date": as_of_date
    }

@router.get("/cash-book")
def get_cash_book(
    fy_code: str = Query(..., description="Financial Year Code"),
    from_date: Optional[date] = Query(None, description="From Date"),
    to_date: Optional[date] = Query(None, description="To Date"),
    db: Session = Depends(get_db)
):
    # Find Cash GLs
    cash_gls = db.query(GLMaster).filter(GLMaster.gl_code.like("CASH%")).all()
    if not cash_gls:
        return {"message": "No cash accounts found", "transactions": []}
        
    cash_gl_ids = [gl.gl_id for gl in cash_gls]
    
    # Calculate initial opening balance for all cash accounts combined up to from_date
    opening_dr = Decimal("0.00")
    opening_cr = Decimal("0.00")
    
    ob_records = db.query(OpeningBalance).filter(
        OpeningBalance.gl_id.in_(cash_gl_ids),
        OpeningBalance.fy_code == fy_code
    ).all()
    
    for ob in ob_records:
        if ob.balance_type == "DR":
            opening_dr += (ob.amount or Decimal("0.00"))
        else:
            opening_cr += (ob.amount or Decimal("0.00"))
            
    if from_date:
        pre_postings = db.query(GLPosting).filter(
            GLPosting.gl_id.in_(cash_gl_ids),
            GLPosting.fy_code == fy_code,
            GLPosting.posting_date < from_date
        ).all()
        for p in pre_postings:
            opening_dr += (p.dr_amount or Decimal("0.00"))
            opening_cr += (p.cr_amount or Decimal("0.00"))
            
    running_balance = opening_dr - opening_cr
    
    # Fetch transactions
    query = db.query(GLPosting).filter(
        GLPosting.gl_id.in_(cash_gl_ids),
        GLPosting.fy_code == fy_code
    )
    if from_date:
        query = query.filter(GLPosting.posting_date >= from_date)
    if to_date:
        query = query.filter(GLPosting.posting_date <= to_date)
        
    postings = query.order_by(GLPosting.posting_date.asc(), GLPosting.posting_id.asc()).all()
    
    transactions = []
    daily_summary = {}
    
    for p in postings:
        running_balance += (p.dr_amount or Decimal("0.00")) - (p.cr_amount or Decimal("0.00"))
        date_str = p.posting_date.isoformat()
        
        if date_str not in daily_summary:
            daily_summary[date_str] = {"dr": Decimal("0.00"), "cr": Decimal("0.00")}
        
        daily_summary[date_str]["dr"] += (p.dr_amount or Decimal("0.00"))
        daily_summary[date_str]["cr"] += (p.cr_amount or Decimal("0.00"))
        
        transactions.append({
            "posting_date": p.posting_date,
            "gl_id": p.gl_id,
            "voucher_type": p.voucher_type,
            "voucher_no": p.voucher_no,
            "narration": p.narration,
            "dr_amount": p.dr_amount,
            "cr_amount": p.cr_amount,
            "running_balance": running_balance,
            "balance_type": "DR" if running_balance >= 0 else "CR"
        })
        
    return {
        "opening_balance": {
            "net": opening_dr - opening_cr,
            "balance_type": "DR" if (opening_dr - opening_cr) >= 0 else "CR"
        },
        "daily_summary": daily_summary,
        "transactions": transactions,
        "closing_balance": {
            "net": running_balance,
            "balance_type": "DR" if running_balance >= 0 else "CR"
        }
    }


# ---------------------------------------------------------------------------
# GST Reports Endpoints
# ---------------------------------------------------------------------------

@router.get("/gst/sales-register")
def get_sales_register(
    fy_code: str = Query(..., description="Financial Year Code"),
    from_date: Optional[date] = Query(None, description="From Date"),
    to_date: Optional[date] = Query(None, description="To Date"),
    db: Session = Depends(get_db),
):
    """Sales Register with credit notes as negative rows."""
    # Base query for sales bills
    sales_q = db.query(SalesBill).filter(SalesBill.fy_code == fy_code)
    if from_date:
        sales_q = sales_q.filter(SalesBill.bill_date >= from_date)
    if to_date:
        sales_q = sales_q.filter(SalesBill.bill_date <= to_date)
    sales = sales_q.all()

    # Credit notes (negative)
    cn_q = db.query(CreditNote).filter(CreditNote.fy_code == fy_code)
    if from_date:
        cn_q = cn_q.filter(CreditNote.voucher_date >= from_date)
    if to_date:
        cn_q = cn_q.filter(CreditNote.voucher_date <= to_date)
    credit_notes = cn_q.all()

    rows = []
    for sb in sales:
        rows.append({
            "date": sb.bill_date,
            "voucher_no": sb.bill_no,
            "party_name": sb.owner.owner_name if hasattr(sb, "owner") else None,
            "gstin": sb.gstin,
            "taxable": float(sb.taxable_amount),
            "cgst": float(sb.cgst_amount),
            "sgst": float(sb.sgst_amount),
            "igst": float(sb.igst_amount),
            "total": float(sb.taxable_amount + sb.cgst_amount + sb.sgst_amount + sb.igst_amount),
            "type": "sales",
        })
    for cn in credit_notes:
        rows.append({
            "date": cn.voucher_date,
            "voucher_no": cn.voucher_no,
            "party_name": cn.party_name,
            "gstin": None,
            "taxable": -float(cn.taxable_amount),
            "cgst": -float(cn.cgst_amount),
            "sgst": -float(cn.sgst_amount),
            "igst": -float(cn.igst_amount),
            "total": -float(cn.taxable_amount + cn.cgst_amount + cn.sgst_amount + cn.igst_amount),
            "type": "credit_note",
        })
    # Sort by date
    rows.sort(key=lambda r: r["date"])
    return {"sales_register": rows}

@router.get("/gst/b2b")
def get_gst_b2b(
    fy_code: str = Query(..., description="Financial Year Code"),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """B2B report – only customers with GSTIN, net of credit notes."""
    # Gather sales bills
    sales_q = db.query(SalesBill).filter(
        SalesBill.fy_code == fy_code,
        SalesBill.gstin != None,
        SalesBill.gstin != ""
    )
    if from_date:
        sales_q = sales_q.filter(SalesBill.bill_date >= from_date)
    if to_date:
        sales_q = sales_q.filter(SalesBill.bill_date <= to_date)
    sales = sales_q.all()
    # Credit notes (negative)
    cn_q = db.query(CreditNote).filter(CreditNote.fy_code == fy_code)
    if from_date:
        cn_q = cn_q.filter(CreditNote.voucher_date >= from_date)
    if to_date:
        cn_q = cn_q.filter(CreditNote.voucher_date <= to_date)
    credit_notes = cn_q.all()

    # Aggregate per GSTIN
    agg = {}
    for sb in sales:
        gstin = sb.gstin
        if gstin not in agg:
            agg[gstin] = {"taxable": 0.0, "cgst": 0.0, "sgst": 0.0, "igst": 0.0}
        agg[gstin]["taxable"] += float(sb.taxable_amount)
        agg[gstin]["cgst"] += float(sb.cgst_amount)
        agg[gstin]["sgst"] += float(sb.sgst_amount)
        agg[gstin]["igst"] += float(sb.igst_amount)
    for cn in credit_notes:
        # Credit notes may not have GSTIN; skip if none
        gstin = None
        if not gstin:
            continue
        if gstin not in agg:
            agg[gstin] = {"taxable": 0.0, "cgst": 0.0, "sgst": 0.0, "igst": 0.0}
        agg[gstin]["taxable"] -= float(cn.taxable_amount)
        agg[gstin]["cgst"] -= float(cn.cgst_amount)
        agg[gstin]["sgst"] -= float(cn.sgst_amount)
        agg[gstin]["igst"] -= float(cn.igst_amount)
    result = []
    for gstin, vals in agg.items():
        result.append({"gstin": gstin, **vals})
    return {"b2b": result}

@router.get("/gst/hsn-summary")
def get_hsn_summary(
    fy_code: str = Query(...),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """HSN summary for sales items."""
    q = (
        db.query(
            SalesBillItem.hsn_code.label("hsn_code"),
            func.sum(SalesBillItem.quantity).label("total_qty"),
            func.sum(SalesBillItem.taxable_amount).label("total_taxable"),
            func.sum(SalesBillItem.cgst_amount).label("total_cgst"),
            func.sum(SalesBillItem.sgst_amount).label("total_sgst"),
            func.sum(SalesBillItem.igst_amount).label("total_igst"),
        )
        .join(SalesBill, SalesBill.bill_id == SalesBillItem.bill_id)
        .filter(SalesBill.fy_code == fy_code)
    )
    if from_date:
        q = q.filter(SalesBill.bill_date >= from_date)
    if to_date:
        q = q.filter(SalesBill.bill_date <= to_date)
    q = q.group_by(SalesBillItem.hsn_code)
    rows = q.all()
    result = []
    for r in rows:
        result.append({
            "hsn_code": r.hsn_code,
            "total_qty": float(r.total_qty),
            "total_taxable": float(r.total_taxable),
            "total_cgst": float(r.total_cgst),
            "total_sgst": float(r.total_sgst),
            "total_igst": float(r.total_igst),
        })
    return {"hsn_summary": result}

@router.get("/gst/gstr3b-summary")
def get_gstr3b_summary(
    fy_code: str = Query(...),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """GSTR‑3B summary calculations."""
    # Outward (sales + credit notes negative)
    sales_q = db.query(
        func.coalesce(func.sum(SalesBill.taxable_amount), 0).label("taxable"),
        func.coalesce(func.sum(SalesBill.cgst_amount), 0).label("cgst"),
        func.coalesce(func.sum(SalesBill.sgst_amount), 0).label("sgst"),
        func.coalesce(func.sum(SalesBill.igst_amount), 0).label("igst"),
    ).filter(SalesBill.fy_code == fy_code)
    if from_date:
        sales_q = sales_q.filter(SalesBill.bill_date >= from_date)
    if to_date:
        sales_q = sales_q.filter(SalesBill.bill_date <= to_date)
    s = sales_q.one()
    cn_q = db.query(
        func.coalesce(func.sum(CreditNote.taxable_amount), 0).label("taxable"),
        func.coalesce(func.sum(CreditNote.cgst_amount), 0).label("cgst"),
        func.coalesce(func.sum(CreditNote.sgst_amount), 0).label("sgst"),
        func.coalesce(func.sum(CreditNote.igst_amount), 0).label("igst"),
    ).filter(CreditNote.fy_code == fy_code)
    if from_date:
        cn_q = cn_q.filter(CreditNote.voucher_date >= from_date)
    if to_date:
        cn_q = cn_q.filter(CreditNote.voucher_date <= to_date)
    cn = cn_q.one()
    outward_taxable = float(s.taxable) - float(cn.taxable)
    outward_cgst = float(s.cgst) - float(cn.cgst)
    outward_sgst = float(s.sgst) - float(cn.sgst)
    outward_igst = float(s.igst) - float(cn.igst)

    # Inward (purchase + debit notes negative)
    pb_q = db.query(
        func.coalesce(func.sum(PurchaseBill.cgst_amount), 0).label("cgst"),
        func.coalesce(func.sum(PurchaseBill.sgst_amount), 0).label("sgst"),
        func.coalesce(func.sum(PurchaseBill.igst_amount), 0).label("igst"),
    ).filter(PurchaseBill.fy_code == fy_code)
    if from_date:
        pb_q = pb_q.filter(PurchaseBill.bill_date >= from_date)
    if to_date:
        pb_q = pb_q.filter(PurchaseBill.bill_date <= to_date)
    pb = pb_q.one()
    dn_q = db.query(
        func.coalesce(func.sum(DebitNote.cgst_amount), 0).label("cgst"),
        func.coalesce(func.sum(DebitNote.sgst_amount), 0).label("sgst"),
        func.coalesce(func.sum(DebitNote.igst_amount), 0).label("igst"),
    ).filter(DebitNote.fy_code == fy_code)
    if from_date:
        dn_q = dn_q.filter(DebitNote.voucher_date >= from_date)
    if to_date:
        dn_q = dn_q.filter(DebitNote.voucher_date <= to_date)
    dn = dn_q.one()
    inward_cgst_credit = float(pb.cgst) - float(dn.cgst)
    inward_sgst_credit = float(pb.sgst) - float(dn.sgst)
    inward_igst_credit = float(pb.igst) - float(dn.igst)

    return {
        "outward_taxable": outward_taxable,
        "outward_cgst": outward_cgst,
        "outward_sgst": outward_sgst,
        "outward_igst": outward_igst,
        "inward_cgst_credit": inward_cgst_credit,
        "inward_sgst_credit": inward_sgst_credit,
        "inward_igst_credit": inward_igst_credit,
        "net_cgst_payable": outward_cgst - inward_cgst_credit,
        "net_sgst_payable": outward_sgst - inward_sgst_credit,
        "net_igst_payable": outward_igst - inward_igst_credit,
    }

@router.get("/gst/purchase-register")
def get_purchase_register(
    fy_code: str = Query(...),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """Purchase Register with debit notes as negative rows."""
    pb_q = db.query(PurchaseBill).filter(PurchaseBill.fy_code == fy_code)
    if from_date:
        pb_q = pb_q.filter(PurchaseBill.bill_date >= from_date)
    if to_date:
        pb_q = pb_q.filter(PurchaseBill.bill_date <= to_date)
    purchase_bills = pb_q.all()
    dn_q = db.query(DebitNote).filter(DebitNote.fy_code == fy_code)
    if from_date:
        dn_q = dn_q.filter(DebitNote.voucher_date >= from_date)
    if to_date:
        dn_q = dn_q.filter(DebitNote.voucher_date <= to_date)
    debit_notes = dn_q.all()
    rows = []
    for pb in purchase_bills:
        rows.append({
            "date": pb.bill_date,
            "voucher_no": pb.bill_no,
            "party_name": pb.supplier_name if hasattr(pb, "supplier_name") else None,
            "gstin": getattr(pb, "gstin", None),
            "taxable": float(pb.taxable_amount),
            "cgst": float(pb.cgst_amount),
            "sgst": float(pb.sgst_amount),
            "igst": float(pb.igst_amount),
            "total": float(pb.taxable_amount + pb.cgst_amount + pb.sgst_amount + pb.igst_amount),
            "type": "purchase",
        })
    for dn in debit_notes:
        rows.append({
            "date": dn.voucher_date,
            "voucher_no": dn.voucher_no,
            "party_name": dn.party_name,
            "gstin": None,
            "taxable": -float(dn.taxable_amount),
            "cgst": -float(dn.cgst_amount),
            "sgst": -float(dn.sgst_amount),
            "igst": -float(dn.igst_amount),
            "total": -float(dn.taxable_amount + dn.cgst_amount + dn.sgst_amount + dn.igst_amount),
            "type": "debit_note",
        })
    rows.sort(key=lambda r: r["date"])
    return {"purchase_register": rows}

@router.get("/bank-book")
def get_bank_book(
    fy_code: str = Query(..., description="Financial Year Code"),
    bank_gl_id: Optional[int] = Query(None, description="Specific Bank GL ID"),
    from_date: Optional[date] = Query(None, description="From Date"),
    to_date: Optional[date] = Query(None, description="To Date"),
    db: Session = Depends(get_db)
):
    query_gls = db.query(GLMaster).filter(GLMaster.sub_group == "Cash & Bank", GLMaster.gl_code.like("BANK%"))
    if bank_gl_id:
        query_gls = query_gls.filter(GLMaster.gl_id == bank_gl_id)
        
    bank_gls = query_gls.all()
    if not bank_gls:
        return {"message": "No bank accounts found", "accounts": []}
        
    accounts_data = []
    
    for gl in bank_gls:
        # Calculate opening balance
        opening_dr = Decimal("0.00")
        opening_cr = Decimal("0.00")
        
        ob = db.query(OpeningBalance).filter(
            OpeningBalance.gl_id == gl.gl_id,
            OpeningBalance.fy_code == fy_code
        ).first()
        
        if ob:
            if ob.balance_type == "DR":
                opening_dr = ob.amount or Decimal("0.00")
            else:
                opening_cr = ob.amount or Decimal("0.00")
                
        if from_date:
            pre_postings = db.query(GLPosting).filter(
                GLPosting.gl_id == gl.gl_id,
                GLPosting.fy_code == fy_code,
                GLPosting.posting_date < from_date
            ).all()
            for p in pre_postings:
                opening_dr += (p.dr_amount or Decimal("0.00"))
                opening_cr += (p.cr_amount or Decimal("0.00"))
                
        running_balance = opening_dr - opening_cr
        
        # Transactions
        query = db.query(GLPosting).filter(
            GLPosting.gl_id == gl.gl_id,
            GLPosting.fy_code == fy_code
        )
        if from_date:
            query = query.filter(GLPosting.posting_date >= from_date)
        if to_date:
            query = query.filter(GLPosting.posting_date <= to_date)
            
        postings = query.order_by(GLPosting.posting_date.asc(), GLPosting.posting_id.asc()).all()
        
        transactions = []
        daily_summary = {}
        
        for p in postings:
            running_balance += (p.dr_amount or Decimal("0.00")) - (p.cr_amount or Decimal("0.00"))
            date_str = p.posting_date.isoformat()
            
            if date_str not in daily_summary:
                daily_summary[date_str] = {"dr": Decimal("0.00"), "cr": Decimal("0.00")}
            
            daily_summary[date_str]["dr"] += (p.dr_amount or Decimal("0.00"))
            daily_summary[date_str]["cr"] += (p.cr_amount or Decimal("0.00"))
            
            transactions.append({
                "posting_date": p.posting_date,
                "voucher_type": p.voucher_type,
                "voucher_no": p.voucher_no,
                "narration": p.narration,
                "dr_amount": p.dr_amount,
                "cr_amount": p.cr_amount,
                "running_balance": running_balance,
                "balance_type": "DR" if running_balance >= 0 else "CR"
            })
            
        accounts_data.append({
            "account": {
                "gl_id": gl.gl_id,
                "gl_code": gl.gl_code,
                "gl_name": gl.gl_name
            },
            "opening_balance": {
                "net": opening_dr - opening_cr,
                "balance_type": "DR" if (opening_dr - opening_cr) >= 0 else "CR"
            },
            "daily_summary": daily_summary,
            "transactions": transactions,
            "closing_balance": {
                "net": running_balance,
                "balance_type": "DR" if running_balance >= 0 else "CR"
            }
        })
        
    return {"accounts": accounts_data}

# ---------------------------------------------------------------------------
# Debtor & Creditor Outstanding Reports
# ---------------------------------------------------------------------------

from sqlalchemy import func
from models.stage3 import SalesBill  # noqa: F811
from models.accounts import ReceiptVoucherDetail, PaymentVoucherDetail  # noqa: F811
from models.people import PetOwner
from models.phase3 import PurchaseBill, Supplier  # noqa: F811

@router.get("/debtor-outstanding")
def get_debtor_outstanding(
    fy_code: str = Query(..., description="Financial Year Code"),
    owner_id: Optional[int] = Query(None, description="Owner ID (optional)"),
    db: Session = Depends(get_db),
):
    """Return outstanding amounts per debtor (pet owner).

    If ``owner_id`` is provided, include detailed bill-level information.
    """
    # Base subquery aggregating per bill
    bill_subq = (
        db.query(
            SalesBill.owner_id.label("owner_id"),
            SalesBill.bill_id.label("bill_id"),
            SalesBill.net_amount.label("net_amount"),
            func.coalesce(func.sum(ReceiptVoucherDetail.amount_received), 0).label("received"),
        )
        .outerjoin(ReceiptVoucherDetail, ReceiptVoucherDetail.bill_id == SalesBill.bill_id)
        .filter(SalesBill.fy_code == fy_code)
        .group_by(SalesBill.owner_id, SalesBill.bill_id, SalesBill.net_amount)
    ).subquery()

    # Aggregate per owner
    owner_agg = (
        db.query(
            bill_subq.c.owner_id,
            func.sum(bill_subq.c.net_amount).label("total_billed"),
            func.sum(bill_subq.c.received).label("total_received"),
            (func.sum(bill_subq.c.net_amount) - func.sum(bill_subq.c.received)).label("outstanding"),
        )
        .group_by(bill_subq.c.owner_id)
        .having((func.sum(bill_subq.c.net_amount) - func.sum(bill_subq.c.received)) > 0)
    ).subquery()

    query = (
        db.query(
            owner_agg.c.owner_id,
            PetOwner.owner_name,
            owner_agg.c.total_billed,
            owner_agg.c.total_received,
            owner_agg.c.outstanding,
        )
        .join(PetOwner, PetOwner.owner_id == owner_agg.c.owner_id)
    )

    if owner_id:
        query = query.filter(owner_agg.c.owner_id == owner_id)

    results = query.all()

    response = []
    for row in results:
        entry: dict = {
            "owner_id": row.owner_id,
            "owner_name": row.owner_name,
            "total_billed": float(row.total_billed),
            "total_received": float(row.total_received),
            "outstanding": float(row.outstanding),
        }
        # Add bill‑level details when a specific owner is requested
        if owner_id:
            bills = (
                db.query(
                    bill_subq.c.bill_id,
                    bill_subq.c.net_amount,
                    bill_subq.c.received,
                    (bill_subq.c.net_amount - bill_subq.c.received).label("outstanding"),
                )
                .filter(bill_subq.c.owner_id == owner_id)
                .all()
            )
            entry["bills"] = [
                {
                    "bill_id": b.bill_id,
                    "net_amount": float(b.net_amount),
                    "received": float(b.received),
                    "outstanding": float(b.outstanding),
                }
                for b in bills
            ]
        response.append(entry)
    return {"debtor_outstanding": response}


@router.get("/creditor-outstanding")
def get_creditor_outstanding(
    fy_code: str = Query(..., description="Financial Year Code"),
    supplier_id: Optional[int] = Query(None, description="Supplier ID (optional)"),
    db: Session = Depends(get_db),
):
    """Return outstanding amounts per creditor (supplier).

    If ``supplier_id`` is provided, include detailed bill‑level information.
    """
    # Base subquery aggregating per purchase bill
    bill_subq = (
        db.query(
            PurchaseBill.supplier_id.label("supplier_id"),
            PurchaseBill.bill_id.label("bill_id"),
            PurchaseBill.net_amount.label("net_amount"),
            func.coalesce(func.sum(PaymentVoucherDetail.amount_paid), 0).label("paid"),
        )
        .outerjoin(PaymentVoucherDetail, PaymentVoucherDetail.bill_id == PurchaseBill.bill_id)
        .filter(PurchaseBill.fy_code == fy_code)
        .group_by(PurchaseBill.supplier_id, PurchaseBill.bill_id, PurchaseBill.net_amount)
    ).subquery()

    # Aggregate per supplier
    supplier_agg = (
        db.query(
            bill_subq.c.supplier_id,
            func.sum(bill_subq.c.net_amount).label("total_billed"),
            func.sum(bill_subq.c.paid).label("total_paid"),
            (func.sum(bill_subq.c.net_amount) - func.sum(bill_subq.c.paid)).label("outstanding"),
        )
        .group_by(bill_subq.c.supplier_id)
        .having((func.sum(bill_subq.c.net_amount) - func.sum(bill_subq.c.paid)) > 0)
    ).subquery()

    query = (
        db.query(
            supplier_agg.c.supplier_id,
            Supplier.supplier_name,
            supplier_agg.c.total_billed,
            supplier_agg.c.total_paid,
            supplier_agg.c.outstanding,
        )
        .join(Supplier, Supplier.supplier_id == supplier_agg.c.supplier_id)
    )

    if supplier_id:
        query = query.filter(supplier_agg.c.supplier_id == supplier_id)

    results = query.all()

    response = []
    for row in results:
        entry: dict = {
            "supplier_id": row.supplier_id,
            "supplier_name": row.supplier_name,
            "total_billed": float(row.total_billed),
            "total_paid": float(row.total_paid),
            "outstanding": float(row.outstanding),
        }
        if supplier_id:
            bills = (
                db.query(
                    bill_subq.c.bill_id,
                    bill_subq.c.net_amount,
                    bill_subq.c.paid,
                    (bill_subq.c.net_amount - bill_subq.c.paid).label("outstanding"),
                )
                .filter(bill_subq.c.supplier_id == supplier_id)
                .all()
            )
            entry["bills"] = [
                {
                    "bill_id": b.bill_id,
                    "net_amount": float(b.net_amount),
                    "paid": float(b.paid),
                    "outstanding": float(b.outstanding),
                }
                for b in bills
            ]
        response.append(entry)
    return {"creditor_outstanding": response}

