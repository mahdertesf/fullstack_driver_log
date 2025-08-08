import requests
import datetime
import math
import logging

logger = logging.getLogger(__name__)

MAX_DRIVING_PER_DAY = 11 * 3600
MAX_ON_DUTY_WINDOW = 14 * 3600
DRIVING_LIMIT_BEFORE_BREAK = 8 * 3600
WEEKLY_CYCLE_LIMIT = 70 * 3600

REQUIRED_OFF_DUTY_RESET = 10 * 3600
REQUIRED_34_HOUR_RESTART = 34 * 3600
REQUIRED_30_MIN_BREAK = 0.5 * 3600

PRE_TRIP_INSPECTION_TIME = 0.5 * 3600
PICKUP_DROPOFF_TIME = 1 * 3600
FUELING_TIME = 0.5 * 3600
FUELING_DISTANCE_MILES = 1000

class HosCalculator:
    def __init__(self, api_key):
        self.api_key = api_key

    def _reverse_geocode_snap(self, lat, lng):
        """Snap raw coordinates to a nearby address/road using ORS reverse geocoding.
        Returns (snapped_lat, snapped_lng, formatted_name) or (lat, lng, None) on failure.
        """
        try:
            url = (
                "https://api.openrouteservice.org/geocode/reverse"
                f"?api_key={self.api_key}&point.lon={lng}&point.lat={lat}&size=1"
            )
            res = requests.get(url, timeout=10)
            res.raise_for_status()
            data = res.json()
            features = data.get('features') or []
            if features:
                feature = features[0]
                coords = feature['geometry']['coordinates']
                snapped_lng, snapped_lat = coords[0], coords[1]
                name = feature.get('properties', {}).get('label') or feature.get('properties', {}).get('name')
                return snapped_lat, snapped_lng, name
        except Exception:
            # Best-effort; ignore errors and fall back to original point
            pass
        return lat, lng, None

    def _get_coordinates(self, location_name):
        # Fast-path: accept direct coordinate strings from the client (e.g., 'lat, lng')
        # or labels containing coordinates like 'Location at 39.1234, -84.5678'
        try:
            if isinstance(location_name, str) and ',' in location_name:
                import re
                match = re.search(r'(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)', location_name)
                if match:
                    lat = float(match.group(1))
                    lng = float(match.group(2))
                    # Basic range validation
                    if -90 <= lat <= 90 and -180 <= lng <= 180:
                        # Snap to nearest road/address for better routability
                        snapped_lat, snapped_lng, label = self._reverse_geocode_snap(lat, lng)
                        formatted = label or f"{snapped_lat:.4f}, {snapped_lng:.4f}"
                        return {
                            'coordinates': f"{snapped_lng},{snapped_lat}",  # ORS expects 'lng,lat'
                            'lat': snapped_lat,
                            'lng': snapped_lng,
                            'name': location_name,
                            'formatted_name': formatted
                        }
        except Exception:
            # If parsing fails, fall back to geocoding
            pass

        try:
            url = f"https://api.openrouteservice.org/geocode/search?api_key={self.api_key}&text={location_name}"
            res = requests.get(url, timeout=10)
            res.raise_for_status()
            data = res.json()
            
            if not data.get('features'):
                raise ValueError(f"Location '{location_name}' could not be found.")
            
            feature = data['features'][0]
            coords = feature['geometry']['coordinates']
            return {
                'coordinates': f"{coords[0]},{coords[1]}",
                'lat': coords[1],
                'lng': coords[0],
                'name': location_name,
                'formatted_name': feature.get('properties', {}).get('name', location_name)
            }
        except requests.exceptions.Timeout:
            logger.error(f"Timeout while geocoding location: {location_name}")
            raise ValueError(f"Map service timeout while searching for '{location_name}'. Please try again.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error while geocoding {location_name}: {str(e)}")
            raise ValueError(f"Map service error while searching for '{location_name}'. Please try again.")
        except ValueError:
            # Re-raise ValueError as-is
            raise
        except Exception as e:
            logger.error(f"Unexpected error while geocoding {location_name}: {str(e)}")
            raise ValueError(f"Unable to find location '{location_name}'. Please check the spelling and try again.")

    def _haversine_meters(self, lat1, lon1, lat2, lon2):
        """Compute great-circle distance between two WGS84 points in meters."""
        try:
            from math import radians, sin, cos, asin, sqrt
            R = 6371000.0
            dlat = radians(lat2 - lat1)
            dlon = radians(lon2 - lon1)
            a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
            c = 2 * asin(sqrt(a))
            return R * c
        except Exception:
            return float('inf')

    def _get_route(self, start_coords, end_coords):
        try:
            headers = {'Authorization': self.api_key}
            def request_profile(profile):
                url = f"https://api.openrouteservice.org/v2/directions/{profile}"
                res = requests.get(url, headers=headers, params={
                    'start': start_coords,
                    'end': end_coords,
                }, timeout=15)
                return res

            # Try truck profile first
            res = request_profile('driving-hgv')
            if not res.ok:
                # Fallback to car profile for wider availability
                fallback = request_profile('driving-car')
                if not fallback.ok:
                    # Prefer showing the first error payload if available
                    try:
                        err_text = res.text or fallback.text
                    except Exception:
                        err_text = ''
                    raise requests.exceptions.RequestException(
                        f"Routing failed (hgv={res.status_code}, car={fallback.status_code}). {err_text[:200]}"
                    )
                res = fallback

            data = res.json()
            if not data.get('features'):
                raise ValueError("No route found between the specified locations.")

            route_data = data['features'][0]
            return {
                "distance_meters": route_data['properties']['summary']['distance'],
                "duration_seconds": route_data['properties']['summary']['duration'],
                "geometry": route_data['geometry']['coordinates']
            }
        except requests.exceptions.Timeout:
            logger.error(f"Timeout while calculating route from {start_coords} to {end_coords}")
            raise ValueError("Route calculation timed out. Please try again.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error while calculating route: {str(e)}")
            raise ValueError("Map service error while calculating route. Please try again.")
        except ValueError:
            # Re-raise ValueError as-is
            raise
        except Exception as e:
            logger.error(f"Unexpected error while calculating route: {str(e)}")
            raise ValueError("Unable to calculate route between the specified locations. Please verify the addresses and try again.")

    def _add_event(self, logs, status, duration, description, time_cursor, location, hos_status=None):
        """Add an event to the current day's log, handling midnight crossing when needed."""
        current_day_log = logs[-1]
        
        # Calculate end of current day (midnight)
        end_of_day = (time_cursor + datetime.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        seconds_until_midnight = (end_of_day - time_cursor).total_seconds()
        
        if duration <= seconds_until_midnight:
            # Event fits entirely in current day
            event_data = {
                'status': status,
                'duration': duration,
                'start_time': time_cursor.isoformat(),
                'start_time_hours': time_cursor.hour + time_cursor.minute / 60,
                'description': description,
                'location': location,
                'remarks': f"{description} at {location}"
            }
            
            # Add HOS status information if provided
            if hos_status:
                event_data['hos_after'] = {
                    'dailyDrivingRemaining': round(hos_status.get('daily_driving', 0) / 3600, 2),
                    'onDutyWindowRemaining': round(hos_status.get('on_duty_window', 0) / 3600, 2),
                    'breakCycleRemaining': round(hos_status.get('break_cycle', 0) / 3600, 2),
                    'weeklyCycleRemaining': round(hos_status.get('weekly_cycle', 0) / 3600, 2)
                }
            
            current_day_log['events'].append(event_data)
            return time_cursor + datetime.timedelta(seconds=duration)
        else:
            # Event crosses midnight: split into two parts
            
            first_day_duration = seconds_until_midnight
            second_day_duration = duration - seconds_until_midnight
            
            event_data_part1 = {
                'status': status,
                'duration': first_day_duration,
                'start_time': time_cursor.isoformat(),
                'start_time_hours': time_cursor.hour + time_cursor.minute / 60,
                'description': f"{description} (Part 1)",
                'location': location,
                'remarks': f"{description} at {location} (continues to next day)"
            }
            
            # Add HOS status to part 1 if provided
            if hos_status:
                event_data_part1['hos_after'] = {
                    'dailyDrivingRemaining': round(hos_status.get('daily_driving', 0) / 3600, 2),
                    'onDutyWindowRemaining': round(hos_status.get('on_duty_window', 0) / 3600, 2),
                    'breakCycleRemaining': round(hos_status.get('break_cycle', 0) / 3600, 2),
                    'weeklyCycleRemaining': round(hos_status.get('weekly_cycle', 0) / 3600, 2)
                }
            
            current_day_log['events'].append(event_data_part1)
            
            self._finalize_day_log(current_day_log)
            
            new_day_number = len(logs) + 1
            logs.append({'day': new_day_number, 'events': []})
            
            new_time_cursor = end_of_day
            event_data_part2 = {
                'status': status,
                'duration': second_day_duration,
                'start_time': new_time_cursor.isoformat(),
                'start_time_hours': 0,  # Starts at midnight
                'description': f"{description} (Part 2)",
                'location': location,
                'remarks': f"{description} at {location} (continued from previous day)"
            }
            
            # Add HOS status to part 2 if provided
            if hos_status:
                event_data_part2['hos_after'] = {
                    'dailyDrivingRemaining': round(hos_status.get('daily_driving', 0) / 3600, 2),
                    'onDutyWindowRemaining': round(hos_status.get('on_duty_window', 0) / 3600, 2),
                    'breakCycleRemaining': round(hos_status.get('break_cycle', 0) / 3600, 2),
                    'weeklyCycleRemaining': round(hos_status.get('weekly_cycle', 0) / 3600, 2)
                }
            
            logs[-1]['events'].append(event_data_part2)
            
            return new_time_cursor + datetime.timedelta(seconds=second_day_duration)

    def _finalize_day_log(self, day_log):
        """Finalize a day's log: ensure total equals 24h and compute status totals."""
        total_seconds = sum(event['duration'] for event in day_log['events'])
        remaining_seconds = 24 * 3600 - total_seconds
        
        if remaining_seconds > 0:
            # Add Off Duty time to complete the 24-hour accounting
            day_log['events'].append({
                'status': 'Off Duty',
                'duration': remaining_seconds,
                'start_time': None,  # Will be calculated during rendering
                'start_time_hours': None,
                'description': 'Off Duty',
                'location': 'End of Day',
                'remarks': 'Remaining time to complete 24-hour log'
            })
        
        # Calculate totals for each status (for log sheet display)
        status_totals = {'Off Duty': 0, 'Sleeper Berth': 0, 'Driving': 0, 'On Duty': 0}
        for event in day_log['events']:
            status = event['status']
            duration_hours = event['duration'] / 3600
            if status in status_totals:
                status_totals[status] += duration_hours
        
        day_log['status_totals'] = status_totals
        day_log['total_hours'] = sum(status_totals.values())

    def _calculate_minimum_driving_time(self, remaining_driving_time, daily_driving_bank, daily_on_duty_window, break_cycle_bank):
        """Calculate the minimum driving time based on all time banks"""
        return min(
            remaining_driving_time,
            daily_driving_bank,
            daily_on_duty_window,
            break_cycle_bank
        )

    def _calculate_fueling_stops(self, total_distance_miles):
        """Calculate the number of fueling stops needed"""
        return max(0, int(total_distance_miles / FUELING_DISTANCE_MILES))

    def calculate_trip(self, start_location, pickup_location, dropoff_location, cycle_hours_used):
        """
        Calculate trip following the exact HOS specifications:
        Part 1: Initialize Time Banks
        Part 2: Map the Journey and Schedule Fixed Tasks  
        Part 3: The Decision-Making Hierarchy Loop
        Part 4: The Core Mathematics - Minimum Value Rule
        Part 5: Logging and Updating Banks
        Part 6: Handle Midnight Crossings
        """
        try:
            # PART 2: THE BLUEPRINT - INITIAL CALCULATIONS
            
            # Map the Journey
            logger.info("Mapping journey locations...")
            start_location_data = self._get_coordinates(start_location)
            pickup_location_data = self._get_coordinates(pickup_location)
            dropoff_location_data = self._get_coordinates(dropoff_location)
            
            # Calculate route segments with pre-check to avoid overly long routes that ORS rejects
            # ORS free tier hard-limit ~6,000,000 meters. We'll estimate distances via haversine first.
            approx_s_p_m = self._haversine_meters(start_location_data['lat'], start_location_data['lng'], pickup_location_data['lat'], pickup_location_data['lng'])
            approx_p_d_m = self._haversine_meters(pickup_location_data['lat'], pickup_location_data['lng'], dropoff_location_data['lat'], dropoff_location_data['lng'])
            max_meters = 5_800_000  # safety margin below ~6,000,000m
            if approx_s_p_m > max_meters:
                raise ValueError(
                    f"Start to Pickup leg is too long for this service plan (approx {int(approx_s_p_m/1000)} km > {int(max_meters/1000)} km). "
                    "Please pick closer locations or split the trip."
                )
            if approx_p_d_m > max_meters:
                raise ValueError(
                    f"Pickup to Dropoff leg is too long for this service plan (approx {int(approx_p_d_m/1000)} km > {int(max_meters/1000)} km). "
                    "Please pick closer locations or split the trip."
                )

            start_to_pickup = self._get_route(start_location_data['coordinates'], pickup_location_data['coordinates'])
            pickup_to_dropoff = self._get_route(pickup_location_data['coordinates'], dropoff_location_data['coordinates'])
            
            # Total driving time needed (master "Time to Destination" value)
            total_driving_time_needed = start_to_pickup['duration_seconds'] + pickup_to_dropoff['duration_seconds']
            total_distance_miles = (start_to_pickup['distance_meters'] + pickup_to_dropoff['distance_meters']) / 1609.34
            
            # Schedule Fixed Tasks
            fueling_stops_needed = self._calculate_fueling_stops(total_distance_miles)
            
            # PART 1: INITIALIZE THE FOUR TIME BANKS
            daily_driving_bank = MAX_DRIVING_PER_DAY  # 11 hours
            daily_on_duty_window = MAX_ON_DUTY_WINDOW  # 14 hours (starts on first On-Duty task)
            break_cycle_bank = DRIVING_LIMIT_BEFORE_BREAK  # 8 hours
            weekly_cycle_bank = WEEKLY_CYCLE_LIMIT - (cycle_hours_used * 3600)  # 70 - user input
            
            # Initialize logs and time tracking
            logs = [{'day': 1, 'events': []}]
            time_cursor = datetime.datetime.utcnow().replace(hour=6, minute=0, second=0, microsecond=0)  # Start at 6 AM
            on_duty_window_started = False
            
            # Track remaining driving time to destination
            time_to_destination = total_driving_time_needed
            
            # Create task queue with exact order
            task_queue = [
                {'type': 'On Duty', 'duration': PRE_TRIP_INSPECTION_TIME, 'description': 'Pre-Trip Inspection', 'location': start_location_data['formatted_name']},
            ]
            
            # Add fueling stops to queue (will be inserted based on distance)
            fueling_tasks = []
            for i in range(fueling_stops_needed):
                fueling_tasks.append({
                    'type': 'On Duty', 
                    'duration': FUELING_TIME, 
                    'description': f'Fueling Stop {i+1}', 
                    'location': f'En Route - Fuel Stop {i+1}'
                })
            
            # Add pickup and dropoff tasks
            pickup_task = {'type': 'On Duty', 'duration': PICKUP_DROPOFF_TIME, 'description': 'Pickup Stop', 'location': pickup_location_data['formatted_name']}
            dropoff_task = {'type': 'On Duty', 'duration': PICKUP_DROPOFF_TIME, 'description': 'Dropoff Stop', 'location': dropoff_location_data['formatted_name']}
            
            # Track current location for geographical context
            current_location = start_location_data['formatted_name']
            
            # PART 3: THE ENGINE - THE DECISION-MAKING HIERARCHY LOOP
            logger.info("Starting HOS calculation loop...")
            
            # Execute pre-trip inspection first
            time_cursor = self._add_event(logs, 'On Duty', PRE_TRIP_INSPECTION_TIME, 'Pre-Trip Inspection', time_cursor, current_location, {
                'daily_driving': daily_driving_bank,
                'on_duty_window': daily_on_duty_window - PRE_TRIP_INSPECTION_TIME,
                'break_cycle': break_cycle_bank,
                'weekly_cycle': weekly_cycle_bank - PRE_TRIP_INSPECTION_TIME
            })
            on_duty_window_started = True
            daily_on_duty_window -= PRE_TRIP_INSPECTION_TIME
            weekly_cycle_bank -= PRE_TRIP_INSPECTION_TIME
            
            # Main simulation loop
            while time_to_destination > 0:
                
                # CHECK 1: IS A WEEKLY RESET REQUIRED?
                if weekly_cycle_bank <= 0:
                    logger.info("Weekly reset required - logging 34-hour restart")
                    time_cursor = self._add_event(logs, 'Off Duty', REQUIRED_34_HOUR_RESTART, '34-hour Restart', time_cursor, current_location, {
                        'daily_driving': MAX_DRIVING_PER_DAY,
                        'on_duty_window': MAX_ON_DUTY_WINDOW,
                        'break_cycle': DRIVING_LIMIT_BEFORE_BREAK,
                        'weekly_cycle': WEEKLY_CYCLE_LIMIT
                    })
                    # Reset all banks after 34-hour restart
                    weekly_cycle_bank = WEEKLY_CYCLE_LIMIT
                    daily_driving_bank = MAX_DRIVING_PER_DAY
                    daily_on_duty_window = MAX_ON_DUTY_WINDOW
                    break_cycle_bank = DRIVING_LIMIT_BEFORE_BREAK
                    on_duty_window_started = False
                    continue
                
                # CHECK 2: IS THE WORK DAY OVER?
                if daily_driving_bank <= 0 or (on_duty_window_started and daily_on_duty_window <= 0):
                    logger.info("Daily reset required - logging 10-hour break")
                    time_cursor = self._add_event(logs, 'Sleeper Berth', REQUIRED_OFF_DUTY_RESET, '10-hour Reset', time_cursor, current_location, {
                        'daily_driving': MAX_DRIVING_PER_DAY,
                        'on_duty_window': MAX_ON_DUTY_WINDOW,
                        'break_cycle': DRIVING_LIMIT_BEFORE_BREAK,
                        'weekly_cycle': weekly_cycle_bank
                    })
                    # Reset daily banks after 10-hour break
                    daily_driving_bank = MAX_DRIVING_PER_DAY
                    daily_on_duty_window = MAX_ON_DUTY_WINDOW
                    break_cycle_bank = DRIVING_LIMIT_BEFORE_BREAK
                    on_duty_window_started = False
                    continue
                
                # CHECK 3: IS A DRIVING BREAK REQUIRED?
                if break_cycle_bank <= 0 and time_to_destination > 0:
                    logger.info("30-minute break required")
                    time_cursor = self._add_event(logs, 'Off Duty', REQUIRED_30_MIN_BREAK, '30-minute Break', time_cursor, current_location, {
                        'daily_driving': daily_driving_bank,
                        'on_duty_window': daily_on_duty_window - REQUIRED_30_MIN_BREAK if on_duty_window_started else daily_on_duty_window,
                        'break_cycle': DRIVING_LIMIT_BEFORE_BREAK,
                        'weekly_cycle': weekly_cycle_bank
                    })
                    # Reset break cycle bank after 30-minute break
                    break_cycle_bank = DRIVING_LIMIT_BEFORE_BREAK
                    # 14-hour window continues to count down during break (it never pauses)
                    if on_duty_window_started:
                        daily_on_duty_window -= REQUIRED_30_MIN_BREAK
                    continue
                
                # CHECK 4: IS A PLANNED TASK NEXT?
                task_to_execute = None
                
                # Check if we need to do pickup (when we've driven to pickup location)
                if time_to_destination <= pickup_to_dropoff['duration_seconds'] and pickup_task:
                    task_to_execute = pickup_task
                    pickup_task = None  # Mark as completed
                    current_location = pickup_location_data['formatted_name']
                
                # Check if we need to do dropoff (when we've reached destination)
                elif time_to_destination <= 0 and dropoff_task:
                    task_to_execute = dropoff_task
                    dropoff_task = None  # Mark as completed
                    current_location = dropoff_location_data['formatted_name']
                
                # Check for fueling stops (simplified - insert at strategic points)
                elif fueling_tasks and time_to_destination < (total_driving_time_needed * 0.5):
                    task_to_execute = fueling_tasks.pop(0)
                    current_location = task_to_execute['location']
                
                if task_to_execute:
                    logger.info(f"Executing planned task: {task_to_execute['description']}")
                    time_cursor = self._add_event(logs, task_to_execute['type'], task_to_execute['duration'], 
                                                task_to_execute['description'], time_cursor, task_to_execute['location'], {
                        'daily_driving': daily_driving_bank,
                        'on_duty_window': daily_on_duty_window - task_to_execute['duration'],
                        'break_cycle': break_cycle_bank,
                        'weekly_cycle': weekly_cycle_bank - task_to_execute['duration']
                    })
                    
                    # Start on-duty window if not already started
                    if not on_duty_window_started:
                        on_duty_window_started = True
                    
                    # Update banks for On-Duty time
                    daily_on_duty_window -= task_to_execute['duration']
                    weekly_cycle_bank -= task_to_execute['duration']
                    continue
                
                # DEFAULT ACTION: DRIVE
                if time_to_destination > 0:
                    # PART 4: THE CORE MATHEMATICS - CALCULATING DRIVING TIME
                    # The "Minimum Value" Rule
                    driving_duration = min(
                        time_to_destination,  # Time remaining to reach destination
                        daily_driving_bank,   # Time remaining in Daily Driving Bank
                        daily_on_duty_window if on_duty_window_started else float('inf'),  # Time remaining in On-Duty Window
                        break_cycle_bank      # Time remaining in Break-Cycle Bank
                    )
                    
                    logger.info(f"Driving for {driving_duration/3600:.2f} hours (minimum of: destination={time_to_destination/3600:.2f}h, daily_driving={daily_driving_bank/3600:.2f}h, on_duty_window={daily_on_duty_window/3600:.2f}h, break_cycle={break_cycle_bank/3600:.2f}h)")
                    
                    # Determine current driving segment description
                    if time_to_destination > pickup_to_dropoff['duration_seconds']:
                        drive_description = f"Drive from {start_location_data['formatted_name']} toward {pickup_location_data['formatted_name']}"
                    else:
                        drive_description = f"Drive from {pickup_location_data['formatted_name']} toward {dropoff_location_data['formatted_name']}"
                    
                    # PART 5: LOGGING AND UPDATING THE BANKS
                    time_cursor = self._add_event(logs, 'Driving', driving_duration, drive_description, time_cursor, current_location, {
                        'daily_driving': daily_driving_bank - driving_duration,
                        'on_duty_window': daily_on_duty_window - driving_duration,
                        'break_cycle': break_cycle_bank - driving_duration,
                        'weekly_cycle': weekly_cycle_bank - driving_duration
                    })
                    
                    # Start on-duty window if this is the first driving event
                    if not on_duty_window_started:
                        on_duty_window_started = True
                    
                    # Update all relevant time banks
                    daily_driving_bank -= driving_duration      # Driving reduces Daily Driving Bank
                    daily_on_duty_window -= driving_duration    # Driving reduces On-Duty Window
                    break_cycle_bank -= driving_duration        # Driving reduces Break-Cycle Bank
                    weekly_cycle_bank -= driving_duration       # Driving reduces Weekly Cycle Bank
                    time_to_destination -= driving_duration     # Reduce remaining driving time
                    
                    # Update current location approximation
                    if time_to_destination <= pickup_to_dropoff['duration_seconds']:
                        current_location = f"En route to {dropoff_location_data['formatted_name']}"
                    else:
                        current_location = f"En route to {pickup_location_data['formatted_name']}"
            
            # Finalize the last day's log
            self._finalize_day_log(logs[-1])
            
            logger.info(f"Trip calculation completed. Generated {len(logs)} day(s) of logs.")
            
            return {
                'route_geometry': start_to_pickup['geometry'] + pickup_to_dropoff['geometry'],
                'logs': logs,
                'total_distance_miles': total_distance_miles,
                'total_driving_time_hours': total_driving_time_needed / 3600,
                'start_location': start_location_data,
                'pickup_location': pickup_location_data,
                'dropoff_location': dropoff_location_data,
                'trip_summary': {
                    'total_days': len(logs),
                    'total_driving_hours': total_driving_time_needed / 3600,
                    'total_distance_miles': total_distance_miles,
                    'fueling_stops': fueling_stops_needed
                }
            }
            
        except ValueError as e:
            logger.error(f"Validation error in calculate_trip: {str(e)}")
            return {'error': str(e)}
        except Exception as e:
            logger.error(f"Unexpected error in calculate_trip: {str(e)}", exc_info=True)
            return {'error': 'An unexpected error occurred while calculating the trip. Please try again.'}