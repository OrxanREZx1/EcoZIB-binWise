# BinWise

BinWise is a smart litter bin monitoring system designed to optimize waste collection. It uses ESP32 with ultrasonic (HC-SR04) and temperature (DS18B20) sensors to send real-time data to a local server.

## Project Architecture

- **Hardware:** ESP32 microcontrollers with sensors.
- **Backend API:** FastAPI app to receive sensor readings.
- **Web Interface:** Django application serving a landing page and dashboard.
- **Database:** SQLite (for local MVP).

## Folder Structure

```text
binwise/
├── django_app/       # Django project (Landing page & Dashboard)
└── fastapi_api/      # FastAPI server (Sensor data API)
```

## How to Run Locally

You will need to run both servers concurrently for the full experience.

### 1. Run Django (Web UI)
```bash
cd django_app
python manage.py runserver
```
*Access the site at: http://127.0.0.1:8000*

### 2. Run FastAPI (API Server)
```bash
cd fastapi_api
uvicorn main:app --host 0.0.0.0 --port 8001
```
*Note: `--host 0.0.0.0` is used so that the ESP32 can access the API from the same Wi-Fi network.*
*Access the API documentation at: http://127.0.0.1:8001/docs*

## Next Development Phases
- Database setup with SQLite and SQLAlchemy.
- ESP32 hardware programming and data transmission.
- Interactive Dashboard using real-time data.
