from database import SessionLocal
from sqlalchemy import text
import sys

SEQUENCES = [
    ("OWNGL", "OWNGL", 1, True),
    ("SUPGL", "SUPGL", 1, True),
    ("DOCGL", "DOCGL", 1, True),
    ("STAGL", "STAGL", 1, True),
    ("AGEGL", "AGEGL", 1, True),
    ("APT",   "APT",   1, True),
    ("BIL",   "BIL",   1, True),
    ("RX",    "RX",    1, True),
    ("VRC",   "VRC",   1, True),
    ("VC",    "VC",    1, True),
    ("VAC",   "VAC",   1, True),
]

def seed_sequences():
    db = SessionLocal()
    try:
        for dtype, prefix, start, use_fy in SEQUENCES:
            # Check if exists
            res = db.execute(text("SELECT 1 FROM doc_sequences WHERE doc_type = :dt"), {"dt": dtype}).fetchone()
            if not res:
                print(f"Seeding {dtype}...")
                db.execute(
                    text("""INSERT INTO doc_sequences (doc_type, prefix, current_no, use_fin_year) 
                           VALUES (:dt, :pre, :no, :fy)"""),
                    {"dt": dtype, "pre": prefix, "no": start, "fy": use_fy}
                )
            else:
                print(f"Sequence {dtype} already exists.")
        db.commit()
        print("Success!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_sequences()
