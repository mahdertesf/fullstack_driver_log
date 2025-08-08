import React from 'react';

const EmptyState = () => {
  return (
    <div className="flex items-center justify-center h-96 bg-white rounded-xl shadow-lg border-2 border-dashed border-cyan-200">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 text-cyan-400 mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-teal-800 mb-2">Ready to Calculate Route</h3>
        <p className="text-cyan-600">Fill out the form on the left to generate your driver logs</p>
      </div>
    </div>
  );
};

export default EmptyState;
