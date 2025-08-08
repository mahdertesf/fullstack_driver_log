import React, { useRef, useState } from 'react';
import MapView from './MapView';
import DetailedItinerary from './DetailedItinerary';
import GraphicalLog from './GraphicalLog';
import DownloadButton from './DownloadButton';
import { generateTripSummary, generateDetailedItinerary } from '../utils/tripUtils';

const ResultsSection = ({ routeData, downloading, setDownloading }) => {
  const tripSummary = routeData ? generateTripSummary(routeData) : null;
  const detailedItinerary = routeData ? generateDetailedItinerary(routeData) : null;
  const graphicalLogRef = useRef(null);
  
  const [focusedLocation, setFocusedLocation] = useState(null);
  
  const handleLocationClick = (location, coordinates, eventIndex = null) => {
    setFocusedLocation({
      location,
      coordinates,
      timestamp: Date.now(), // Force re-render even if same location
      eventIndex
    });
    
    const mapElement = document.getElementById('interactive-map');
    if (mapElement) {
      mapElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  };

  const handleMarkerClick = (location, coordinates, eventIndex = null) => {
    if (eventIndex !== null) {
      const itineraryElement = document.getElementById(`itinerary-event-${eventIndex}`);
      if (itineraryElement) {
        itineraryElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        itineraryElement.classList.add('ring-4', 'ring-teal-300', 'ring-opacity-75');
        setTimeout(() => {
          itineraryElement.classList.remove('ring-4', 'ring-teal-300', 'ring-opacity-75');
        }, 2000);
      }
    }
  };

  return (
    <>
      <MapView 
        routeData={routeData} 
        tripSummary={tripSummary}
        detailedItinerary={detailedItinerary}
        focusedLocation={focusedLocation}
        onMarkerClick={handleMarkerClick}
      />
      <DetailedItinerary 
        itinerary={detailedItinerary}
        tripSummary={tripSummary}
        routeData={routeData}
        onLocationClick={handleLocationClick}
      />
      <GraphicalLog 
        ref={graphicalLogRef}
        tripData={routeData}
      />
      <DownloadButton 
        routeData={routeData}
        downloading={downloading}
        setDownloading={setDownloading}
        graphicalLogRef={graphicalLogRef}
      />
    </>
  );
};

export default ResultsSection;
