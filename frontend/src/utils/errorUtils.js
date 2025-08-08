export const getErrorMessage = (error, status) => {
  // Handle specific error messages from backend
  if (error && typeof error === 'string') {
    if (error.includes('Location') && error.includes('could not be found')) {
      return 'One or more locations could not be found. Please check the spelling and try again.';
    }
    if (error.includes('route') || error.includes('distance')) {
      return 'Unable to calculate route between the specified locations. Please verify the addresses and try again.';
    }
    if (error.includes('API') || error.includes('service')) {
      return 'Map service is temporarily unavailable. Please try again in a few minutes.';
    }
    return error;
  }

  // Handle HTTP status codes
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication error. Please refresh the page and try again.';
    case 403:
      return 'Access denied. Please check your permissions.';
    case 404:
      return 'Service not found. Please contact support.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
    case 503:
    case 504:
      return 'Service temporarily unavailable. Please try again in a few minutes.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
};

export const validateTripDetails = (tripDetails) => {
  const errors = [];

  if (!tripDetails.start_location || !tripDetails.pickup_location || !tripDetails.dropoff_location) {
    errors.push('Please fill in all required location fields.');
  }

  if (tripDetails.cycle_hours_used < 0 || tripDetails.cycle_hours_used > 70) {
    errors.push('Cycle hours used must be between 0 and 70 hours.');
  }

  return errors;
};
