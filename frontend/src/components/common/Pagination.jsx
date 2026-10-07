import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ page, totalPages, totalItems, limit, onPageChange }) => {
  if (!totalPages || totalPages <= 1) return null;

  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalItems);

  return (
    <div className="pagination">
      <div>
        Showing <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{startItem}</span> to{' '}
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{endItem}</span> of{' '}
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{totalItems}</span> results
      </div>
      <div className="pagination-controls">
        <button
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <span style={{ fontSize: 12, padding: '0 8px' }}>
          Page {page} of {totalPages}
        </span>
        <button
          className="btn btn-secondary btn-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};
