"""
reset_admin.py — Resets the admin password to whatever you type.
Run: python reset_admin.py
"""
import os
import sys
import getpass

# ── Read .env ─────────────────────────────────────────────────────────────
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
env_vars = {}
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                env_vars[key.strip()] = val.strip()

DB_HOST     = env_vars.get("DB_HOST", "localhost")
DB_PORT     = env_vars.get("DB_PORT", "5432")
DB_NAME     = env_vars.get("DB_NAME", "pet_erp")
DB_USER     = env_vars.get("DB_USER", "postgres")
DB_PASSWORD = env_vars.get("DB_PASSWORD", "")

# ── Get new password from user ────────────────────────────────────────────
print("=" * 50)
print("  Pet Clinic ERP — Reset Admin Password")
print("=" * 50)
new_password = getpass.getpass("  Enter new admin password: ")
confirm      = getpass.getpass("  Confirm password: ")

if new_password != confirm:
    print("\n  [ERROR] Passwords do not match. Try again.")
    sys.exit(1)

if len(new_password) < 4:
    print("\n  [ERROR] Password must be at least 4 characters.")
    sys.exit(1)

# ── Hash with bcrypt ─────────────────────────────────────────────────────
try:
    import bcrypt
except ImportError:
    print("  [ERROR] bcrypt not installed. Run: pip install bcrypt")
    sys.exit(1)

hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

# ── Update database ──────────────────────────────────────────────────────
try:
    import psycopg2
except ImportError:
    print("  [ERROR] psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

try:
    conn = psycopg2.connect(
        host=DB_HOST, port=int(DB_PORT),
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
    )
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET password_hash = %s WHERE username = 'admin'",
        (hashed,)
    )
    rows = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()

    if rows == 0:
        print("\n  [ERROR] Admin user not found in database!")
        print("  Run setup_database.bat first.")
        sys.exit(1)

    print("\n  [OK] Admin password updated successfully!")
    print("  Login at http://localhost:5173")
    print("  Username: admin")
    print("  Password: <what you just typed>")

except psycopg2.OperationalError as e:
    print(f"\n  [ERROR] Cannot connect to database: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n  [ERROR] {e}")
    sys.exit(1)
