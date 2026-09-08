import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "etap.db")

controls = [
    (
        "A.5.1",
        "Organizational Controls",
        "Policies for information security",
        "Information security policy and topic-specific policies shall be defined, approved by management, published, communicated to and acknowledged by relevant personnel and relevant interested parties, and reviewed at planned intervals and if significant changes occur."
    ),
    (
        "A.5.15",
        "Organizational Controls",
        "Access control",
        "Rules to control physical and logical access to information and other associated assets shall be established and implemented based on business and information security requirements."
    ),
    (
        "A.5.30",
        "Organizational Controls",
        "ICT readiness for business continuity",
        "ICT readiness shall be planned, implemented, maintained and tested based on business continuity objectives and ICT continuity requirements."
    ),
    (
        "A.6.3",
        "People Controls",
        "Information security awareness, education and training",
        "Personnel of the organization and relevant interested parties shall receive appropriate information security awareness, education and training and regular updates of the organization's information security policy, topic-specific policies and procedures, as relevant for their job function."
    ),
    (
        "A.8.12",
        "Technological Controls",
        "Data leakage prevention",
        "Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information."
    ),
    (
        "A.8.8",
        "Technological Controls",
        "Management of technical vulnerabilities",
        "Information about technical vulnerabilities of information systems in use shall be obtained, the organization's exposure to such vulnerabilities evaluated, and appropriate measures taken."
    ),
]

def seed_controls():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    for control_code, category, title, description in controls:
        question_text = f"{title}: {description}"
        cursor.execute(
            """
            INSERT OR IGNORE INTO controls (control_code, category, question_text)
            VALUES (?, ?, ?)
            """,
            (control_code, category, question_text)
        )

    conn.commit()
    conn.close()
    print(f"Seeded {len(controls)} controls.")

if __name__ == "__main__":
    seed_controls()