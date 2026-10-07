import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { requestService } from '../../services/requestService';
import { PageHeader } from '../../components/layout/PageHeader';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { RequestTable } from '../../components/requests/RequestTable';
import { ApprovalModal } from '../../components/requests/ApprovalModal';
import { RejectModal } from '../../components/requests/RejectModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import { useAuth } from '../../context/AuthContext';

export const ManagerDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeModal, setActiveModal] = useState(null); // { type: 'approve' | 'reject', request: {...} }

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getManagerDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load manager metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleApprove = async (requestId, note) => {
    await requestService.approveRequest(requestId, note);
    fetchDashboard();
  };

  const handleReject = async (requestId, reason) => {
    await requestService.rejectRequest(requestId, reason);
    fetchDashboard();
  };

  if (loading) return <LoadingState message="Calculating departmental approval queues..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const { metrics, reviewQueue, department } = data || {};

  return (
    <div>
      <PageHeader
        title={`Manager Governance Hub — ${department}`}
        subtitle="Departmental access review queue and governance enforcement"
        actions={
          <Link to="/manager/requests" className="btn btn-secondary">
            Full Department Queue <ArrowRight size={14} />
          </Link>
        }
      />

      <div className="metrics-grid">
        <MetricCard
          label="Pending Review"
          value={metrics?.pendingReview}
          subtext="Requests awaiting your decision"
          icon={Clock}
          color="#b45309"
        />
        <MetricCard
          label="SLA Breaches (>48h)"
          value={metrics?.awaitingDecisionOver48h}
          subtext="Pending decision past SLA"
          icon={AlertTriangle}
          color="#dc2626"
        />
        <MetricCard
          label="Approved This Month"
          value={metrics?.approvedThisMonth}
          subtext="Grants authorized this month"
          icon={CheckCircle}
          color="#16a34a"
        />
        <MetricCard
          label="Team Size"
          value={metrics?.teamSize}
          subtext="Active employees in dept"
          icon={Users}
        />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Priority Review Queue</div>
            <div className="card-subtitle">
              Pending requests ordered by urgency and submission age (Separation of duties enforced)
            </div>
          </div>
          <Link to="/manager/requests" style={{ fontSize: 13, fontWeight: 500 }}>
            View all ({metrics?.pendingReview || 0}) →
          </Link>
        </div>

        {reviewQueue?.length > 0 ? (
          <RequestTable
            requests={reviewQueue}
            showRequester={true}
            canDecide={true}
            currentUserId={user?._id}
            onApprove={(req) => setActiveModal({ type: 'approve', request: req })}
            onReject={(req) => setActiveModal({ type: 'reject', request: req })}
          />
        ) : (
          <EmptyState
            title="Review Queue Clear"
            description="All employee access requests for your department have been reviewed."
          />
        )}
      </div>

      {/* Approval / Rejection Modals */}
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
