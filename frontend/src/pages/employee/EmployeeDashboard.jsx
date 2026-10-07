import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { PageHeader } from '../../components/layout/PageHeader';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { RequestTable } from '../../components/requests/RequestTable';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import { useAuth } from '../../context/AuthContext';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getEmployeeDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load employee metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingState message="Aggregating employee access metrics..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const { metrics, recentRequests, systemBreakdown } = data || {};

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name}`}
        subtitle={`Employee IAM Portal • Department: ${user?.department || 'General'}`}
        actions={
          <Link to="/requests/new" className="btn btn-primary">
            <PlusCircle size={16} /> Raise Access Request
          </Link>
        }
      />

      <div className="metrics-grid">
        <MetricCard
          label="Total Requests"
          value={metrics?.totalRequests}
          subtext="Lifetime requests submitted"
          icon={FileText}
        />
        <MetricCard
          label="Pending Review"
          value={metrics?.pending}
          subtext="Awaiting manager/admin review"
          icon={Clock}
          color="#b45309"
        />
        <MetricCard
          label="Active Grants"
          value={metrics?.activeAccess}
          subtext="Current active privileges"
          icon={CheckCircle}
          color="#16a34a"
        />
        <MetricCard
          label="Approval Rate"
          value={`${metrics?.approvalRate ?? 0}%`}
          subtext="Decided requests approved"
          icon={TrendingUp}
          color="#2563eb"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Recent Access Requests</div>
              <div className="card-subtitle">Your latest access submissions and current states</div>
            </div>
            <Link to="/requests" style={{ fontSize: 13, fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          {recentRequests?.length > 0 ? (
            <RequestTable
              requests={recentRequests}
              showRequester={false}
              currentUserId={user?._id}
            />
          ) : (
            <EmptyState
              title="No access requests raised yet"
              description="Request access to corporate tools, cloud consoles, or internal databases."
              action={
                <Link to="/requests/new" className="btn btn-primary btn-sm">
                  Create First Request
                </Link>
              }
            />
          )}
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Systems Requested</div>
              <div className="card-subtitle">Breakdown of tools you have requested</div>
            </div>
          </div>

          {systemBreakdown?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {systemBreakdown.map((item) => (
                <div
                  key={item.system}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{item.system}</span>
                  <span className="badge badge-cancelled" style={{ fontWeight: 700 }}>
                    {item.count} {item.count === 1 ? 'req' : 'reqs'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
              No system activity recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
