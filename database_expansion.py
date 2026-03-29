# database_expansion.py
from database import engine
from sqlalchemy import text

def expand_database():
    try:
        with engine.connect() as conn:
            # 1. Expand the Users (Agent) Table
            print("Upgrading Users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN profile_pic_url VARCHAR(500);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN license_number VARCHAR(50);"))
            conn.execute(text("ALTER TABLE users ADD COLUMN birthday DATE;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN website VARCHAR(255);"))

            # 2. Expand the Contacts Table
            print("Upgrading Contacts table...")
            conn.execute(text("ALTER TABLE contacts ADD COLUMN mailing_address TEXT;"))
            conn.execute(text("ALTER TABLE contacts ADD COLUMN alternate_phone VARCHAR(20);"))
            conn.execute(text("ALTER TABLE contacts ADD COLUMN birthday DATE;"))
            conn.execute(text("ALTER TABLE contacts ADD COLUMN anniversary DATE;"))
            conn.execute(text("ALTER TABLE contacts ADD COLUMN hobbies TEXT;"))

            # 3. Expand the Deals Table
            print("Upgrading Deals table...")
            # Link a secondary contact (e.g., a co-buyer or spouse) directly to the deal
            conn.execute(text("ALTER TABLE deals ADD COLUMN co_client_id UUID REFERENCES contacts(contact_id) ON DELETE SET NULL;"))
            conn.execute(text("ALTER TABLE deals ADD COLUMN financing_type VARCHAR(50);"))

            # 4. Create the Deal Partners Association Table
            print("Forging Deal Partners multi-agent table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS deal_partners (
                    deal_id UUID REFERENCES deals(deal_id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
                    partner_role VARCHAR(50) DEFAULT 'Co-Agent',
                    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (deal_id, user_id)
                );
            """))

            conn.commit()
            print("Success! Database expansion completely locked in.")
            
    except Exception as e:
        print(f"Error during expansion: {e}")
        print("Note: If it says a column already exists, that part of the script already ran successfully.")

if __name__ == "__main__":
    expand_database()