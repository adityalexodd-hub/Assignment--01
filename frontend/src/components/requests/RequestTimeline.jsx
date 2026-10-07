import React from 'react';
import { Check, Clock, X, AlertTriangle } from 'lucide-react';

export const RequestTimeline = ({ request }) => {
  if (!request) return null;

  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';
  const isCancelled = request.status === 'cancelled';
  const isExpired = request.status === 'expired';
  const isPending = request.status === 'pending';

  return (
    <div className="timeline">
      {/* 1. Submission */}
      <div className="timeline-item">
        <div className="timeline-dot done">
          <Check size={12} />
        </div>
        <div className="timeline-content">
          <div className="timeline-title">Request Submitted</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Submitted by <strong>{request.employee?.name || 'Requester'}</strong> for {request.system} ({request.accessLevel})
          </p>
          <div className="timeline-date">
            {new Date(request.createdAt).toLocaleString()}
          </div>
        </div>
      </div>

      {/* 2. Review Stage */}
      {isPending && (
        <div className="timeline-item">
          <div className="timeline-dot current">
            <Clock size={12} />
          </div>
          <div className="timeline-content">
            <div className="timeline-title">Pending Governance Review</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Awaiting review and decision from department manager or IAM administrator.
            </p>
          </div>
        </div>
      )}

      {/* 3. Decision Stage */}
      {isApproved && (
        <div className="timeline-item">
          <div className="timeline-dot done">
            <Check size={12} />
          </div>
          <div className="timeline-content">
            <div className="timeline-title" style={{ color: '#16a34a' }}>Access Granted & Approved</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Approved by <strong>{request.approvedBy?.name || 'Reviewer'}</strong>.
              {request.expiresAt && (
                <span> Valid until: {new Date(request.expiresAt).toLocaleDateString()}.</span>
              )}
            </p>
            <div className="timeline-date">
              {request.approvedAt ? new Date(request.approvedAt).toLocaleString() : ''}
            </div>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="timeline-item">
          <div className="timeline-dot rejected">
            <X size={12} />
          </div>
          <div className="timeline-content" style={{ borderColor: '#fca5a5' }}>
            <div className="timeline-title" style={{ color: '#dc2626' }}>Request Rejected</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Rejected by <strong>{request.rejectedBy?.name || 'Reviewer'}</strong>.
            </p>
            {request.rejectionReason && (
              <div style={{ marginTop: 6, padding: '8px 12px', background: '#fee2e2', borderRadius: 'var(--radius-sm)', fontSize: 12.5, color: '#991b1b' }}>
                <strong>Reason:</strong> {request.rejectionReason}
              </div>
            )}
            <div className="timeline-date">
              {request.rejectedAt ? new Date(request.rejectedAt).toLocaleString() : ''}
            </div>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="timeline-item">
          <div className="timeline-dot">
            <X size={12} />
          </div>
          <div className="timeline-content">
            <div className="timeline-title">Request Cancelled</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Cancelled by requester or administrator before review.
            </p>
            <div className="timeline-date">
              {request.cancelledAt ? new Date(request.cancelledAt).toLocaleString() : ''}
            </div>
          </div>
        </div>
      )}

      {isExpired && (
        <div className="timeline-item">
          <div className="timeline-dot">
            <AlertTriangle size={12} />
          </div>
          <div className="timeline-content">
            <div className="timeline-title">Access Expired</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              The granted duration has elapsed and privileges have ended.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
