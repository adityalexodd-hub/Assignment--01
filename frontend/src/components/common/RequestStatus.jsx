import React from 'react';

export const RequestStatus = ({ status }) => {
  const normStatus = (status || 'pending').toLowerCase();
  
  return (
    <span className={`badge badge-${normStatus}`}>
      {normStatus}
    </span>
  );
};
