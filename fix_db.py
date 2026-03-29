# fix_db.py
from database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE deal_documents ADD COLUMN file_url VARCHAR(500);"))
        conn.commit()
    print("Success! The file_url column has been added.")
except Exception as e:
    print(f"Error: {e}")