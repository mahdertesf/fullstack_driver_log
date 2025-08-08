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
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-teal-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Header 
          onHistorySelect={onHistorySelect}
          historyOpen={historyOpen}
          setIsOpen={setIsOpen}
        />

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
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
