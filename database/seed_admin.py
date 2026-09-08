import sqlite3
import os
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "etap.db")

# --- CHANGE THESE VALUES ---
ADMIN_EMAIL = "yourname@etap.com.ph"
ADMIN_NAME = "Your Name"
ADMIN_PASSWORD = "ChangeThisPassword123!"
# ----------------------------

def seed_admin():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    password_hash = generate_password_hash(ADMIN_PASSWORD)

    cursor.execute(
        """
        INSERT OR IGNORE INTO users (email, name, password_hash, auth_provider, role, is_active)
        VALUES (?, ?, ?, 'manual', 'admin', 1)
        """,
        (ADMIN_EMAIL, ADMIN_NAME, password_hash)
    )

    conn.commit()
    conn.close()
    print(f"Admin account created for: {ADMIN_EMAIL}")

if __name__ == "__main__":
    seed_admin()