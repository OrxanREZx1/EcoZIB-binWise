import sys
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
import crud
from schemas import ReadingCreate

def seed():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    
    print("Clearing old data...")
    db.query(models.Reading).delete()
    db.commit()

    print("Seeding database...")
    seed_data = [
        {
            "bin_id": "BIN-001",
            "distance_cm": 18,
            "fill_percentage": 82,
            "temperature_c": 31,
            "humidity": 62,
            "flame_detected": False
        },
        {
            "bin_id": "BIN-002",
            "distance_cm": 55,
            "fill_percentage": 45,
            "temperature_c": 29,
            "humidity": 58,
            "flame_detected": False
        },
        {
            "bin_id": "BIN-003",
            "distance_cm": 7,
            "fill_percentage": 96,
            "temperature_c": 57,
            "humidity": 44,
            "flame_detected": False
        },
        {
            "bin_id": "BIN-004",
            "distance_cm": 78,
            "fill_percentage": 22,
            "temperature_c": 28,
            "humidity": 65,
            "flame_detected": False
        },
        {
            "bin_id": "BIN-005",
            "distance_cm": 35,
            "fill_percentage": 67,
            "temperature_c": 36,
            "humidity": 51,
            "flame_detected": True
        },
        {
            "bin_id": "BIN-ESP32-001",
            "distance_cm": 24.5,
            "fill_percentage": 76,
            "temperature_c": 28.4,
            "humidity": 62,
            "flame_detected": False
        }
    ]

    for data in seed_data:
        reading = ReadingCreate(**data)
        crud.create_reading(db, reading)
        print(f"Added {reading.bin_id}")

    db.close()
    print("Seeding complete!")

if __name__ == "__main__":
    seed()
