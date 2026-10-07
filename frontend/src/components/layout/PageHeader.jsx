import React from 'react';

export const PageHeader = ({ title, subtitle, actions }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
