from django.db import models

class SensorReading(models.Model):
    bin_id = models.CharField(max_length=100)
    distance_cm = models.FloatField()
    fill_percentage = models.IntegerField()
    temperature_c = models.FloatField()
    humidity = models.FloatField()
    flame_detected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.bin_id} - {self.fill_percentage}% - {self.created_at}"
