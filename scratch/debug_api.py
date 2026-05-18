"""
scratch/debug_api.py
Check why API is failing.
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def check(endpoint):
    print(f"Checking {endpoint}...")
    try:
        r = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
        print(f"  Status: {r.status_code}")
        if r.status_code != 200:
            print(f"  Error: {r.text}")
        else:
            print(f"  Data: {json.dumps(r.json())[:100]}...")
    except Exception as e:
        print(f"  CONNECTION ERROR: {e}")

if __name__ == "__main__":
    check("/")
    check("/health")
    check("/clinic/setup")
    check("/owners")
    check("/users")
