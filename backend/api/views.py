from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .logic.hos_calculator import HosCalculator
from .models import TripHistory
from .serializers import TripHistorySerializer
import logging

logger = logging.getLogger(__name__)

class TripCalculatorView(APIView):
    def post(self, request, *args, **kwargs):
        try:
            required_fields = ['start_location', 'pickup_location', 'dropoff_location', 'cycle_hours_used']
            missing_fields = [field for field in required_fields if not request.data.get(field)]
            
            if missing_fields:
                return Response({
                    'error': f'Missing required fields: {", ".join(missing_fields)}'
                }, status=status.HTTP_400_BAD_REQUEST)

            cycle_hours = request.data.get('cycle_hours_used', 0)
            try:
                cycle_hours = float(cycle_hours)
                if cycle_hours < 0 or cycle_hours > 70:
                    return Response({
                        'error': 'Cycle hours used must be between 0 and 70 hours.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return Response({
                    'error': 'Cycle hours used must be a valid number.'
                }, status=status.HTTP_400_BAD_REQUEST)

            trip_data = {
                'start_location': request.data.get('start_location'),
                'pickup_location': request.data.get('pickup_location'),
                'dropoff_location': request.data.get('dropoff_location'),
                'cycle_hours_used': cycle_hours
            }

            log_info = request.data

            if not settings.ORS_API_KEY:
                logger.error("ORS_API_KEY not configured")
                return Response({
                    'error': 'Map service configuration error. Please contact support.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            calculator = HosCalculator(api_key=settings.ORS_API_KEY)
            
            result = calculator.calculate_trip(
                trip_data['start_location'],
                trip_data['pickup_location'],
                trip_data['dropoff_location'],
                trip_data['cycle_hours_used']
            )

            if 'error' in result:
                logger.error(f"Trip calculation error: {result['error']}")
                
                error_message = result['error']
                if 'Location' in error_message and 'could not be found' in error_message:
                    return Response({
                        'error': 'One or more locations could not be found. Please check the spelling and try again.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                elif 'route' in error_message.lower() or 'distance' in error_message.lower():
                    return Response({
                        'error': 'Unable to calculate route between the specified locations. Please verify the addresses and try again.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                elif 'API' in error_message or 'service' in error_message:
                    return Response({
                        'error': 'Map service is temporarily unavailable. Please try again in a few minutes.'
                    }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                else:
                    return Response({
                        'error': 'Unable to calculate route. Please check your input and try again.'
                    }, status=status.HTTP_400_BAD_REQUEST)

            try:
                TripHistory.objects.create(
                    start_location=trip_data['start_location'],
                    pickup_location=trip_data['pickup_location'],
                    dropoff_location=trip_data['dropoff_location'],
                    cycle_hours_used=trip_data['cycle_hours_used']
                )
            except Exception as e:
                logger.error(f"Error saving trip history: {str(e)}")

            final_response = {**result, "log_info": log_info}

            return Response(final_response, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Unexpected error in trip calculation: {str(e)}", exc_info=True)
            
            return Response({
                'error': 'An unexpected error occurred. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TripHistoryView(APIView):
    def get(self, request, *args, **kwargs):
        try:
            history = TripHistory.objects.all()[:50]  # Limit to last 50 entries
            serializer = TripHistorySerializer(history, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error retrieving trip history: {str(e)}")
            return Response({
                'error': 'Unable to retrieve trip history.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, *args, **kwargs):
        try:
            TripHistory.objects.all().delete()
            return Response({
                'message': 'All trip history entries deleted successfully.'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error deleting all trip history entries: {str(e)}")
            return Response({
                'error': 'Unable to delete all trip history entries.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TripHistoryDetailView(APIView):
    def get(self, request, history_id, *args, **kwargs):
        try:
            history_entry = TripHistory.objects.get(id=history_id)
            
            if not settings.ORS_API_KEY:
                return Response({
                    'error': 'Map service configuration error. Please contact support.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            calculator = HosCalculator(api_key=settings.ORS_API_KEY)
            
            result = calculator.calculate_trip(
                history_entry.start_location,
                history_entry.pickup_location,
                history_entry.dropoff_location,
                history_entry.cycle_hours_used
            )

            if 'error' in result:
                return Response({
                    'error': result['error']
                }, status=status.HTTP_400_BAD_REQUEST)

            final_response = {
                **result,
                "log_info": {
                    'driver_name': 'Mahder Tesfaye Abebe',
                    'driver_license': 'DL123456789',
                    'license_state': 'CA',
                    'carrier_name': 'Tesfaye Trucking Company',
                    'carrier_address': '1234 Trucking Lane, Los Angeles, CA 90210',
                    'truck_number': 'TT-2024-001',
                    'trailer_number': 'TR-2024-001',
                    'co_driver': 'John Smith',
                    'cargo_description': 'General freight and electronics',
                    'shipper': 'Tesfaye Logistics Inc.',
                    'consignee': 'Abebe Distribution Center'
                },
                "history_entry": TripHistorySerializer(history_entry).data
            }

            return Response(final_response, status=status.HTTP_200_OK)

        except TripHistory.DoesNotExist:
            return Response({
                'error': 'Trip history entry not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving trip history detail: {str(e)}")
            return Response({
                'error': 'An unexpected error occurred. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, history_id, *args, **kwargs):
        """Delete a specific trip history entry"""
        try:
            history_entry = TripHistory.objects.get(id=history_id)
            history_entry.delete()
            
            return Response({
                'message': 'Trip history entry deleted successfully.'
            }, status=status.HTTP_200_OK)

        except TripHistory.DoesNotExist:
            return Response({
                'error': 'Trip history entry not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error deleting trip history entry: {str(e)}")
            return Response({
                'error': 'An unexpected error occurred while deleting the entry. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)