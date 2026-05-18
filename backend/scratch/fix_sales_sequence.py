import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import engine
    print("Connecting to PostgreSQL...")

    with engine.connect() as conn:
        # 1. Cleanup bad data
        print("Cleaning up 'ERR_BAD_TYPE' entries...")
        conn.execute(text("DELETE FROM stock_ledger WHERE ref_number = 'ERR_BAD_TYPE';"))
        conn.execute(text("DELETE FROM sales_bills WHERE bill_number = 'ERR_BAD_TYPE';"))
        
        # 2. Ensure SB sequence exists
        print("Checking if 'SB' doc_type exists...")
        check_query = text("SELECT count(*) FROM doc_sequences WHERE doc_type='SB';")
        count = conn.execute(check_query).scalar()

        if count == 0:
            print("Adding 'SB' document sequence...")
            conn.execute(text("""
                INSERT INTO doc_sequences (doc_type, prefix, current_no, use_fin_year) 
                VALUES ('SB', 'SB', 1, true);
            """))
            print("Success! 'SB' sequence added.")
        else:
            print("'SB' sequence already exists.")
            
        conn.commit()
        print("Done. Please restart your server and try saving a bill.")

except Exception as e:
    print(f"Error: {e}")
