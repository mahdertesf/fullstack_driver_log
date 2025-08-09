import React, { useState, useEffect } from 'react';
import { Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';

const HistoryDropdown = ({ onHistorySelect, isOpen, setIsOpen }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/history/`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch history');
      }
      
      setHistory(data);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Unable to load trip history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleHistoryClick = async (historyId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/${historyId}/`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load trip details');
      }
      
      onHistorySelect(data);
      setIsOpen(false);
    } catch (err) {
      console.error('Error loading history details:', err);
      setError('Unable to load trip details. Please try again.');
    }
  };

  const deleteHistory = async (historyId, event) => {
    event.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this trip from history? This cannot be undone.')) {
      return;
    }

    const previousHistory = history;
    setHistory(prev => prev.filter(entry => entry.id !== historyId));

    try {
      const response = await fetch(`${API_BASE_URL}/history/${historyId}/`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete trip');
      }
    } catch (err) {
      console.error('Error deleting history:', err);
      setHistory(previousHistory);
      alert('Failed to delete trip. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateLocation = (location, maxLength = 25, mobileMaxLength = 15) => {
    const isMobile = window.innerWidth < 640;
    const currentMaxLength = isMobile ? mobileMaxLength : maxLength;
    
    if (location.length <= currentMaxLength) return location;
    return location.substring(0, currentMaxLength) + '...';
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  return (
    <div className="relative ">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 bg-white text-teal-700 px-2 sm:px-4 py-2 rounded-lg border border-teal-200 hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors shadow-sm"
      >
        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="font-medium text-sm sm:text-base">History</span>
        {isOpen ? (
          <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
        ) : (
          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 sm:w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-[1000] max-h-40 sm:max-h-48 overflow-y-auto">
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">Trip History</h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Click on any trip to reload it</p>
                <p className="text-xs text-gray-600 sm:hidden">Tap to reload</p>
              </div>
              {history.length > 0 && (
                <button
                  onClick={async () => {
                    if (!window.confirm('Are you sure you want to delete ALL trips from history? This cannot be undone.')) return;
                    const prev = history;
                    setHistory([]);
                    try {
                      const resp = await fetch(`${API_BASE_URL}/history/`, { method: 'DELETE' });
                      if (!resp.ok) {
                        const data = await resp.json().catch(() => ({}));
                        throw new Error(data.error || 'Failed to delete all');
                      }
                    } catch (err) {
                      console.error('Error deleting all history:', err);
                      setHistory(prev);
                      alert('Failed to delete all trips. Please try again.');
                    }
                  }}
                  className="ml-2 text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium border border-red-200 hover:bg-red-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded flex-shrink-0"
                  title="Delete all history"
                >
                  <span className="hidden sm:inline">Delete all</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-2 ">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                <span className="ml-3 text-gray-600">Loading history...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <div className="text-red-600 text-sm">{error}</div>
                <button
                  onClick={fetchHistory}
                  className="mt-2 text-teal-600 hover:text-teal-800 text-sm font-medium"
                >
                  Try again
                </button>
              </div>
            ) : history.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No trip history found. Calculate your first route to see it here.
              </div>
            ) : (
              <div className="space-y-1 ">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className="group relative"
                  >
                    <button
                      onClick={() => handleHistoryClick(entry.id)}
                      className="w-full text-left p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200 pr-8 sm:pr-12"
                    >
                      <div className="flex justify-between items-start mb-1 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 mb-1 text-sm sm:text-base truncate">
                            {truncateLocation(entry.start_location)} → {truncateLocation(entry.pickup_location)} → {truncateLocation(entry.dropoff_location)}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600">
                            Cycle hours: {entry.cycle_hours_used}h
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatDate(entry.created_at)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 truncate sm:hidden">
                        {truncateLocation(entry.start_location, 20, 12)} → {truncateLocation(entry.pickup_location, 20, 12)} → {truncateLocation(entry.dropoff_location, 20, 12)}
                      </div>
                      <div className="text-xs text-gray-500 hidden sm:block">
                        {entry.start_location} → {entry.pickup_location} → {entry.dropoff_location}
                      </div>
                    </button>
                    
                    <button
                      onClick={(e) => deleteHistory(entry.id, e)}
                      className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete this trip from history"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="p-2 sm:p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="text-xs text-gray-500 text-center">
                <span className="hidden sm:inline">Showing last {history.length} trips • Click to reload any trip • Hover to delete</span>
                <span className="sm:hidden">{history.length} trips • Tap to reload • Tap trash to delete</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryDropdown;