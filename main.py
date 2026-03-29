# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware # <-- NEW IMPORT
import models
from database import engine
import routes 
import os
from fastapi.staticfiles import StaticFiles

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Real Estate CRM API", version="0.1.0")

# ==========================================
# CORS CONFIGURATION
# ==========================================
# Allow our React frontend to communicate with this API
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows GET, POST, PATCH, DELETE
    allow_headers=["*"],
)

# Ensure the uploads directory exists on your computer
os.makedirs("uploads", exist_ok=True)
# This tells FastAPI to serve the raw files in this folder to the browser
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(routes.router)

@app.get("/")
def read_root():
    return {"status": "online", "message": "The MREA CRM API is running."}