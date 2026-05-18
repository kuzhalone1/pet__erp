import os
import sys
from sqlalchemy import text

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from database import engine
    print("Connecting to PostgreSQL...")

    with engine.connect() as conn:
        print("Checking if 'SB' (Sales Bill) doc_type exists...")
        check_query = text("SELECT count(*) FROM doc_sequences WHERE doc_type='SB';")
        count = conn.execute(check_query).scalar()

        if count == 0:
            print("Adding 'SB' document sequence...")
            conn.execute(text("""
                INSERT INTO doc_sequences (doc_type, prefix, current_no, use_fin_year) 
                VALUES ('SB', 'SB', 1, true);
            """))
            conn.commit()
            print("Success!")
        else:
            print("'SB' sequence already exists.")

except Exception as e:
    print(f"Error: {e}")
