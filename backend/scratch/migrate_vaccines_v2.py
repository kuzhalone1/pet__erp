
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('./backend/.env')

def migrate():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "pet_erp"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD")
    )
    cur = conn.cursor()
    
    # 1. Add vacc_record_no to vaccination_records
    print("Adding 'vacc_record_no' to 'vaccination_records'...")
    cur.execute("ALTER TABLE vaccination_records ADD COLUMN IF NOT EXISTS vacc_record_no VARCHAR(30) UNIQUE")
    # If there are existing records, they will have NULL, which violates NOT NULL if we add it now.
    # But for now, we'll just allow NULL if there are records, or handle it.
    # To be safe, let's keep it nullable for a moment, then update, then NOT NULL.
    
    # 2. Seed doc_sequences
    print("Seeding 'doc_sequences'...")
    sequences = [
        ('VAC', 'VAC', 1),
        ('VRC', 'VRC', 1)
    ]
    for doc_type, prefix, start_no in sequences:
        cur.execute("""
            INSERT INTO doc_sequences (doc_type, prefix, current_no, use_fin_year, last_no_issued)
            VALUES (%s, %s, %s, false, 0)
            ON CONFLICT (doc_type) DO NOTHING
        """, (doc_type, prefix, start_no))
        
    conn.commit()
    cur.close()
    conn.close()
    print("✅ Migration and Seeding completed.")

if __name__ == "__main__":
    migrate()
