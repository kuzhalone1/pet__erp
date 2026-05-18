
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def fix_db():
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )
    cur = conn.cursor()
    
    print("Checking 'vaccines' table columns...")
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'vaccines'")
    existing_columns = [row[0] for row in cur.fetchall()]
    print(f"Existing columns: {existing_columns}")
    
    # Required columns based on model
    required = {
        'company': 'VARCHAR(100)',
        'disease': 'VARCHAR(200)',
        'dosage': 'VARCHAR(100)',
        'route': 'VARCHAR(50)',
        'dose_number': 'SMALLINT DEFAULT 1',
        'medicine_id': 'INTEGER'
    }
    
    for col, definition in required.items():
        if col not in existing_columns:
            print(f"Adding column '{col}' to 'vaccines' table...")
            cur.execute(f"ALTER TABLE vaccines ADD COLUMN {col} {definition}")
        else:
            print(f"Column '{col}' already exists.")
            
    conn.commit()
    cur.close()
    conn.close()
    print("Database fix completed.")

if __name__ == "__main__":
    fix_db()
