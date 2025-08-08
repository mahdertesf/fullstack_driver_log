import { useState } from 'react';
import { getErrorMessage, validateTripDetails } from '../utils/errorUtils';
import { API_BASE_URL } from '../utils/api';

// Default values (not visible on frontend)
const DEFAULT_VALUES = {
  driver_name: 'Mahder Tesfaye Abebe',
  driver_license: 'DL123456789',
  license_state: 'CA',
  carrier_name: 'Tesfaye Trucking Company',
  carrier_address: '1234 Trucking Lane, Los Angeles, CA 90210',
  truck_number: 'TT-2024-001',
  trailer_number: 'TR-2024-001',
  co_driver: 'John Smith',
  cargo_description: 'General freight and electronics',
  shipper: 'Tesfaye Logistics Inc.',
  consignee: 'Abebe Distribution Center'
};

export const useTripCalculator = () => {
  const [tripDetails, setTripDetails] = useState({
    start_location: '',
    pickup_location: '',
    dropoff_location: '',
    cycle_hours_used: 0
  });
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required fields
    const validationErrors = validateTripDetails(tripDetails);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      setLoading(false);
      return;
    }

    // Merge with default values before sending to API
    const submissionData = {
      ...DEFAULT_VALUES,
      ...tripDetails
    };

    try {
      const response = await fetch(`${API_BASE_URL}/calculate-trip/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();
      console.log('API Response:', data); // Debug log

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.error) {
        setError(getErrorMessage(data.error, response.status));
      } else {
        setRouteData(data);
      }
    } catch (err) {
      console.error('API Error:', err); // Debug log
      
      // Handle network errors
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else if (err.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(getErrorMessage(err.message, null));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHistorySelect = (historyData) => {
    // Update trip details with history data
    setTripDetails({
      start_location: historyData.history_entry.start_location,
      pickup_location: historyData.history_entry.pickup_location,
      dropoff_location: historyData.history_entry.dropoff_location,
      cycle_hours_used: historyData.history_entry.cycle_hours_used
    });
    
    // Set the route data
    setRouteData(historyData);
    
    // Clear any existing errors
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  return {
    tripDetails,
    setTripDetails,
    routeData,
    loading,
    error,
    downloading,
    setDownloading,
    handleSubmit,
    handleHistorySelect,
    clearError
  };
};
