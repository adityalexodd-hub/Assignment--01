import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestService } from '../../services/requestService';
import { PageHeader } from '../../components/layout/PageHeader';
import { RequestStatus } from '../../components/common/RequestStatus';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { RequestTimeline } from '../../components/requests/RequestTimeline';
import { ApprovalModal } from '../../components/requests/ApprovalModal';
import { RejectModal } from '../../components/requests/RejectModal';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, CheckCircle, XCircle, Ban, Shield, Clock } from 'lucide-react';

export const RequestDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeModal, setActiveModal] = useState(null);

  const fetchRequest = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await requestService.getRequestById(id);
      setRequest(res.request);
      setPermissions(res.permissions);
    } catch (err) {
      setError(err.message || 'Failed to load access request details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleApprove = async (requestId, note) => {
    await requestService.approveRequest(requestId, note);
    fetchRequest();
  };

  const handleReject = async (requestId, reason) => {
    await requestService.rejectRequest(requestId, reason);
    fetchRequest();
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this pending access request?')) {
      try {
        await requestService.cancelRequest(request._id, 'Cancelled by user');
        fetchRequest();
      } catch (err) {
        alert(err.message || 'Failed to cancel request');
      }
    }
  };

  if (loading) return <LoadingState message="Loading access request details..." />;
  if (error) return <ErrorState message={error} onRetry={fetchRequest} />;
  if (!request) return null;

  const isPending = request.status === 'pending';
  const canDecide = permissions?.canApprove || permissions?.canReject;
  const canCancel = permissions?.canCancel;

  return (
    <div>
      <PageHeader
        title={`Access Request: ${request.requestNumber}`}
        subtitle={`Submitted on ${new Date(request.createdAt).toLocaleDateString()} • System: ${request.system}`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={14} /> Back
            </button>
            {canDecide && isPending && (
              <>
                <button
                  className="btn btn-success"
                  onClick={() => setActiveModal({ type: 'approve', request })}
                >
                  <CheckCircle size={15} /> Approve
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => setActiveModal({ type: 'reject', request })}
                >
                  <XCircle size={15} /> Reject
                </button>
              </>
            )}
            {canCancel && isPending && (
              <button className="btn btn-secondary" style={{ color: '#dc2626' }} onClick={handleCancel}>
                <Ban size={15} /> Cancel Request
              </button>
            )}
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left Column: Details */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Access Request Specification</div>
              <RequestStatus status={request.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Target System</label>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{request.system}</div>
              </div>

              <div>
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Access Level</label>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{request.accessLevel}</div>
                {request.accessLevelNote && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {request.accessLevelNote}
                  </div>
                )}
              </div>

              <div>
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Priority</label>
                <div>
                  <PriorityBadge priority={request.priority} />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Duration Granted</label>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{request.duration}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
              <label className="form-label" style={{ color: 'var(--text-muted)' }}>Business Justification</label>
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid var(--border-light)',
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: 'var(--text-main)',
                }}
              >
                {request.businessJustification}
              </div>
            </div>

            {request.rejectionReason && (
              <div style={{ marginTop: 16, padding: 14, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)' }}>
                <label className="form-label" style={{ color: '#991b1b' }}>Official Rejection Reason</label>
                <div style={{ color: '#7f1d1d', fontSize: 13.5 }}>{request.rejectionReason}</div>
              </div>
            )}
          </div>

          {/* Requester Identity Card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Employee Identity Details</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Requester Name</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>
                  {request.employee?.name || 'Unknown'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Corporate Email</div>
                <div style={{ fontWeight: 500, fontSize: 14, marginTop: 2 }}>
                  {request.employee?.email || 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Department</div>
                <div style={{ fontWeight: 500, fontSize: 14, marginTop: 2 }}>
                  {request.employee?.department || request.department || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline & Audit */}
        <div>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Governance Audit Timeline</div>
            </div>
            <RequestTimeline request={request} />
          </div>
        </div>
      </div>

      <ApprovalModal
        isOpen={activeModal?.type === 'approve'}
        request={activeModal?.request}
        onClose={() => setActiveModal(null)}
        onConfirm={handleApprove}
      />

      <RejectModal
        isOpen={activeModal?.type === 'reject'}
        request={activeModal?.request}
        onClose={() => setActiveModal(null)}
        onConfirm={handleReject}
      />
    </div>
  );
};
