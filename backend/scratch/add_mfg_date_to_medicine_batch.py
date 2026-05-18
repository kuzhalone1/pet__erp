import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import engine
    print("Connecting to PostgreSQL...")

    with engine.connect() as conn:
        print("Checking if mfg_date column exists in medicine_batches...")
        check_query = text("""
            SELECT count(*) 
            FROM information_schema.columns 
            WHERE table_name='medicine_batches' AND column_name='mfg_date';
        """)
        result = conn.execute(check_query).scalar()

        if result == 0:
            print("Adding mfg_date column to medicine_batches...")
            conn.execute(text("ALTER TABLE medicine_batches ADD COLUMN mfg_date DATE;"))
            conn.commit()
            print("Success!")
        else:
            print("Column mfg_date already exists.")

except Exception as e:
    print(f"Error during migration: {e}")
