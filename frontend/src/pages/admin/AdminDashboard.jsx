import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  FileText,
  Clock,
  CheckCircle,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { PageHeader } from '../../components/layout/PageHeader';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { RequestTable } from '../../components/requests/RequestTable';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';

export const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getAdminDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load IAM administrator metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <LoadingState message="Aggregating enterprise IAM metrics..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const { metrics, recentRequests, recentActivity } = data || {};

  return (
    <div>
      <PageHeader
        title="Identity & Access Governance Oversight"
        subtitle="System-wide access compliance, user directory, and security audit metrics"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Link to="/admin/requests" className="btn btn-secondary">
              All Requests
            </Link>
            <Link to="/admin/users" className="btn btn-primary">
              <Users size={16} /> Directory Management
            </Link>
          </div>
        }
      />

      <div className="metrics-grid">
        <MetricCard
          label="Total System Requests"
          value={metrics?.totalRequests}
          subtext={`${metrics?.pending ?? 0} currently pending`}
          icon={FileText}
        />
        <MetricCard
          label="Active Users"
          value={metrics?.activeUsers}
          subtext={`${metrics?.inactiveUsers ?? 0} deactivated`}
          icon={Users}
          color="#16a34a"
        />
        <MetricCard
          label="System Approval Rate"
          value={`${metrics?.approvalRate ?? 0}%`}
          subtext="Across all departments"
          icon={CheckCircle}
          color="#2563eb"
        />
        <MetricCard
          label="Avg Decision Latency"
          value={`${metrics?.averageDecisionHours ?? 0}h`}
          subtext="Turnaround time for reviews"
          icon={Clock}
          color="#b45309"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 24 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Recent System-Wide Requests</div>
              <div className="card-subtitle">Global live stream of submitted access requests</div>
            </div>
            <Link to="/admin/requests" style={{ fontSize: 13, fontWeight: 500 }}>
              View all →
            </Link>
          </div>

          <RequestTable
            requests={recentRequests}
            showRequester={true}
          />
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Security & Audit Activity</div>
              <div className="card-subtitle">Real-time governance audit log</div>
            </div>
            <Link to="/admin/audit" style={{ fontSize: 13, fontWeight: 500 }}>
              Audit trail →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentActivity?.map((act) => (
              <div
                key={act._id}
                style={{
                  padding: '10px 12px',
                  background: '#f8fafc',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, color: 'var(--brand-accent)' }}>{act.action}</span>
                  <span style={{ color: 'var(--text-light)', fontSize: 11 }}>
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ color: 'var(--text-main)', marginBottom: 2 }}>{act.description}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  Actor: {act.user?.name || 'System'} ({act.user?.role || 'Daemon'})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
