import React, { useState } from 'react';
import { X, XCircle } from 'lucide-react';

export const RejectModal = ({ isOpen, onClose, onConfirm, request }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('A rejection reason is mandatory for compliance audit');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onConfirm(request._id, rejectionReason.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <XCircle size={18} style={{ color: '#dc2626' }} />
            <div className="modal-title">Reject Access Request</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: 13.5, marginBottom: 16 }}>
              You are rejecting request <strong>{request.requestNumber}</strong> for{' '}
              <strong>{request.employee?.name || 'Requester'}</strong>.
            </p>

            {error && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-sm)', marginBottom: 12, fontSize: 12.5 }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Rejection Reason <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                required
                placeholder="State the technical or policy justification for rejecting this request..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="form-hint">
                This reason will be recorded in the audit log and delivered to the employee.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={submitting}>
              {submitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
