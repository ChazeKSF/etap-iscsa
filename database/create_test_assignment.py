import sqlite3
import os
import uuid

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "etap.db")

# --- CHANGE THIS to test different BUs ---
BUSINESS_UNIT_CODE = "FAD"
YEAR = 2026
# -------------------------------------------

def create_assignment():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Find the business unit's ID from its code
    cursor.execute("SELECT id, name FROM business_units WHERE code = ?", (BUSINESS_UNIT_CODE,))
    bu = cursor.fetchone()

    if not bu:
        print(f"No business unit found with code {BUSINESS_UNIT_CODE}")
        return

    bu_id, bu_name = bu
    token = str(uuid.uuid4())  # generates a random, unguessable token

    cursor.execute(
        """
        INSERT INTO csa_assignments (business_unit_id, access_token, year, status)
        VALUES (?, ?, ?, 'pending')
        """,
        (bu_id, token, YEAR)
    )

    conn.commit()
    conn.close()

    print(f"Assignment created for {bu_name} ({BUSINESS_UNIT_CODE})")
    print(f"Access link: http://127.0.0.1:5000/submit/{token}")

if __name__ == "__main__":
    create_assignment()