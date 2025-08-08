import React from 'react';
import TripForm from './TripForm';
import ErrorDisplay from './ErrorDisplay';

const LeftSidebar = ({ tripDetails, setTripDetails, onSubmit, loading, error, onDismissError }) => {
  return (
    <div className="lg:col-span-1">
      <div className="lg:sticky lg:top-8">
        <TripForm 
          tripDetails={tripDetails}
          setTripDetails={setTripDetails}
          onSubmit={onSubmit}
          loading={loading}
        />

        <ErrorDisplay 
          error={error}
          onDismiss={onDismissError}
        />
      </div>
    </div>
  );
};

export default LeftSidebar;
