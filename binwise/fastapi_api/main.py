from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from database import engine, Base, get_db
import models
import schemas
import crud

Base.metadata.create_all(bind=engine)

app = FastAPI(title="BinWise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:8000",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "BinWise FastAPI server is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/readings", response_model=schemas.ReadingResponse)
def create_reading(reading: schemas.ReadingCreate, db: Session = Depends(get_db)):
    return crud.create_reading(db=db, reading=reading)

@app.get("/api/bins/latest", response_model=List[schemas.ReadingResponse])
def get_latest_bins(db: Session = Depends(get_db)):
    return crud.get_latest_readings_by_bin(db=db)

@app.get("/api/bins/{bin_id}/history", response_model=List[schemas.ReadingResponse])
def get_reading_history(bin_id: str, db: Session = Depends(get_db)):
    return crud.get_reading_history(db=db, bin_id=bin_id)
