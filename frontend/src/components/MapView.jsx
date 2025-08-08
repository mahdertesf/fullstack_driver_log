import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const getLocationNameFromCoordinates = (lat, lng) => {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });
};

const MapFocusHandler = ({ focusedLocation, markers }) => {
  const map = useMap();
  
  useEffect(() => {
    if (focusedLocation && focusedLocation.coordinates) {
      const [lat, lng] = focusedLocation.coordinates;
      
      // Find the marker that matches this location
      const matchingMarker = markers.find(marker => {
        const [markerLat, markerLng] = marker.position;
        return Math.abs(markerLat - lat) < 0.001 && Math.abs(markerLng - lng) < 0.001;
      });
      
      // Fly to the location with appropriate zoom level
      const zoomLevel = focusedLocation.location?.toLowerCase().includes('en route') ? 10 : 12;
      map.flyTo([lat, lng], zoomLevel, {
        animate: true,
        duration: 1.5
      });
      
      // If we found a matching marker, simulate a click to open its popup
      if (matchingMarker) {
        setTimeout(() => {
          // Find the marker on the map and open its popup
          map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              const layerPos = layer.getLatLng();
              if (Math.abs(layerPos.lat - lat) < 0.001 && Math.abs(layerPos.lng - lng) < 0.001) {
                layer.openPopup();
              }
            }
          });
        }, 1000);
      } else if (focusedLocation.location?.toLowerCase().includes('en route') || 
                 focusedLocation.location?.toLowerCase().includes('drive from') ||
                 focusedLocation.location?.toLowerCase().includes('start point') ||
                 focusedLocation.location?.toLowerCase().includes('end point')) {
        // For en-route locations and driving segments, add a temporary marker
        setTimeout(() => {
          // Determine marker color and icon based on location type
          let markerColor = '#F59E0B'; // Default amber
          let markerIcon = '📍';
          
          if (focusedLocation.location?.toLowerCase().includes('start point')) {
            markerColor = '#10B981'; // Green for start points
            markerIcon = '🟢';
          } else if (focusedLocation.location?.toLowerCase().includes('end point')) {
            markerColor = '#EF4444'; // Red for end points  
            markerIcon = '🔴';
          } else if (focusedLocation.location?.toLowerCase().includes('drive from')) {
            markerColor = '#3B82F6'; // Blue for driving segments
            markerIcon = '🚛';
          }
          
          const tempMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'temp-marker',
              html: `<div style="background-color: ${markerColor}; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); animation: pulse 2s infinite; display: flex; align-items: center; justify-content: center; font-size: 10px;">${markerIcon}</div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9]
            })
          }).addTo(map);
          
          // Add popup with detailed location info
          const popupTitle = focusedLocation.location?.includes('Start Point') ? 'Driving Segment Start' : 
                             focusedLocation.location?.includes('End Point') ? 'Driving Segment End' : 
                             focusedLocation.location?.includes('Drive from') ? 'Driving Event' :
                             focusedLocation.location?.includes('Break') ? 'Rest Break Location' :
                             focusedLocation.location?.includes('Reset') ? 'Sleep Rest Location' :
                             focusedLocation.location?.includes('Inspection') ? 'Pre-Trip Inspection' :
                             focusedLocation.location?.includes('Pickup') ? 'Cargo Pickup' :
                             focusedLocation.location?.includes('Dropoff') ? 'Cargo Delivery' :
                             'Event Location';
          
          tempMarker.bindPopup(`
            <div class="min-w-48">
              <div class="font-semibold text-gray-800 mb-2">${markerIcon} ${popupTitle}</div>
              <div class="space-y-1 text-sm">
                <div><span class="font-medium">Event:</span> ${focusedLocation.location}</div>
                <div><span class="font-medium">Coordinates:</span> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
                <div class="text-gray-600 mt-2">📍 Clicked from Detailed Trip Itinerary</div>
                <div class="text-teal-600 text-xs mt-1">Marker will disappear in 12 seconds</div>
              </div>
            </div>
          `).openPopup();
          
          // Remove temporary marker after 12 seconds (longer for driving segments)
          setTimeout(() => {
            map.removeLayer(tempMarker);
          }, 12000);
        }, 1000);
      }
    }
  }, [focusedLocation, map, markers]);
  
  return null;
};

const MapView = ({ routeData, tripSummary, detailedItinerary, focusedLocation, onMarkerClick }) => {
  const [selectedMarker, setSelectedMarker] = useState(null);

  if (!routeData?.route_geometry) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Route Map</h2>
        <div className="flex items-center justify-center h-64 bg-slate-200 rounded-lg">
          <p className="text-gray-600">Map will be shown here after calculating route.</p>
        </div>
      </div>
    );
  }

  const polyline = routeData.route_geometry.map(coord => [coord[1], coord[0]]);
  const center = polyline[Math.floor(polyline.length / 2)];

  // Generate markers for all stops with accurate positioning
  const generateMarkers = () => {
    const markers = [];
    
    // Process all events from logs to create markers with accurate timing
    if (routeData.logs) {
      let totalDrivingTime = 0;
      let accumulatedDrivingTime = 0;
      
      // Calculate total driving time for progress calculation
      routeData.logs.forEach(log => {
        log.events.forEach(event => {
          if (event.status === 'Driving') {
            totalDrivingTime += event.duration;
          }
        });
      });
      
      let globalEventIndex = 0;
      
      routeData.logs.forEach((log, dayIndex) => {
        log.events.forEach((event, eventIndex) => {
          // Update accumulated driving time for positioning
          if (event.status === 'Driving') {
            accumulatedDrivingTime += event.duration;
          }
          
          // Create markers based on event type
          if (event.description?.includes('Pre-Trip')) {
            // Start location with actual timing
            if (routeData.start_location) {
              markers.push({
                position: [routeData.start_location.lat, routeData.start_location.lng],
                type: 'start',
                title: 'Start Location',
                eventIndex: globalEventIndex,
                details: {
                  event: 'Begin Trip',
                  location: routeData.start_location.formatted_name || routeData.start_location.name,
                  time: `Day ${dayIndex + 1}, ${formatTime(event.start_time_hours)}`,
                  duration: `${Math.round(event.duration/3600*100)/100} hours`,
                  description: 'Pre-trip inspection and journey start'
                },
                icon: createCustomIcon('#10B981') // Green
              });
            }
          } else if (event.status === 'On Duty' && event.description?.includes('Pickup')) {
            // Pickup location with actual timing
            if (routeData.pickup_location) {
              markers.push({
                position: [routeData.pickup_location.lat, routeData.pickup_location.lng],
                type: 'pickup',
                title: 'Pickup Location',
                eventIndex: globalEventIndex,
                details: {
                  event: 'Load Cargo',
                  location: routeData.pickup_location.formatted_name || routeData.pickup_location.name,
                  time: `Day ${dayIndex + 1}, ${formatTime(event.start_time_hours)}`,
                  duration: `${Math.round(event.duration/3600*100)/100} hours`,
                  description: 'Cargo pickup and loading'
                },
                icon: createCustomIcon('#3B82F6') // Blue
              });
            }
          } else if (event.status === 'On Duty' && event.description?.includes('Dropoff')) {
            // Dropoff location with actual timing
            if (routeData.dropoff_location) {
              markers.push({
                position: [routeData.dropoff_location.lat, routeData.dropoff_location.lng],
                type: 'dropoff',
                title: 'Dropoff Location',
                eventIndex: globalEventIndex,
                details: {
                  event: 'Unload Cargo',
                  location: routeData.dropoff_location.formatted_name || routeData.dropoff_location.name,
                  time: `Day ${dayIndex + 1}, ${formatTime(event.start_time_hours)}`,
                  duration: `${Math.round(event.duration/3600*100)/100} hours`,
                  description: 'Final destination and cargo unloading'
                },
                icon: createCustomIcon('#EF4444') // Red
              });
            }
          } else if (event.status === 'Off Duty' && event.description?.includes('30-min')) {
            // 30-Minute Break - position based on driving progress
            const progress = totalDrivingTime > 0 ? accumulatedDrivingTime / totalDrivingTime : 0;
            const routeIndex = Math.floor(progress * (polyline.length - 1));
            const position = polyline[Math.min(routeIndex, polyline.length - 1)];
            
            if (position && position.length >= 2) {
              const locationName = getLocationNameFromCoordinates(position[0], position[1]);
              
              markers.push({
                position: position,
                type: '30_min_break',
                title: '30-Minute Break',
                eventIndex: globalEventIndex,
                details: {
                  event: '30-Minute Break',
                  location: locationName,
                  time: `Day ${dayIndex + 1}, ${formatTime(event.start_time_hours)}`,
                  duration: `${Math.round(event.duration/3600*100)/100} hours`,
                  description: 'Mandatory 30-minute break required by HOS regulations'
                },
                icon: createCustomIcon('#F59E0B') // Orange
              });
            }
          } else if (event.status === 'Sleeper Berth' && event.description?.includes('10-hour')) {
            // 10-Hour Reset - position based on driving progress
            const progress = totalDrivingTime > 0 ? accumulatedDrivingTime / totalDrivingTime : 0;
            const routeIndex = Math.floor(progress * (polyline.length - 1));
            const position = polyline[Math.min(routeIndex, polyline.length - 1)];
            
            if (position && position.length >= 2) {
              const locationName = getLocationNameFromCoordinates(position[0], position[1]);
              
              markers.push({
                position: position,
                type: '10_hour_reset',
                title: '10-Hour Reset',
                eventIndex: globalEventIndex,
                details: {
                  event: '10-Hour Reset',
                  location: locationName,
                  time: `Day ${dayIndex + 1}, ${formatTime(event.start_time_hours)}`,
                  duration: `${Math.round(event.duration/3600*100)/100} hours`,
                  description: 'Mandatory 10-hour rest period required by HOS regulations'
                },
                icon: createCustomIcon('#8B5CF6') // Purple
              });
            }
          } else if (event.status === 'Off Duty' && event.description?.includes('34-hour')) {
            // 34-Hour Restart - position based on driving progress
            const progress = totalDrivingTime > 0 ? accumulatedDrivingTime / totalDrivingTime : 0;
            const routeIndex = Math.floor(progress * (polyline.length - 1));
            const position = polyline[Math.min(routeIndex, polyline.length - 1)];
            
            if (position && position.length >= 2) {
              const locationName = getLocationNameFromCoordinates(position[0], position[1]);
              
              markers.push({
                position: position,
                type: '34_hour_restart',
                title: '34-Hour Restart',
                eventIndex: globalEventIndex,
                details: {
                  event: '34-Hour Restart',
                  location: locationName,
                  time: `Day ${dayIndex + 1}, ${formatTime(event.start_time_hours)}`,
                  duration: `${Math.round(event.duration/3600*100)/100} hours`,
                  description: 'Mandatory 34-hour restart required by HOS regulations'
                },
                icon: createCustomIcon('#DC2626') // Dark Red
              });
            }
          } else if (event.description?.includes('Fueling')) {
            // Fueling Stop - position based on driving progress
            const progress = totalDrivingTime > 0 ? accumulatedDrivingTime / totalDrivingTime : 0;
            const routeIndex = Math.floor(progress * (polyline.length - 1));
            const position = polyline[Math.min(routeIndex, polyline.length - 1)];
            
            if (position && position.length >= 2) {
              const locationName = getLocationNameFromCoordinates(position[0], position[1]);
              
              markers.push({
                position: position,
                type: 'fueling_stop',
                title: 'Fueling Stop',
                eventIndex: globalEventIndex,
                details: {
                  event: 'Fueling Stop',
                  location: locationName,
                  time: `Day ${dayIndex + 1}, ${formatTime(event.start_time_hours)}`,
                  duration: `${Math.round(event.duration/3600*100)/100} hours`,
                  description: 'Scheduled fueling stop'
                },
                icon: createCustomIcon('#06B6D4') // Cyan
              });
            }
          }
          
          // Increment global event index for linking with itinerary
          globalEventIndex++;
        });
      });
    }

    return markers;
  };

  const formatTime = (timeHours) => {
    if (!timeHours) return 'TBD';
    const hours = Math.floor(timeHours);
    const minutes = Math.round((timeHours - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const markers = generateMarkers();

  return (
    <div id="interactive-map" className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Interactive Route Plan</h2>
      
      {/* Trip Summary */}
      {tripSummary && (
        <div className="mb-6 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg p-4 border border-cyan-200">
          <h3 className="text-lg font-semibold text-teal-800 mb-3">Trip Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Total Mileage</div>
              <div className="text-teal-600 font-semibold">{tripSummary.totalMiles} miles</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Driving Time</div>
              <div className="text-teal-600 font-semibold">{tripSummary.totalDrivingTime} hours</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Trip Duration</div>
              <div className="text-teal-600 font-semibold">{tripSummary.totalTripDuration}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Driving Days</div>
              <div className="text-teal-600 font-semibold">{tripSummary.numberOfDays}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">10-Hour Resets</div>
              <div className="text-teal-600 font-semibold">{tripSummary.tenHourResets}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">30-Min Breaks</div>
              <div className="text-teal-600 font-semibold">{tripSummary.thirtyMinBreaks}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Fueling Stops</div>
              <div className="text-teal-600 font-semibold">{tripSummary.fuelingStops}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Total Stops</div>
              <div className="text-teal-600 font-semibold">{tripSummary.totalStops}</div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Map */}
      <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-200">
        <MapContainer center={center} zoom={5} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Map Focus Handler */}
          <MapFocusHandler focusedLocation={focusedLocation} markers={markers} />
          
          {/* Route Path */}
          <Polyline 
            pathOptions={{ color: '#0f766e', weight: 5, opacity: 0.8 }} 
            positions={polyline} 
          />
          
          {/* All Markers */}
          {markers.map((marker, index) => (
            <Marker 
              key={index}
              position={marker.position}
              icon={marker.icon}
              eventHandlers={{
                click: () => {
                  setSelectedMarker(marker);
                  if (onMarkerClick && marker.eventIndex !== undefined) {
                    onMarkerClick(marker.title, marker.position, marker.eventIndex);
                  }
                }
              }}
            >
              <Popup>
                <div className="min-w-64">
                  <div className="font-semibold text-gray-800 mb-2">{marker.title}</div>
                  <div className="space-y-1 text-sm">
                    <div><span className="font-medium">Event:</span> {marker.details.event}</div>
                    <div><span className="font-medium">Location:</span> {marker.details.location}</div>
                    <div><span className="font-medium">Time:</span> {marker.details.time}</div>
                    <div><span className="font-medium">Duration:</span> {marker.details.duration}</div>
                    <div className="text-gray-600 mt-2">{marker.details.description}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow"></div>
          <span>Start Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow"></div>
          <span>Pickup Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
          <span>Dropoff Location</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow"></div>
          <span>30-Min Break</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow"></div>
          <span>10-Hour Reset</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-700 rounded-full border-2 border-white shadow"></div>
          <span>34-Hour Restart</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-cyan-500 rounded-full border-2 border-white shadow"></div>
          <span>Fueling Stop</span>
        </div>
      </div>
    </div>
  );
};

export default MapView;