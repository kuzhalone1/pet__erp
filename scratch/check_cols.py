import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def check_tables():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "pet_erp"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD")
        )
        cur = conn.cursor()
        
        for table in ['doctors', 'staff']:
            print(f"\nColumns in {table}:")
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
            cols = [r[0] for r in cur.fetchall()]
            for c in cols:
                print(f" - {c}")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_tables()
