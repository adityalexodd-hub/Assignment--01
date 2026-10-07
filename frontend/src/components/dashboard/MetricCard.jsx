import React from 'react';

export const MetricCard = ({ label, value, subtext, icon: Icon, color }) => {
  return (
    <div className="metric-card">
      <div>
        <div className="metric-label">{label}</div>
        <div className="metric-value">{value ?? 0}</div>
        {subtext && <div className="metric-subtext">{subtext}</div>}
      </div>
      {Icon && (
        <div className="metric-icon-box" style={color ? { color } : {}}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
};
