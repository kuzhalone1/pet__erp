"""
scratch/inspect_db.py
Inspect table columns.
"""
import sys
import os

# Add backend to path so we can import database
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend'))

from database import engine
from sqlalchemy import text

def inspect(table_name):
    print(f"\nColumns in {table_name}:")
    with engine.connect() as conn:
        res = conn.execute(text(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table_name}'"))
        for row in res:
            print(f"  - {row[0]}: {row[1]}")

if __name__ == "__main__":
    tables = [
        "clinic_setup",
        "pet_owners",
        "suppliers",
        "doctors",
        "staff",
        "agents",
        "gl_master"
    ]
    for table in tables:
        inspect(table)
