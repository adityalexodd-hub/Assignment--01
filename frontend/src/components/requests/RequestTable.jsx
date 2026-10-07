import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RequestStatus } from '../common/RequestStatus';
import { PriorityBadge } from '../common/PriorityBadge';
import { CheckCircle, XCircle, Eye, AlertCircle } from 'lucide-react';

export const RequestTable = ({
  requests = [],
  showRequester = true,
  onApprove,
  onReject,
  onCancel,
  canDecide = false,
  currentUserId,
}) => {
  const navigate = useNavigate();

  if (!requests.length) {
    return null;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Request ID</th>
            {showRequester && <th>Requester</th>}
            <th>System</th>
            <th>Access Level</th>
            <th>Priority</th>
            <th>Duration</th>
            <th>Status</th>
            <th>Submitted</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => {
            const isOwner = req.employee?._id === currentUserId || req.employee === currentUserId;
            const isPending = req.status === 'pending';

            return (
              <tr key={req._id}>
                <td>
                  <span
                    style={{ fontWeight: 600, color: 'var(--brand-accent)', cursor: 'pointer' }}
                    onClick={() => navigate(`/requests/${req._id}`)}
                  >
                    {req.requestNumber}
                  </span>
                </td>
                {showRequester && (
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{req.employee?.name || 'Unknown'}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {req.employee?.department || req.department}
                      </div>
                    </div>
                  </td>
                )}
                <td>
                  <span style={{ fontWeight: 600 }}>{req.system}</span>
                </td>
                <td>
                  <span>{req.accessLevel}</span>
                  {req.accessLevelNote && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {req.accessLevelNote}
                    </div>
                  )}
                </td>
                <td>
                  <PriorityBadge priority={req.priority} />
                </td>
                <td>{req.duration}</td>
                <td>
                  <RequestStatus status={req.status} />
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      title="View Details"
                      onClick={() => navigate(`/requests/${req._id}`)}
                    >
                      <Eye size={13} /> View
                    </button>

                    {canDecide && isPending && !isOwner && (
                      <>
                        <button
                          className="btn btn-success btn-sm"
                          title="Approve"
                          onClick={() => onApprove && onApprove(req)}
                        >
                          <CheckCircle size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          title="Reject"
                          onClick={() => onReject && onReject(req)}
                        >
                          <XCircle size={13} />
                        </button>
                      </>
                    )}

                    {isOwner && isPending && onCancel && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#dc2626' }}
                        title="Cancel Request"
                        onClick={() => onCancel(req)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
