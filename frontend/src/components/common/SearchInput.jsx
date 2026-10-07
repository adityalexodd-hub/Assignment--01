import React from 'react';
import { Search } from 'lucide-react';

export const SearchInput = ({ value, onChange, placeholder = 'Search...' }) => {
  return (
    <div className="search-input-wrapper">
      <Search className="search-input-icon" size={16} />
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
