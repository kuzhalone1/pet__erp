"""
encryption.py — Fernet cipher utilities for encrypting database credentials at rest
"""
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

FERNET_KEY = os.environ.get("DB_ENCRYPTION_KEY")
if not FERNET_KEY:
    raise RuntimeError("FATAL: DB_ENCRYPTION_KEY environment variable not set in .env")

cipher_suite = Fernet(FERNET_KEY.encode())

def encrypt_db_uri(db_uri: str) -> str:
    """Encrypts a plaintext database connection string."""
    return cipher_suite.encrypt(db_uri.encode()).decode()

def decrypt_db_uri(encrypted_uri: str) -> str:
    """Decrypts an encrypted database connection string."""
    return cipher_suite.decrypt(encrypted_uri.encode()).decode()
