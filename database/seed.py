import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "etap.db")

business_units = [
    ("CSO", "Chief Strategic Office"),
    ("CSD", "Customer Service Desk"),
    ("ENG", "Engineering"),
    ("FAD", "Accounting and Finance"),
    ("GRC", "Governance, Risk Management, and Compliance"),
    ("HC", "Human Capital"),
    ("ADM", "Office Admin"),
    ("LAW", "Office of the Legal Counsel"),
    ("RND", "Research and Development"),
    ("SEC", "Safety and Security"),
    ("SRE", "Site Reliability, Cloud Infrastructure, Platform & Network Security"),
    ("DEV", "Software Development and Software QA"),
    ("SCM", "Supply Chain Management"),
    ("SSTS", "System Security and Technical Support"),
]

def seed_business_units():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for code, name in business_units:
        cursor.execute(
            "INSERT OR IGNORE INTO business_units (code, name) VALUES (?, ?)",
            (code, name)
        )

    conn.commit()
    conn.close()
    print(f"Seeded {len(business_units)} business units.")

if __name__ == "__main__":
    seed_business_units()