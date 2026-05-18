"""
create_admin.py — Creates/fixes the default admin user with a proper bcrypt hash.
Run ONCE after database setup, OR run again to reset the admin password.

Usage: python create_admin.py
"""
import os
import sys

# ── Load .env from the parent folder (pet_erp/.env) ───────────────────────
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')

# Manual .env parser (no dotenv dependency needed for this script)
env_vars = {}
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, val = line.partition('=')
                env_vars[key.strip()] = val.strip()
else:
    print(f"[ERROR] .env file not found at: {env_path}")
    sys.exit(1)

DB_HOST     = env_vars.get("DB_HOST", "localhost")
DB_PORT     = env_vars.get("DB_PORT", "5432")
DB_NAME     = env_vars.get("DB_NAME", "pet_erp")
DB_USER     = env_vars.get("DB_USER", "postgres")
DB_PASSWORD = env_vars.get("DB_PASSWORD", "")

if not DB_PASSWORD:
    print("[ERROR] DB_PASSWORD not found in .env")
    sys.exit(1)

# ── Import psycopg2 ────────────────────────────────────────────────────────
try:
    import psycopg2
except ImportError:
    print("[ERROR] psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

# ── Import bcrypt ──────────────────────────────────────────────────────────
try:
    import bcrypt
except ImportError:
    print("[ERROR] bcrypt not installed. Run: pip install bcrypt")
    sys.exit(1)

# ── Admin credentials ──────────────────────────────────────────────────────
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"
ADMIN_NAME     = "System Administrator"
ADMIN_ROLE     = "admin"
ADMIN_EMAIL    = "admin@petclinic.com"

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

def main():
    print(f"  Connecting to database '{DB_NAME}' on {DB_HOST}:{DB_PORT}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST, port=int(DB_PORT),
            dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
        )
        cur = conn.cursor()

        # Check if admin already exists
        cur.execute("SELECT user_id FROM users WHERE username = %s", (ADMIN_USERNAME,))
        existing = cur.fetchone()

        # Use the provided bcrypt hash for admin123
        hashed = '$2b$12$.OTMdc4ivJApNDSoFAOgnevbFmic/bRFAFJi80iY5jI70n0FpcUw.'

        if existing:
            # Update the hash (fixes bad hash from seed.sql)
            cur.execute(
                "UPDATE users SET password_hash = %s WHERE username = %s",
                (hashed, ADMIN_USERNAME)
            )
            print(f"  [OK] Admin password hash corrected.")
        else:
            cur.execute(
                """INSERT INTO users (username, password_hash, full_name, role, email, is_active)
                   VALUES (%s, %s, %s, %s, %s, TRUE)""",
                (ADMIN_USERNAME, hashed, ADMIN_NAME, ADMIN_ROLE, ADMIN_EMAIL)
            )
            print(f"  [OK] Admin user created.")

        conn.commit()
        cur.close()
        conn.close()
        print(f"  Login credentials: admin / admin123")

    except psycopg2.OperationalError as e:
        print(f"  [ERROR] Cannot connect to database: {e}")
        print(f"  Make sure PostgreSQL is running and .env has the correct DB_PASSWORD.")
        sys.exit(1)
    except Exception as e:
        print(f"  [ERROR] {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
