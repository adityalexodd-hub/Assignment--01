import React, { useState, useEffect } from 'react';
import { auditService } from '../../services/dashboardService';
import { PageHeader } from '../../components/layout/PageHeader';
import { SearchInput } from '../../components/common/SearchInput';
import { Pagination } from '../../components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import { ShieldAlert, Terminal } from 'lucide-react';

export const AuditTrailPage = () => {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await auditService.getAuditLogs({
        page,
        limit: 15,
        search,
        action,
      });
      setLogs(res.data?.logs || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, action]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div>
      <PageHeader
        title="Enterprise Compliance Audit Trail"
        subtitle="Immutable security audit events: authorization actions, account creation, and approvals"
      />

      <form onSubmit={handleSearch} className="filter-bar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search descriptions, IP addresses, or IDs..."
        />

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 200 }}
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Audit Actions</option>
          <option value="REQUEST_CREATED">REQUEST_CREATED</option>
          <option value="REQUEST_APPROVED">REQUEST_APPROVED</option>
          <option value="REQUEST_REJECTED">REQUEST_REJECTED</option>
          <option value="REQUEST_CANCELLED">REQUEST_CANCELLED</option>
          <option value="USER_CREATED">USER_CREATED</option>
          <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
          <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
          <option value="USER_ACTIVATED">USER_ACTIVATED</option>
        </select>

        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      {loading ? (
        <LoadingState message="Loading immutable compliance trail..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchLogs} />
      ) : logs.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Entity</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: '2px 6px',
                          background: '#e2e8f0',
                          borderRadius: 3,
                          color: '#1e293b',
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.user?.name || 'System / Batch'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {log.user?.email || 'daemon'}
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {log.entityType}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-main)' }}>
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={meta?.page || page}
            totalPages={meta?.pages || meta?.totalPages || 1}
            totalItems={meta?.total || 0}
            limit={15}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        <EmptyState title="No audit records found" description="Adjust search criteria." />
      )}
    </div>
  );
};
