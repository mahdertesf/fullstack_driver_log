import React from 'react';
import ResultsSection from './ResultsSection';
import EmptyState from './EmptyState';

const RightContent = ({ routeData, downloading, setDownloading }) => {
  return (
    <div className="xl:col-span-2 space-y-8">
      {routeData ? (
        <ResultsSection 
          routeData={routeData}
          downloading={downloading}
          setDownloading={setDownloading}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
};

export default RightContent;
