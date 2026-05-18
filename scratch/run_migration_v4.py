"""
scratch/run_migration_v4.py
Run this to apply GST and Address schema upgrades.
"""
import sys
import os

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'backend'))

from database import engine
from sqlalchemy import text

migration_path = os.path.join(project_root, 'database', 'migration_v4.sql')
with open(migration_path, 'r') as f:
    sql = f.read()

print("Running migration_v4.sql...")
with engine.connect() as conn:
    # Split by semicolon but ignore semicolons inside quotes or functions
    # For v4 we don't have functions so simple split is fine
    for stmt in sql.split(';'):
        stmt = stmt.strip()
        if stmt and not stmt.startswith('--'):
            try:
                conn.execute(text(stmt))
                conn.commit()
                print(f"  OK: {stmt[:60]}...")
            except Exception as e:
                print(f"  ERROR: {e}")

print("Migration v4 complete!")
