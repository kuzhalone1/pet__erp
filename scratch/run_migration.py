import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def run_migration():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "pet_erp"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD")
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        with open(r"c:\Users\marke\OneDrive\Desktop\pet_erp\database\migration_v2.sql", "r") as f:
            sql = f.read()
            
        print("Running migration...")
        cur.execute(sql)
        print("Migration completed successfully!")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run_migration()
