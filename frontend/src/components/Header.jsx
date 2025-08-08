import React from 'react';
import HistoryDropdown from './HistoryDropdown';

const Header = ({ onHistorySelect, historyOpen, setIsOpen }) => {
  return (
    <header className="text-center mb-12">
      <div className="flex items-center justify-center mb-6">
        <img src="/logo.png" alt="Company Logo" className="h-20 w-auto mr-6" />
        <div>
          <h1 className="text-5xl font-bold text-teal-800 mb-3">Driver Log Calculator</h1>
          <p className="text-xl text-teal-600">Plan your trip and generate FMCSA compliant driver logs</p>
        </div>
      </div>
      
      {/* History Dropdown */}
      <div className="flex justify-end">
        <HistoryDropdown 
          onHistorySelect={onHistorySelect}
          isOpen={historyOpen}
          setIsOpen={setIsOpen}
        />
      </div>
    </header>
  );
};

export default Header;
