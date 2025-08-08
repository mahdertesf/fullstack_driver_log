import React from 'react';
import { Clock, MapPin, Truck, Coffee, Bed, Fuel } from 'lucide-react';

const DetailedItinerary = ({ itinerary, tripSummary, routeData, onLocationClick }) => {
  
  // Calculate accumulated driving time up to each event for precise positioning
  const calculateAccumulatedDrivingTime = (targetEventIndex) => {
    if (!routeData?.logs) return 0;
    
    let accumulatedTime = 0;
    let eventCounter = 0;
    
    for (const log of routeData.logs) {
      for (const event of log.events) {
        // For the target event itself, if it's a driving event, we want the time BEFORE it starts
        if (eventCounter === targetEventIndex) {
          break;
        }
        
        if (event.status === 'Driving') {
          accumulatedTime += event.duration;
        }
        eventCounter++;
      }
      if (eventCounter >= targetEventIndex) break;
    }
    
    return accumulatedTime;
  };
  
  // Get total driving time for the entire trip
  const getTotalDrivingTime = () => {
    if (!routeData?.logs) return 0;
    
    let totalTime = 0;
    for (const log of routeData.logs) {
      for (const event of log.events) {
        if (event.status === 'Driving') {
          totalTime += event.duration;
        }
      }
    }
    return totalTime;
  };
  
  // Calculate driving segment coordinates for precise start and end points
  const getDrivingSegmentCoordinates = (eventDescription, eventIndex, eventDuration) => {
    if (!routeData?.route_geometry || !eventDescription.toLowerCase().includes('drive from')) {
      return null;
    }
    
    const routePoints = routeData.route_geometry.map(coord => [coord[1], coord[0]]);
    const totalDrivingTime = getTotalDrivingTime();
    
    if (totalDrivingTime === 0) return null;
    
    // Calculate driving progress BEFORE this segment starts
    const accumulatedTimeBeforeSegment = calculateAccumulatedDrivingTime(eventIndex);
    // Calculate driving progress AFTER this segment ends
    const accumulatedTimeAfterSegment = accumulatedTimeBeforeSegment + eventDuration;
    
    // Calculate progress percentages
    const startProgressPercentage = accumulatedTimeBeforeSegment / totalDrivingTime;
    const endProgressPercentage = accumulatedTimeAfterSegment / totalDrivingTime;
    
    // Map to route geometry indices
    const startRouteIndex = Math.floor(startProgressPercentage * (routePoints.length - 1));
    const endRouteIndex = Math.floor(endProgressPercentage * (routePoints.length - 1));
    
    const startPosition = routePoints[Math.min(startRouteIndex, routePoints.length - 1)];
    const endPosition = routePoints[Math.min(endRouteIndex, routePoints.length - 1)];
    
    return {
      startPosition,
      endPosition,
      startProgressPercentage,
      endProgressPercentage,
      segmentDistance: calculateDistance(startPosition, endPosition)
    };
  };
  
  // Calculate distance between two coordinates (approximate)
  const calculateDistance = (coord1, coord2) => {
    if (!coord1 || !coord2) return 0;
    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  // Calculate exact coordinates for break and rest events
  const getBreakRestCoordinates = (event, eventIndex) => {
    if (!routeData?.route_geometry) return null;
    
    const routePoints = routeData.route_geometry.map(coord => [coord[1], coord[0]]);
    const totalDrivingTime = getTotalDrivingTime();
    
    if (totalDrivingTime === 0) return null;
    
    // Calculate accumulated driving time up to this event
    const accumulatedDrivingTime = calculateAccumulatedDrivingTime(eventIndex);
    const progressPercentage = accumulatedDrivingTime / totalDrivingTime;
    
    // Map to exact route position
    const routeIndex = Math.floor(progressPercentage * (routePoints.length - 1));
    const exactPosition = routePoints[Math.min(routeIndex, routePoints.length - 1)];
    
    return exactPosition;
  };

  // Enhanced function to get coordinates for ANY event type with precise positioning
  const getEventCoordinates = (event, eventIndex = 0) => {
    if (!routeData || !routeData.route_geometry) {
      return null;
    }
    
    // FOR ALL EVENTS: Calculate position based on driving progress along the route
    // This ensures every event gets positioned at the correct point along the actual route
    
    const routePoints = routeData.route_geometry.map(coord => [coord[1], coord[0]]);
    const totalDrivingTime = getTotalDrivingTime();
    const accumulatedDrivingTime = calculateAccumulatedDrivingTime(eventIndex);
    
    if (totalDrivingTime === 0) {
      if (routeData.start_location) {
        return [routeData.start_location.lat, routeData.start_location.lng];
      }
      return null;
    }
    
    // Calculate progress percentage along the route
    const progressPercentage = accumulatedDrivingTime / totalDrivingTime;
    
    // Map to exact route position
    const routeIndex = Math.floor(progressPercentage * (routePoints.length - 1));
    const exactPosition = routePoints[Math.min(routeIndex, routePoints.length - 1)];
    
    // SPECIAL CASE: For driving events, also calculate end position
    if (event.status === 'Driving' && event.duration) {
      const accumulatedTimeAfterDriving = accumulatedDrivingTime + event.duration;
      const endProgressPercentage = accumulatedTimeAfterDriving / totalDrivingTime;
      const endRouteIndex = Math.floor(endProgressPercentage * (routePoints.length - 1));
      const endPosition = routePoints[Math.min(endRouteIndex, routePoints.length - 1)];
      
      // For driving events, we can return both start and end, but for now return start
      return exactPosition;
    }
    
    return exactPosition;
  };

  // Helper function to get coordinates for a location
  const getLocationCoordinates = (locationName, eventType, eventIndex = 0, eventDescription = '', eventDuration = 0) => {
    if (!routeData) return null;
    
    // SPECIAL HANDLING FOR DRIVING EVENTS - Return start coordinates
    if (eventType === 'Driving' && eventDescription.toLowerCase().includes('drive from')) {
      const segmentData = getDrivingSegmentCoordinates(eventDescription, eventIndex, eventDuration);
      if (segmentData) {
        // Return start position for driving segments
        return segmentData.startPosition;
      }
    }
    
    // Check for exact location matches from route data
    if (routeData.start_location && 
        (locationName === routeData.start_location.formatted_name || 
         locationName === routeData.start_location.name ||
         locationName.includes(routeData.start_location.formatted_name) ||
         eventDescription.includes('Pre-Trip'))) {
      return [routeData.start_location.lat, routeData.start_location.lng];
    }
    if (routeData.pickup_location && 
        (locationName === routeData.pickup_location.formatted_name || 
         locationName === routeData.pickup_location.name ||
         locationName.includes(routeData.pickup_location.formatted_name) ||
         eventDescription.includes('Pickup'))) {
      return [routeData.pickup_location.lat, routeData.pickup_location.lng];
    }
    if (routeData.dropoff_location && 
        (locationName === routeData.dropoff_location.formatted_name || 
         locationName === routeData.dropoff_location.name ||
         locationName.includes(routeData.dropoff_location.formatted_name) ||
         eventDescription.includes('Dropoff'))) {
      return [routeData.dropoff_location.lat, routeData.dropoff_location.lng];
    }
    
    // For coordinate-based locations (like "39.1234, -84.5678")
    if (locationName.includes(',')) {
      const coords = locationName.split(',').map(coord => parseFloat(coord.trim()));
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        return coords;
      }
    }
    
    // For en route locations, calculate EXACT position based on driving progress
    if ((locationName.toLowerCase().includes('en route') || 
         locationName.toLowerCase().includes('toward')) && 
        routeData.route_geometry) {
      
      const routePoints = routeData.route_geometry.map(coord => [coord[1], coord[0]]);
      const totalDrivingTime = getTotalDrivingTime();
      const accumulatedDrivingTime = calculateAccumulatedDrivingTime(eventIndex);
      
      if (totalDrivingTime > 0) {
        // Calculate exact progress percentage based on actual driving time
        const progressPercentage = accumulatedDrivingTime / totalDrivingTime;
        
        // Find the exact point along the route geometry
        const routeIndex = Math.floor(progressPercentage * (routePoints.length - 1));
        const exactPosition = routePoints[Math.min(routeIndex, routePoints.length - 1)];

        return exactPosition;
      }
    }
    
    // Fallback: For other en-route locations without precise timing
    if (locationName.toLowerCase().includes('en route') && routeData.route_geometry) {
      const routePoints = routeData.route_geometry.map(coord => [coord[1], coord[0]]);
      
      // Use event type to determine approximate position
      if (eventType === '30-Minute Break') {
        const breakIndex = Math.floor(routePoints.length * 0.4);
        return routePoints[breakIndex] || null;
      } else if (eventType === '10-Hour Reset') {
        const resetIndex = Math.floor(routePoints.length * 0.6);
        return routePoints[resetIndex] || null;
      } else if (eventType === 'Fueling Stop') {
        const fuelIndex = Math.floor(routePoints.length * 0.3);
        return routePoints[fuelIndex] || null;
      }
    }
    
    return null;
  };
  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Trip Itinerary</h2>
        <div className="text-gray-600">Itinerary will be generated after calculating the route.</div>
      </div>
    );
  }
  


  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'Begin Trip':
      case 'End Trip':
        return <Truck className="w-5 h-5 text-blue-600" />;
      case 'Drive':
        return <Truck className="w-5 h-5 text-green-600" />;
      case '30-Minute Break':
        return <Coffee className="w-5 h-5 text-orange-600" />;
      case '10-Hour Reset':
        return <Bed className="w-5 h-5 text-purple-600" />;
      case 'Fueling Stop':
        return <Fuel className="w-5 h-5 text-cyan-600" />;
      case 'Load Cargo':
      case 'Unload Cargo':
        return <MapPin className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'Begin Trip':
      case 'End Trip':
        return 'border-blue-200 bg-blue-50';
      case 'Drive':
        return 'border-green-200 bg-green-50';
      case '30-Minute Break':
        return 'border-orange-200 bg-orange-50';
      case '10-Hour Reset':
        return 'border-purple-200 bg-purple-50';
      case 'Fueling Stop':
        return 'border-cyan-200 bg-cyan-50';
      case 'Load Cargo':
      case 'Unload Cargo':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const formatDuration = (duration) => {
    if (typeof duration === 'number') {
      const hours = Math.floor(duration);
      const minutes = Math.round((duration - hours) * 60);
      if (hours > 0 && minutes > 0) {
        return `${hours}h ${minutes}m`;
      } else if (hours > 0) {
        return `${hours}h`;
      } else {
        return `${minutes}m`;
      }
    }
    return duration;
  };

  const formatHOSStatus = (hosStatus) => {
    if (!hosStatus) return null;
    
    return (
      <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200 text-xs text-center">
        <div className="font-semibold text-blue-800 mb-2">🕒 HOS Status After Event:</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 justify-items-center">
          <div className="flex items-center gap-2 whitespace-nowrap justify-center">
            <span className="text-gray-700">Daily Driving:</span>
            <span className="font-semibold text-blue-600">{hosStatus.dailyDrivingRemaining}h</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap justify-center">
            <span className="text-gray-700">On-Duty Window:</span>
            <span className="font-semibold text-blue-600">{hosStatus.onDutyWindowRemaining}h</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap justify-center">
            <span className="text-gray-700">Break Cycle:</span>
            <span className="font-semibold text-blue-600">{hosStatus.breakCycleRemaining}h</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap justify-center">
            <span className="text-gray-700">Weekly Cycle:</span>
            <span className="font-semibold text-blue-600">{hosStatus.weeklyCycleRemaining}h</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Trip Itinerary</h2>
      <p className="text-gray-600 mb-4">Step-by-step breakdown of your entire journey with HOS compliance details.</p>


      <div className="space-y-4">
        {itinerary.map((event, index) => {
          const eventCoordinates = getEventCoordinates(event, index);
          const isClickable = eventCoordinates && onLocationClick;
          
          return (
          <div 
            key={index}
              id={`itinerary-event-${index}`}
              className={`border-l-4 p-4 rounded-r-lg transition-all duration-200 ${getEventColor(event.type)} ${
                isClickable ? 'cursor-pointer hover:shadow-lg hover:bg-opacity-80 hover:scale-[1.01]' : ''
              }`}
              onClick={() => {
                if (isClickable) {
                  onLocationClick(`${event.type} - ${event.description || event.location}`, eventCoordinates, index);
                }
              }}
              title={isClickable ? "🗺️ Click to view on map" : ""}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getEventIcon(event.type)}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    {event.type}
                    {isClickable && (
                      <span className="text-teal-600 text-sm animate-pulse">📍</span>
                    )}
                  </h3>
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    {event.startTime}
                    {isClickable && (
                      <span className="text-teal-600 hover:text-teal-800 transition-colors text-xs">
                        🗺️ Click to view
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Duration:</span>
                    <span className="ml-2 text-gray-600">{formatDuration(event.duration)}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-gray-700">Location:</span>
                    {(() => {
                      const eventCoords = getEventCoordinates(event, index);
                      
                      // DRIVING EVENTS - Show start/end points with coordinates
                      if (event.status === 'Driving' && event.description?.toLowerCase().includes('drive from')) {
                        const segmentData = getDrivingSegmentCoordinates(event.description, index, event.duration);
                        
                        if (segmentData && onLocationClick) {
                          return (
                            <div className="ml-2 space-y-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">
                                Route-Based Driving Coordinates
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onLocationClick(`${event.description} - Start Point`, segmentData.startPosition, index);
                                  }}
                                  className="text-green-600 hover:text-green-800 underline decoration-dotted hover:decoration-solid transition-all duration-200 font-medium text-xs"
                                  title={`Start: ${segmentData.startPosition[0].toFixed(4)}, ${segmentData.startPosition[1].toFixed(4)}`}
                                >
                                  🟢 Start: {segmentData.startPosition[0].toFixed(3)}, {segmentData.startPosition[1].toFixed(3)}
                                </button>
                                <span className="text-gray-400">→</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onLocationClick(`${event.description} - End Point`, segmentData.endPosition, index);
                                  }}
                                  className="text-red-600 hover:text-red-800 underline decoration-dotted hover:decoration-solid transition-all duration-200 font-medium text-xs"
                                  title={`End: ${segmentData.endPosition[0].toFixed(4)}, ${segmentData.endPosition[1].toFixed(4)}`}
                                >
                                  🔴 End: {segmentData.endPosition[0].toFixed(3)}, {segmentData.endPosition[1].toFixed(3)}
                                </button>
                              </div>
                              <div className="text-xs text-gray-500">
                                Segment Distance: ~{segmentData.segmentDistance} miles | 
                                Route Progress: {(segmentData.startProgressPercentage * 100).toFixed(1)}% → {(segmentData.endProgressPercentage * 100).toFixed(1)}%
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      // BREAK EVENTS - Show exact break coordinates
                      else if (event.status === 'Off Duty' && eventCoords && onLocationClick) {
                        return (
                          <div className="ml-2 space-y-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLocationClick(`${event.description} at route position`, eventCoords, index);
                              }}
                              className="text-orange-600 hover:text-orange-800 underline decoration-dotted hover:decoration-solid transition-all duration-200 font-medium text-sm"
                              title={`Route Position: ${eventCoords[0].toFixed(4)}, ${eventCoords[1].toFixed(4)}`}
                            >
                              ☕ Route Position: {eventCoords[0].toFixed(3)}, {eventCoords[1].toFixed(3)}
                            </button>
                            <div className="text-xs text-gray-500">
                              Calculated position along route based on driving progress
                            </div>
                          </div>
                        );
                      }
                      
                      // REST/SLEEP EVENTS - Show exact rest coordinates
                      else if (event.status === 'Sleeper Berth' && eventCoords && onLocationClick) {
                        return (
                          <div className="ml-2 space-y-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLocationClick(`${event.description} at route position`, eventCoords, index);
                              }}
                              className="text-purple-600 hover:text-purple-800 underline decoration-dotted hover:decoration-solid transition-all duration-200 font-medium text-sm"
                              title={`Route Position: ${eventCoords[0].toFixed(4)}, ${eventCoords[1].toFixed(4)}`}
                            >
                              🛏️ Route Position: {eventCoords[0].toFixed(3)}, {eventCoords[1].toFixed(3)}
                            </button>
                            <div className="text-xs text-gray-500">
                              Calculated position along route based on driving progress
                            </div>
                          </div>
                        );
                      }
                      
                      // 34-HOUR RESTART - Show exact restart coordinates
                      else if (event.description?.includes('34-Hour') && eventCoords && onLocationClick) {
                        return (
                          <div className="ml-2 space-y-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLocationClick(`${event.description} at route position`, eventCoords, index);
                              }}
                              className="text-red-700 hover:text-red-900 underline decoration-dotted hover:decoration-solid transition-all duration-200 font-medium text-sm"
                              title={`Route Position: ${eventCoords[0].toFixed(4)}, ${eventCoords[1].toFixed(4)}`}
                            >
                              🔄 Route Position: {eventCoords[0].toFixed(3)}, {eventCoords[1].toFixed(3)}
                            </button>
                            <div className="text-xs text-gray-500">
                              Calculated position along route based on driving progress
                            </div>
                          </div>
                        );
                      }
                      
                      // DEFAULT - Other events with coordinates
                      else if (eventCoords && onLocationClick) {
                        return (
                          <div className="ml-2 space-y-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLocationClick(`${event.description || event.location}`, eventCoords, index);
                              }}
                              className="text-teal-600 hover:text-teal-800 underline decoration-dotted hover:decoration-solid transition-all duration-200 font-medium text-sm"
                              title={`Route Position: ${eventCoords[0].toFixed(4)}, ${eventCoords[1].toFixed(4)}`}
                            >
                              📍 Route Position: {eventCoords[0].toFixed(3)}, {eventCoords[1].toFixed(3)}
                            </button>
                            <div className="text-xs text-gray-500">
                              Calculated position along route based on driving progress
                            </div>
                          </div>
                        );
                      }
                      
                      // FALLBACK - No coordinates available
                      else {
                        return <span className="ml-2 text-gray-600">{event.location}</span>;
                      }
                    })()}
                  </div>
                  
                  {event.distance && (
                    <div>
                      <span className="font-medium text-gray-700">Distance:</span>
                      <span className="ml-2 text-gray-600">{event.distance} miles</span>
                    </div>
                  )}
                </div>
                
                {event.description && (
                  <div className="mt-2 text-sm text-gray-600">
                    {event.description}
                  </div>
                )}
                
                {event.route && (
                  <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Route:</span> {event.route}
                  </div>
                )}
                
                {formatHOSStatus(event.hosStatus || event.hos_after)}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      {tripSummary && (
        <div className="mt-8 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
          <h3 className="font-semibold text-teal-800 mb-3">Trip Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Total Events</div>
              <div className="text-teal-600 font-semibold">{itinerary.length}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Driving Segments</div>
              <div className="text-teal-600 font-semibold">
                {itinerary.filter(e => e.type === 'Drive').length}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Required Breaks</div>
              <div className="text-teal-600 font-semibold">
                {itinerary.filter(e => e.type === '30-Minute Break' || e.type === '10-Hour Reset').length}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Service Stops</div>
              <div className="text-teal-600 font-semibold">
                {itinerary.filter(e => e.type === 'Fueling Stop' || e.type === 'Load Cargo' || e.type === 'Unload Cargo').length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedItinerary;
