from database import SessionLocal
from utils.doc_sequence import list_sequences
import json

db = SessionLocal()
try:
    seqs = list_sequences(db)
    print(json.dumps(seqs, indent=2))
finally:
    db.close()
