from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime

class AdvancePaymentBase(BaseModel):
    fy_code: str
    voucher_date: date
    gl_party_id: int
    party_name: str
    party_type: str = 'Supplier'
    gl_cashbank_id: int
    cashbank_name: Optional[str] = None
    amount: Decimal
    doc_no: Optional[str] = None
    doc_date: Optional[date] = None
    narration: Optional[str] = None

class AdvancePaymentCreate(AdvancePaymentBase):
    voucher_no: Optional[str] = None

class AdvancePaymentUpdate(BaseModel):
    voucher_date: Optional[date] = None
    doc_no: Optional[str] = None
    doc_date: Optional[date] = None
    narration: Optional[str] = None
    status: Optional[str] = None

class AdvancePaymentOut(AdvancePaymentBase):
    adv_id: int
    voucher_no: str
    adjusted_amount: Decimal
    balance: Decimal
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class BankArrivalBase(BaseModel):
    fy_code: str
    voucher_date: date
    gl_party_id: int
    party_name: str
    gl_bank_id: int
    bank_name: Optional[str] = None
    amount: Decimal
    ref_doc_no: Optional[str] = None
    ref_doc_date: Optional[date] = None
    narration: Optional[str] = None

class BankArrivalCreate(BankArrivalBase):
    voucher_no: Optional[str] = None

class BankArrivalUpdate(BaseModel):
    voucher_date: Optional[date] = None
    ref_doc_no: Optional[str] = None
    ref_doc_date: Optional[date] = None
    narration: Optional[str] = None
    status: Optional[str] = None

class BankArrivalOut(BankArrivalBase):
    arrival_id: int
    voucher_no: str
    entered_amount: Decimal
    balance: Decimal
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReceiptVoucherDetailIn(BaseModel):
    vou_type: str
    bill_id: Optional[int] = None
    bill_no: Optional[str] = None
    bill_date: Optional[date] = None
    bill_amount: Optional[Decimal] = None
    prev_received: Optional[Decimal] = None
    balance_amount: Optional[Decimal] = None
    amount_received: Decimal
    arrival_id: Optional[int] = None

class ReceiptVoucherDetailOut(ReceiptVoucherDetailIn):
    detail_id: int
    receipt_id: int
    line_no: int
    
    class Config:
        from_attributes = True

class ReceiptVoucherBase(BaseModel):
    fy_code: str
    receipt_date: date
    owner_id: int
    gl_party_id: int
    gl_cashbank_id: int
    total_amount: Decimal
    payment_type: str = 'Cash'
    ref_no: Optional[str] = None
    ref_date: Optional[date] = None
    narration: Optional[str] = None

class ReceiptVoucherCreate(ReceiptVoucherBase):
    receipt_no: Optional[str] = None
    details: List[ReceiptVoucherDetailIn]

class ReceiptVoucherOut(ReceiptVoucherBase):
    receipt_id: int
    receipt_no: str
    status: str
    created_at: datetime
    details: List[ReceiptVoucherDetailOut] = []

    class Config:
        from_attributes = True

class PaymentVoucherDetailIn(BaseModel):
    vou_type: str
    bill_id: Optional[int] = None
    bill_no: Optional[str] = None
    bill_date: Optional[date] = None
    bill_amount: Optional[Decimal] = None
    prev_paid: Optional[Decimal] = None
    balance_amount: Optional[Decimal] = None
    amount_paid: Decimal
    adv_id: Optional[int] = None

class PaymentVoucherDetailOut(PaymentVoucherDetailIn):
    detail_id: int
    payment_id: int
    line_no: int
    
    class Config:
        from_attributes = True

class PaymentVoucherBase(BaseModel):
    fy_code: str
    voucher_date: date
    gl_party_id: int
    party_name: str
    gl_cashbank_id: int
    cashbank_name: Optional[str] = None
    total_amount: Decimal
    payment_type: str = 'Cash'
    ref_no: Optional[str] = None
    ref_date: Optional[date] = None
    narration: Optional[str] = None

class PaymentVoucherCreate(PaymentVoucherBase):
    voucher_no: Optional[str] = None
    details: List[PaymentVoucherDetailIn]

class PaymentVoucherOut(PaymentVoucherBase):
    payment_id: int
    voucher_no: str
    status: str
    created_at: datetime
    details: List[PaymentVoucherDetailOut] = []

    class Config:
        from_attributes = True

class JournalLineIn(BaseModel):
    gl_cr_id: Optional[int] = None
    cr_account_name: Optional[str] = None
    gl_dr_id: Optional[int] = None
    dr_account_name: Optional[str] = None
    cr_amount: Decimal = Decimal("0.00")
    dr_amount: Decimal = Decimal("0.00")

class JournalLineOut(JournalLineIn):
    line_id: int
    journal_id: int
    line_no: int
    
    class Config:
        from_attributes = True

class JournalCreate(BaseModel):
    fy_code: str
    voucher_date: date
    voucher_no: Optional[str] = None
    bill_ref_no: Optional[str] = None
    narration: str
    lines: List[JournalLineIn]

class JournalOut(BaseModel):
    journal_id: int
    fy_code: str
    voucher_no: str
    voucher_date: date
    bill_ref_no: Optional[str] = None
    narration: str
    total_cr: Decimal
    total_dr: Decimal
    status: str
    created_at: datetime
    lines: List[JournalLineOut] = []

    class Config:
        from_attributes = True

class CreditNoteItemIn(BaseModel):
    medicine_id: Optional[int] = None
    procedure_id: Optional[int] = None
    item_code: Optional[str] = None
    item_name: str
    hsn_code: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    discount_pct: Optional[Decimal] = None
    discount_amt: Optional[Decimal] = None
    taxable_amount: Optional[Decimal] = None
    gst_pct: Optional[Decimal] = None
    cgst_amount: Optional[Decimal] = None
    sgst_amount: Optional[Decimal] = None
    igst_amount: Optional[Decimal] = None
    line_total: Optional[Decimal] = None

class CreditNoteItemOut(CreditNoteItemIn):
    item_id: int
    cn_id: int
    line_no: int
    class Config:
        from_attributes = True

class CreditNoteBase(BaseModel):
    fy_code: str
    voucher_date: date
    ref_bill_id: Optional[int] = None
    ref_bill_no: Optional[str] = None
    ref_bill_date: Optional[date] = None
    gl_party_id: int
    party_name: str
    gl_credit_id: Optional[int] = None
    credit_desc: Optional[str] = None
    address1: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state_code: Optional[str] = None
    gstin: Optional[str] = None
    is_interstate: bool = False
    total_qty: Optional[Decimal] = None
    gross_amount: Optional[Decimal] = None
    discount_pct: Optional[Decimal] = None
    discount_amt: Optional[Decimal] = None
    taxable_amount: Optional[Decimal] = None
    cgst_rate: Optional[Decimal] = None
    cgst_amount: Optional[Decimal] = None
    sgst_rate: Optional[Decimal] = None
    sgst_amount: Optional[Decimal] = None
    igst_rate: Optional[Decimal] = None
    igst_amount: Optional[Decimal] = None
    round_off: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    narration: Optional[str] = None

class CreditNoteCreate(CreditNoteBase):
    voucher_no: Optional[str] = None
    items: List[CreditNoteItemIn]

class CreditNoteOut(CreditNoteBase):
    cn_id: int
    voucher_no: str
    status: str
    created_at: datetime
    items: List[CreditNoteItemOut] = []
    class Config:
        from_attributes = True

class DebitNoteItemIn(BaseModel):
    medicine_id: Optional[int] = None
    item_code: Optional[str] = None
    item_name: str
    hsn_code: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = None
    rate: Optional[Decimal] = None
    discount_pct: Optional[Decimal] = None
    discount_amt: Optional[Decimal] = None
    taxable_amount: Optional[Decimal] = None
    gst_pct: Optional[Decimal] = None
    cgst_amount: Optional[Decimal] = None
    sgst_amount: Optional[Decimal] = None
    igst_amount: Optional[Decimal] = None
    line_total: Optional[Decimal] = None

class DebitNoteItemOut(DebitNoteItemIn):
    item_id: int
    dn_id: int
    line_no: int
    class Config:
        from_attributes = True

class DebitNoteBase(BaseModel):
    fy_code: str
    voucher_date: date
    ref_bill_id: Optional[int] = None
    ref_bill_no: Optional[str] = None
    ref_bill_date: Optional[date] = None
    gl_party_id: int
    party_name: str
    gl_debit_id: Optional[int] = None
    debit_desc: Optional[str] = None
    supplier_id: Optional[int] = None
    address1: Optional[str] = None
    address2: Optional[str] = None
    city: Optional[str] = None
    state_code: Optional[str] = None
    gstin: Optional[str] = None
    is_interstate: bool = False
    total_qty: Optional[Decimal] = None
    gross_amount: Optional[Decimal] = None
    discount_pct: Optional[Decimal] = None
    discount_amt: Optional[Decimal] = None
    taxable_amount: Optional[Decimal] = None
    cgst_rate: Optional[Decimal] = None
    cgst_amount: Optional[Decimal] = None
    sgst_rate: Optional[Decimal] = None
    sgst_amount: Optional[Decimal] = None
    igst_rate: Optional[Decimal] = None
    igst_amount: Optional[Decimal] = None
    round_off: Optional[Decimal] = None
    net_amount: Optional[Decimal] = None
    narration: Optional[str] = None

class DebitNoteCreate(DebitNoteBase):
    voucher_no: Optional[str] = None
    items: List[DebitNoteItemIn]

class DebitNoteOut(DebitNoteBase):
    dn_id: int
    voucher_no: str
    status: str
    created_at: datetime
    items: List[DebitNoteItemOut] = []
    class Config:
        from_attributes = True
