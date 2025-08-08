import React, { useState } from 'react';
import { useTripCalculator } from './hooks/useTripCalculator';
import MainLayout from './components/MainLayout';
import './App.css';

function App() {
  const {
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
  } = useTripCalculator();

  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <MainLayout 
      tripDetails={tripDetails}
      setTripDetails={setTripDetails}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      onDismissError={clearError}
      routeData={routeData}
      downloading={downloading}
      setDownloading={setDownloading}
      onHistorySelect={handleHistorySelect}
      historyOpen={historyOpen}
      setIsOpen={setHistoryOpen}
    />
  );
}

export default App;