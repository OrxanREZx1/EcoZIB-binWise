# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from database import Base

class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    bin_id = Column(String, index=True, nullable=False)
    location = Column(String, nullable=False)
    distance_cm = Column(Float, nullable=False)
    fill_percentage = Column(Float, nullable=False)
    temperature_c = Column(Float, nullable=False)
    humidity = Column(Float, nullable=True)
    flame_detected = Column(Boolean, default=False)
    status = Column(String, nullable=False)
    fire_risk = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
