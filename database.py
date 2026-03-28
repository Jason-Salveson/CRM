# database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load the environment variables from the .env file
load_dotenv()

# Fetch the database URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine (the core interface to the database)
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a session factory (how FastAPI will talk to the DB for each request)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create the base class that our data models will inherit from
Base = declarative_base()

# Dependency to get a database session for our API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()