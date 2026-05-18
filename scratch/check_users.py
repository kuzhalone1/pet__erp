import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def check_users():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            database=os.getenv("DB_NAME", "pet_erp"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD")
        )
        cur = conn.cursor()
        cur.execute("SELECT username, role, is_active FROM users;")
        rows = cur.fetchall()
        print(f"Found {len(rows)} users:")
        for row in rows:
            print(f"- Username: {row[0]}, Role: {row[1]}, Active: {row[2]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_users()
