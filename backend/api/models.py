from django.db import models

class TripHistory(models.Model):
    start_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    cycle_hours_used = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Trip Histories'
    
    def __str__(self):
        return f"{self.start_location} → {self.pickup_location} → {self.dropoff_location} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
