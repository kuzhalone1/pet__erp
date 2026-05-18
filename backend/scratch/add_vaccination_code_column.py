import os
import sys
from sqlalchemy import text

# Add the current directory to path so we can import from local files
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import engine
    print("Connecting to PostgreSQL...")

    with engine.connect() as conn:
        print("Checking if vaccination_code column exists...")
        # Check column existence in PostgreSQL
        check_query = text("""
            SELECT count(*) 
            FROM information_schema.columns 
            WHERE table_name='vaccination_records' AND column_name='vaccination_code';
        """)
        result = conn.execute(check_query).scalar()

        if result == 0:
            print("Adding vaccination_code column to vaccination_records...")
            conn.execute(text("ALTER TABLE vaccination_records ADD COLUMN vaccination_code VARCHAR(50);"))
            conn.commit()
            print("Success!")
        else:
            print("Column vaccination_code already exists.")

except Exception as e:
    print(f"Error during migration: {e}")
