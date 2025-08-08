from rest_framework import serializers
from .models import TripHistory

class TripInputSerializer(serializers.Serializer):
    start_location = serializers.CharField(max_length=200)
    pickup_location = serializers.CharField(max_length=200)
    dropoff_location = serializers.CharField(max_length=200)
    cycle_hours_used = serializers.FloatField(min_value=0, max_value=70)

class TripHistorySerializer(serializers.ModelSerializer):
    formatted_date = serializers.SerializerMethodField()
    
    class Meta:
        model = TripHistory
        fields = ['id', 'start_location', 'pickup_location', 'dropoff_location', 'cycle_hours_used', 'created_at', 'formatted_date']
    
    def get_formatted_date(self, obj):
        return obj.created_at.strftime('%Y-%m-%d %H:%M')