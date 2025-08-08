import React from 'react';
import Header from './Header';
import LeftSidebar from './LeftSidebar';
import RightContent from './RightContent';

const MainLayout = ({ 
  tripDetails, 
  setTripDetails, 
  onSubmit, 
  loading, 
  error, 
  onDismissError,
  routeData,
  downloading,
  setDownloading,
  onHistorySelect,
  historyOpen,
  setIsOpen
}) => {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Header 
          onHistorySelect={onHistorySelect}
          historyOpen={historyOpen}
          setIsOpen={setIsOpen}
        />

        {/* Main Content - Better responsive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <LeftSidebar 
            tripDetails={tripDetails}
            setTripDetails={setTripDetails}
            onSubmit={onSubmit}
            loading={loading}
            error={error}
            onDismissError={onDismissError}
          />
          <RightContent 
            routeData={routeData}
            downloading={downloading}
            setDownloading={setDownloading}
          />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
