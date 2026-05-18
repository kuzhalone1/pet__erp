import sys
import os

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'backend'))

from database import engine, master_engine, get_engine_for_db
from sqlalchemy import text
from utils.doc_sequence import init_sequences_for_db

def main():
    print("🔄 Initializing document sequences for primary DB...")
    init_sequences_for_db(engine)
    print("✅ Primary DB sequences initialized successfully.")
    
    try:
        with master_engine.connect() as m_conn:
            res = m_conn.execute(text("SELECT db_name FROM company_profiles WHERE status = 'Active'"))
            for row in res.fetchall():
                c_db_name = row[0]
                try:
                    print(f"🔄 Initializing sequences for company DB '{c_db_name}'...")
                    c_engine = get_engine_for_db(c_db_name)
                    init_sequences_for_db(c_engine)
                    print(f"✅ Company DB '{c_db_name}' sequences initialized successfully.")
                except Exception as sub_e:
                    print(f"⚠️ Could not init sequences for '{c_db_name}': {sub_e}")
    except Exception as e:
        print(f"⚠️ Company DB sequence initialization check: {e}")

    print("🎉 All sequences and PL/pgSQL functions are ready and up to date.")

if __name__ == "__main__":
    main()
