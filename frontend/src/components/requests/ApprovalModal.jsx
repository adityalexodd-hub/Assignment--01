import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

export const ApprovalModal = ({ isOpen, onClose, onConfirm, request }) => {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm(request._id, note);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={18} style={{ color: '#16a34a' }} />
            <div className="modal-title">Approve Access Request</div>
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
              You are approving <strong>{request.requestNumber}</strong> for{' '}
              <strong>{request.employee?.name || 'Requester'}</strong> to access{' '}
              <strong>{request.system}</strong> with <strong>{request.accessLevel}</strong> rights.
            </p>

            <div className="form-group">
              <label className="form-label">Approval Note (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Add audit notes, provision ticket IDs, or specific conditions..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={submitting}>
              {submitting ? 'Approving...' : 'Confirm Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
