from sqlalchemy.orm import Session
from models.phase4 import GLMaster
from utils.doc_sequence import get_next_doc_no

GL_GROUP_MAP = {
    "owner":    ("Debtors",   "Current Assets",       "DR"),
    "supplier": ("Creditors", "Current Liabilities",  "CR"),
    "doctor":   ("Expense",   "Indirect Expense",     "CR"),
    "staff":    ("Expense",   "Indirect Expense",     "CR"),
    "agent":    ("Expense",   "Indirect Expense",     "CR"),
}

def create_gl_account(entity_type: str, name: str, db: Session, **kwargs) -> int:
    """
    Auto-creates a GL account for any new master entity.
    Returns gl_id of the created account.
    """
    group, sub_group, default_bt = GL_GROUP_MAP[entity_type]
    
    # Generate a code like OWN_GL25260001
    prefix = entity_type.upper()[:3] + "GL" # OWNGL, SUPGL, etc
    # We might need to seed these prefixes in doc_sequences first
    # For now let's assume we use a generic Master GL sequence or specific ones
    try:
        gl_code = get_next_doc_no(db, prefix)
    except:
        # Fallback if prefix not seeded
        import random
        gl_code = f"{prefix}{random.randint(1000, 9999)}"
    
    gl = GLMaster(
        gl_code         = gl_code,
        gl_name         = name,
        group_name      = group,
        sub_group       = sub_group,
        balance_type    = kwargs.get("balance_type", default_bt),
        opening_balance = kwargs.get("opening_balance", 0),
        phone           = kwargs.get("phone"),
        alt_phone       = kwargs.get("alt_phone"),
        email           = kwargs.get("email"),
        address1        = kwargs.get("address1"),
        address2        = kwargs.get("address2"),
        address3        = kwargs.get("address3"),
        city_id         = kwargs.get("city_id"),
        district        = kwargs.get("district"),
        state_name      = kwargs.get("state_name"),
        state_code      = kwargs.get("state_code"),
        pincode         = kwargs.get("pincode"),
        gstin           = kwargs.get("gstin"),
        pan             = kwargs.get("pan"),
        discount_pct    = kwargs.get("discount_pct", 0),
        is_system       = False,
        is_active       = True
    )
    db.add(gl)
    db.flush()   # get gl_id without committing
    return gl.gl_id
