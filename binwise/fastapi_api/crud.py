# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from models import Reading
from schemas import ReadingCreate

BIN_LOCATIONS = {
    "BIN-001": "Campus Main Gate",
    "BIN-002": "Library Area",
    "BIN-003": "Parking Zone",
    "BIN-004": "Cafeteria",
    "BIN-005": "Dormitory Entrance",
    "BIN-ESP32-001": "ESP32 Test Bin"
}

def get_bin_location(bin_id: str, provided_location: str | None = None) -> str:
    if provided_location:
        return provided_location
    return BIN_LOCATIONS.get(bin_id, "Unknown Location")

def calculate_status(fill_percentage: float) -> str:
    if fill_percentage >= 91:
        return "Full"
    if fill_percentage >= 71:
        return "Almost Full"
    if fill_percentage >= 31:
        return "Medium"
    return "Low"

def calculate_fire_risk(temperature_c: float, flame_detected: bool = False) -> str:
    if flame_detected:
        return "Critical"
    if temperature_c >= 55:
        return "Warning"
    if temperature_c >= 40:
        return "Warm"
    return "Normal"

def create_reading(db: Session, reading: ReadingCreate):
    location = get_bin_location(
        bin_id=reading.bin_id,
        provided_location=reading.location
    )

    status = reading.status or calculate_status(reading.fill_percentage)
    fire_risk = reading.fire_risk or calculate_fire_risk(reading.temperature_c, reading.flame_detected)

    db_reading = Reading(
        bin_id=reading.bin_id,
        location=location,
        distance_cm=reading.distance_cm,
        fill_percentage=reading.fill_percentage,
        temperature_c=reading.temperature_c,
        humidity=reading.humidity,
        flame_detected=reading.flame_detected,
        status=status,
        fire_risk=fire_risk
    )
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    return db_reading

def get_all_readings(db: Session):
    return db.query(Reading).order_by(Reading.created_at.desc()).all()

def get_latest_readings_by_bin(db: Session):
    readings = db.query(Reading).order_by(Reading.created_at.desc()).all()
    latest_bins = {}
    for r in readings:
        if r.bin_id not in latest_bins:
            latest_bins[r.bin_id] = r
    return list(latest_bins.values())

def get_reading_history(db: Session, bin_id: str):
    return db.query(Reading).filter(Reading.bin_id == bin_id).order_by(Reading.created_at.desc()).limit(50).all()
