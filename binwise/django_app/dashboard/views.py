import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import SensorReading

def landing_page(request):
    return render(request, 'landing.html')

def dashboard_page(request):
    return render(request, 'dashboard.html')

def health_check(request):
    return JsonResponse({
        "status": "ok",
        "service": "BinWise backend"
    })

@csrf_exempt
@require_http_methods(["POST"])
def api_readings(request):
    try:
        data = json.loads(request.body)
        
        required_fields = ["bin_id", "distance_cm", "fill_percentage", "temperature_c", "humidity"]
        for field in required_fields:
            if field not in data:
                return JsonResponse({"status": "error", "message": f"Missing required field: {field}"}, status=400)
                
        SensorReading.objects.create(
            bin_id=data["bin_id"],
            distance_cm=float(data["distance_cm"]),
            fill_percentage=int(data["fill_percentage"]),
            temperature_c=float(data["temperature_c"]),
            humidity=float(data["humidity"]),
            flame_detected=bool(data.get("flame_detected", False))
        )
        
        return JsonResponse({
            "status": "success",
            "message": "Reading saved successfully",
            "bin_id": data["bin_id"]
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "message": "Invalid JSON"}, status=400)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)

def api_readings_latest(request):
    """Returns the latest reading for each unique bin_id."""
    # Since sqlite doesn't support DISTINCT ON, we'll manually aggregate the latest
    latest_readings = {}
    
    for reading in SensorReading.objects.all().order_by('created_at'):
        latest_readings[reading.bin_id] = reading
        
    response_data = []
    for reading in latest_readings.values():
        response_data.append({
            "bin_id": reading.bin_id,
            "distance_cm": reading.distance_cm,
            "fill_percentage": reading.fill_percentage,
            "temperature_c": reading.temperature_c,
            "humidity": reading.humidity,
            "flame_detected": reading.flame_detected,
            "created_at": reading.created_at.isoformat()
        })
        
    # Sort to keep order stable
    response_data.sort(key=lambda x: x["bin_id"])
    
    return JsonResponse(response_data, safe=False)
