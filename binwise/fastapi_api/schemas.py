# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ReadingCreate(BaseModel):
    bin_id: str
    location: str | None = None
    distance_cm: float
    fill_percentage: float
    temperature_c: float
    humidity: float | None = None
    flame_detected: bool = False
    status: str | None = None
    fire_risk: str | None = None

class ReadingResponse(BaseModel):
    id: int
    bin_id: str
    location: str
    distance_cm: float
    fill_percentage: float
    temperature_c: float
    humidity: float | None = None
    flame_detected: bool
    status: str
    fire_risk: str
    created_at: datetime

    model_config = {
        "from_attributes": True
    }
