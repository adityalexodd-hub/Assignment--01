import React from 'react';
import { Inbox, AlertCircle, Loader } from 'lucide-react';

export const EmptyState = ({ title = 'No records found', description, action }) => {
  return (
    <div className="empty-state">
      <Inbox className="empty-state-icon" />
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
        {title}
      </h3>
      {description && <p style={{ fontSize: 13, marginBottom: 16 }}>{description}</p>}
      {action}
    </div>
  );
};

export const LoadingState = ({ message = 'Loading data...' }) => {
  return (
    <div className="loading-spinner-wrapper">
      <div className="spinner" />
      <span>{message}</span>
    </div>
  );
};

export const ErrorState = ({ message = 'An error occurred', onRetry }) => {
  return (
    <div className="empty-state" style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
      <AlertCircle className="empty-state-icon" style={{ color: '#dc2626' }} />
      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>
        Error loading content
      </h3>
      <p style={{ fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};
