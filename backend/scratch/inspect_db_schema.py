import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import engine
    print("Connecting to PostgreSQL...")

    with engine.connect() as conn:
        print("Inspecting stock_ledger columns...")
        check_query = text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name='stock_ledger';
        """)
        results = conn.execute(check_query).fetchall()

        for row in results:
            print(f"Column: {row[0]}, Type: {row[1]}, Nullable: {row[2]}")

        print("\nInspecting doc_sequences for 'PUR'...")
        check_seq = text("SELECT count(*) FROM doc_sequences WHERE doc_type='PUR';")
        count = conn.execute(check_seq).scalar()
        print(f"'PUR' exists: {count > 0}")

except Exception as e:
    print(f"Error: {e}")
