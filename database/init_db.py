import sqlite3
import os

# Get the folder this script is in, so paths work no matter where you run it from
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "etap.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

def init_db():
    # Connect (this creates etap.db if it doesn't exist yet)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Read and run the schema file
    with open(SCHEMA_PATH, "r") as f:
        schema = f.read()
    cursor.executescript(schema)

    conn.commit()
    conn.close()
    print(f"Database created successfully at: {DB_PATH}")

if __name__ == "__main__":
    init_db()