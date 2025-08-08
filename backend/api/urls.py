from django.urls import path
from .views import TripCalculatorView, TripHistoryView, TripHistoryDetailView

urlpatterns = [
    path('calculate-trip/', TripCalculatorView.as_view(), name='calculate-trip'),
    path('history/', TripHistoryView.as_view(), name='trip-history'),
    path('history/<int:history_id>/', TripHistoryDetailView.as_view(), name='trip-history-detail'),
]