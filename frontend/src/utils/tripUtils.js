export const generateTripSummary = (routeData) => {
  if (!routeData || !routeData.logs) return null;

  const totalMiles = routeData.total_distance_miles || 0;
  const numberOfDays = routeData.logs.length;
  
  // Calculate totals from logs
  let totalDrivingTime = 0;
  let tenHourResets = 0;
  let thirtyMinBreaks = 0;
  let fuelingStops = 0;

  routeData.logs.forEach(log => {
    log.events.forEach(event => {
      if (event.status === 'Driving') {
        totalDrivingTime += event.duration / 3600; // Convert to hours
      } else if (event.status === 'Sleeper Berth' && event.description?.includes('10-hour')) {
        tenHourResets++;
      } else if (event.status === 'Off Duty' && event.description?.includes('30-min')) {
        thirtyMinBreaks++;
      } else if (event.description?.includes('Fueling')) {
        fuelingStops++;
      }
    });
  });

  const totalStops = tenHourResets + thirtyMinBreaks + fuelingStops + 2; // +2 for pickup and dropoff

  // Calculate total trip duration
  const totalTripDuration = numberOfDays > 1 ? `${numberOfDays} days` : '1 day';

  return {
    totalMiles: Math.round(totalMiles),
    totalDrivingTime: Math.round(totalDrivingTime * 10) / 10,
    totalTripDuration,
    numberOfDays,
    tenHourResets,
    thirtyMinBreaks,
    fuelingStops,
    totalStops
  };
};

export const generateDetailedItinerary = (routeData) => {
  if (!routeData || !routeData.logs) return [];

  const itinerary = [];
  let eventCounter = 1;

  routeData.logs.forEach((log, dayIndex) => {
    log.events.forEach((event, eventIndex) => {
      const eventHours = event.duration / 3600;
      const startHour = Math.floor(event.start_time_hours || 0);
      const startMinute = Math.round(((event.start_time_hours || 0) - startHour) * 60);
      
      const dayNumber = dayIndex + 1;
      const timeString = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} ${startHour >= 12 ? 'PM' : 'AM'}`;
      
      let eventType = event.status;
      let description = event.description || event.status;
      let location = event.location || 'Unknown Location';

      // Map event types to more descriptive names following your specifications
      if (event.status === 'Driving') {
        eventType = 'Drive';
      } else if (event.status === 'Off Duty' && event.description?.includes('30-minute')) {
        eventType = '30-Minute Break';
        description = 'Mandatory 30-minute break required by HOS regulations';
      } else if (event.status === 'Sleeper Berth' || (event.status === 'Off Duty' && event.description?.includes('10-hour'))) {
        eventType = '10-Hour Reset';
        description = 'Mandatory 10-hour rest period required by HOS regulations';
      } else if (event.status === 'Off Duty' && event.description?.includes('34-hour')) {
        eventType = '34-Hour Restart';
        description = 'Mandatory 34-hour restart required by HOS regulations';
      } else if (event.description?.includes('Fueling')) {
        eventType = 'Fueling Stop';
        description = 'Scheduled fueling stop';
      } else if (event.description?.includes('Pickup')) {
        eventType = 'Load Cargo';
        description = 'Cargo pickup and loading';
      } else if (event.description?.includes('Dropoff')) {
        eventType = 'Unload Cargo';
        description = 'Cargo unloading at destination';
      } else if (event.description?.includes('Pre-Trip')) {
        eventType = 'Begin Trip';
        description = 'Pre-trip inspection and vehicle preparation';
      }

      // Create detailed itinerary entry following your specifications
      const itineraryEntry = {
        eventNumber: eventCounter++,
        type: eventType,
        startTime: `Day ${dayNumber}, ${timeString}`,
        duration: formatDuration(eventHours),
        location: location,
        description: description,
        route: event.description?.includes('Drive') ? event.description : null,
        distance: event.distance || null,
        hosStatus: event.hos_after || null,
        dayNumber: dayNumber,
        originalEvent: event
      };

      itinerary.push(itineraryEntry);
    });
  });

  return itinerary;
};

// Helper function to format duration properly
const formatDuration = (hours) => {
  if (hours >= 1) {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes > 0) {
      return `${wholeHours}h ${minutes}m`;
    } else {
      return `${wholeHours}h`;
    }
  } else {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }
};
