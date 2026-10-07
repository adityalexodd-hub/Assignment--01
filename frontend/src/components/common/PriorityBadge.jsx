import React from 'react';

export const PriorityBadge = ({ priority }) => {
  const normPriority = (priority || 'Medium').toLowerCase();
  
  return (
    <span className={`priority-badge priority-${normPriority}`}>
      {priority || 'Medium'}
    </span>
  );
};
