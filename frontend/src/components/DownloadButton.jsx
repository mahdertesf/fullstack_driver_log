import React from 'react';
import { downloadLogSheetsFromComponents } from '../utils/frontendPdfUtils';

const DownloadButton = ({ routeData, downloading, setDownloading, graphicalLogRef }) => {
  const handleDownload = () => {
    if (!graphicalLogRef?.current) {
      alert('Log sheets are still loading. Please wait a moment and try again.');
      return;
    }
    downloadLogSheetsFromComponents(graphicalLogRef, routeData, setDownloading);
  };

  const isReady = routeData && routeData.logs && routeData.logs.length > 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-4">DOT Driver's Daily Log Sheets</h3>
        <p className="text-gray-600 mb-6">
          Download all {routeData?.logs?.length || 0} log sheet(s) as a single PDF file
        </p>
        <button
          onClick={handleDownload}
          disabled={downloading || !isReady}
          className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3 px-6 rounded-lg hover:from-teal-700 hover:to-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 font-semibold shadow-lg"
        >
          {downloading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Generating PDF...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Log Sheets ({routeData.logs?.length || 0} sheets)
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default DownloadButton;
