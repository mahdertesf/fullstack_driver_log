import React from 'react';
import HistoryDropdown from './HistoryDropdown';

const Header = ({ onHistorySelect, historyOpen, setIsOpen }) => {
  return (
    <header className="text-center mb-8 md:mb-12">
      {/* Logo and Title - Stack on mobile, side-by-side on larger screens */}
      <div className="flex flex-col md:flex-row items-center justify-center mb-6 space-y-4 md:space-y-0">
        <img src="/logo.png" alt="Company Logo" className="h-16 md:h-20 w-auto md:mr-6" />
        <div className="text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-teal-800 mb-2 md:mb-3">Driver Log Calculator</h1>
          <p className="text-base sm:text-lg lg:text-xl text-teal-600 px-4 md:px-0">Plan your trip and generate FMCSA compliant driver logs</p>
        </div>
      </div>
      
      {/* History Dropdown - Center on mobile, right-aligned on larger screens */}
      <div className="flex justify-center md:justify-end">
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
