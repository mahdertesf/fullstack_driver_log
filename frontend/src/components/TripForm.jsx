import React, { useState, useMemo } from 'react';
import Select from 'react-select/async';
import { MapPin } from 'lucide-react';

const TripForm = ({ tripDetails, setTripDetails, onSubmit, loading }) => {

  // Map-based picking removed per request

  // OpenCage Geocoding API for location search
  const searchLocations = async (inputValue) => {
    if (!inputValue || inputValue.length < 2) {
      return [];
    }

    try {
      // Using OpenCage Geocoding API with better parameters
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(inputValue)}&countrycode=us&limit=15&no_annotations=1&language=en`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results.map(result => ({
          value: result.formatted,
          label: result.formatted,
          lat: result.geometry.lat,
          lng: result.geometry.lng,
          confidence: result.confidence
        }));
      }
    } catch (error) {
      console.log('OpenCage API error:', error.message);
    }

    // Fallback: Common US cities if API fails
    const fallbackCities = [
      'New York, NY, USA', 'Los Angeles, CA, USA', 'Chicago, IL, USA',
      'Houston, TX, USA', 'Phoenix, AZ, USA', 'Philadelphia, PA, USA',
      'San Antonio, TX, USA', 'San Diego, CA, USA', 'Dallas, TX, USA',
      'San Jose, CA, USA', 'Austin, TX, USA', 'Jacksonville, FL, USA',
      'Fort Worth, TX, USA', 'Columbus, OH, USA', 'Charlotte, NC, USA',
      'San Francisco, CA, USA', 'Indianapolis, IN, USA', 'Seattle, WA, USA',
      'Denver, CO, USA', 'Washington, DC, USA', 'Boston, MA, USA',
      'El Paso, TX, USA', 'Nashville, TN, USA', 'Detroit, MI, USA',
      'Oklahoma City, OK, USA', 'Portland, OR, USA', 'Las Vegas, NV, USA',
      'Memphis, TN, USA', 'Louisville, KY, USA', 'Baltimore, MD, USA',
      'Milwaukee, WI, USA', 'Albuquerque, NM, USA', 'Tucson, AZ, USA',
      'Fresno, CA, USA', 'Sacramento, CA, USA', 'Mesa, AZ, USA',
      'Kansas City, MO, USA', 'Atlanta, GA, USA', 'Long Beach, CA, USA',
      'Colorado Springs, CO, USA', 'Raleigh, NC, USA', 'Miami, FL, USA',
      'Virginia Beach, VA, USA', 'Omaha, NE, USA', 'Oakland, CA, USA',
      'Minneapolis, MN, USA', 'Tulsa, OK, USA', 'Arlington, TX, USA',
      'Tampa, FL, USA', 'New Orleans, LA, USA', 'Wichita, KS, USA',
      'Cleveland, OH, USA', 'Bakersfield, CA, USA', 'Aurora, CO, USA',
      'Anaheim, CA, USA', 'Honolulu, HI, USA', 'Santa Ana, CA, USA',
      'Corpus Christi, TX, USA', 'Riverside, CA, USA', 'Lexington, KY, USA',
      'Stockton, CA, USA', 'Henderson, NV, USA', 'Saint Paul, MN, USA',
      'St. Louis, MO, USA', 'Cincinnati, OH, USA', 'Pittsburgh, PA, USA',
      'Anchorage, AK, USA', 'Greensboro, NC, USA', 'Plano, TX, USA',
      'Newark, NJ, USA', 'Durham, NC, USA', 'Chula Vista, CA, USA',
      'Toledo, OH, USA', 'Fort Wayne, IN, USA', 'St. Petersburg, FL, USA',
      'Laredo, TX, USA', 'Jersey City, NJ, USA', 'Chandler, AZ, USA',
      'Madison, WI, USA', 'Lubbock, TX, USA', 'Scottsdale, AZ, USA',
      'Reno, NV, USA', 'Buffalo, NY, USA', 'Gilbert, AZ, USA',
      'Glendale, AZ, USA', 'North Las Vegas, NV, USA', 'Winston-Salem, NC, USA',
      'Chesapeake, VA, USA', 'Norfolk, VA, USA', 'Fremont, CA, USA',
      'Garland, TX, USA', 'Irving, TX, USA', 'Hialeah, FL, USA',
      'Spokane, WA, USA', 'Baton Rouge, LA, USA', 'Richmond, VA, USA',
      'Boise, ID, USA', 'Tacoma, WA, USA', 'San Bernardino, CA, USA'
    ];

    const filtered = fallbackCities.filter(city =>
      city.toLowerCase().includes(inputValue.toLowerCase())
    );

    return filtered.map(city => ({
      value: city,
      label: city
    }));
  };

  const loadOptions = (inputValue) => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const results = await searchLocations(inputValue);
        resolve(results);
      }, 300);
    });
  };

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      borderColor: state.isFocused ? '#0f766e' : '#e0f2fe',
      boxShadow: state.isFocused ? '0 0 0 1px #0f766e' : 'none',
      backgroundColor: state.isFocused ? '#f0fdfa' : 'white',
      '&:hover': {
        borderColor: '#0f766e',
        backgroundColor: '#f0fdfa'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#0f766e' : state.isFocused ? '#e0f2fe' : 'white',
      color: state.isSelected ? 'white' : '#374151',
      '&:hover': {
        backgroundColor: state.isSelected ? '#0f766e' : '#e0f2fe'
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#64748b'
    })
  };

  // Map-based picking removed per request

  const LocationSelect = ({ label, fieldName, placeholder }) => {
    const currentValue = useMemo(() => {
      const value = tripDetails[fieldName];
      if (!value) return null;
      
      return {
        value: value,
        label: value
      };
    }, [tripDetails[fieldName]]);

    return (
      <div>
        <label className="block text-sm font-semibold text-teal-800 mb-2">
          {label}
        </label>
        <Select
          value={currentValue}
          onChange={(selectedOption) => {
            setTripDetails(prev => ({
              ...prev,
              [fieldName]: selectedOption ? selectedOption.value : ''
            }));
          }}
          loadOptions={loadOptions}
          styles={customSelectStyles}
          placeholder={placeholder}
          isClearable
          isSearchable
          cacheOptions
          noOptionsMessage={() => "No locations found"}
          loadingMessage={() => "Searching OpenCage API..."}
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-xl border border-cyan-100 p-8 w-full">
      <h2 className="text-3xl font-bold text-teal-800 mb-8 text-center">Trip Details</h2>
      
      <form onSubmit={onSubmit} className="space-y-8">
        {/* Trip Information */}
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-lg p-6 border border-cyan-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-teal-100 rounded-lg">
              <MapPin className="w-6 h-6 text-teal-700" />
            </div>
            <h3 className="text-xl font-bold text-teal-800">Trip Information</h3>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-teal-800 mb-2">
                Cycle Hours Used *
              </label>
              <input
                type="number"
                value={tripDetails.cycle_hours_used || ''}
                onChange={(e) => setTripDetails(prev => ({ ...prev, cycle_hours_used: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-3 border border-cyan-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-white transition-colors"
                placeholder="Enter hours used in current cycle"
                min="0"
                max="70"
                step="0.5"
                required
              />
            </div>

            <LocationSelect 
              label="Start Location *" 
              fieldName="start_location"
              placeholder="Search for any US location..."
            />
            
            <LocationSelect 
              label="Pickup Location *" 
              fieldName="pickup_location"
              placeholder="Search for any US location..."
            />
            
            <LocationSelect 
              label="Dropoff Location *" 
              fieldName="dropoff_location"
              placeholder="Search for any US location..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3 px-6 rounded-lg hover:from-teal-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 font-semibold shadow-lg"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Calculating Route...
            </div>
          ) : (
            'Calculate Route & Generate Logs'
          )}
        </button>
      </form>

      {/* Map picker removed */}
    </div>
  );
};

export default TripForm;