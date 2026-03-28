# fix_db.py
from database import engine
from sqlalchemy import text

try:
    with engine.connect() as conn:
        # Force PostgreSQL to add our new column
        conn.execute(text("ALTER TABLE deal_documents ADD COLUMN reviewer_notes TEXT;"))
        conn.commit()
    print("Success! The reviewer_notes column has been added to the database.")
except Exception as e:
    print(f"Error: {e}")