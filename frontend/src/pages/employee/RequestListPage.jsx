import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Filter } from 'lucide-react';
import { requestService } from '../../services/requestService';
import { PageHeader } from '../../components/layout/PageHeader';
import { RequestTable } from '../../components/requests/RequestTable';
import { SearchInput } from '../../components/common/SearchInput';
import { Pagination } from '../../components/common/Pagination';
import { ApprovalModal } from '../../components/requests/ApprovalModal';
import { RejectModal } from '../../components/requests/RejectModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import { useAuth } from '../../context/AuthContext';
import { SYSTEMS } from '../../constants';

export const RequestListPage = ({ managerMode = false, adminMode = false }) => {
  const { user, isManager, isAdmin } = useAuth();

  const [requests, setRequests] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(managerMode ? 'pending' : '');
  const [priority, setPriority] = useState('');
  const [system, setSystem] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Modals for actions
  const [activeModal, setActiveModal] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page,
        limit,
        search,
        status,
        priority,
        system,
        ...(managerMode ? { scope: 'pending-review' } : {}),
      };

      const res = await requestService.getRequests(params);
      setRequests(res.data?.requests || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to fetch access requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, status, priority, system, managerMode]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleCancel = async (req) => {
    if (window.confirm(`Are you sure you want to cancel request ${req.requestNumber}?`)) {
      try {
        await requestService.cancelRequest(req._id, 'Cancelled by requester');
        fetchRequests();
      } catch (err) {
        alert(err.message || 'Failed to cancel request');
      }
    }
  };

  const handleApprove = async (requestId, note) => {
    await requestService.approveRequest(requestId, note);
    fetchRequests();
  };

  const handleReject = async (requestId, reason) => {
    await requestService.rejectRequest(requestId, reason);
    fetchRequests();
  };

  const pageTitle = adminMode
    ? 'All Access Requests (Global IAM)'
    : managerMode
    ? 'Department Review Queue'
    : 'My Access Requests';

  const pageSubtitle = adminMode
    ? 'Full visibility across all corporate access requests and authorizations'
    : managerMode
    ? `Pending access requests for ${user?.department || 'your team'} requiring approval`
    : 'Track the status and approvals of your tool and permission requests';

  return (
    <div>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          !managerMode && (
            <Link to="/requests/new" className="btn btn-primary">
              <PlusCircle size={16} /> New Request
            </Link>
          )
        }
      />

      {/* Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="filter-bar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by ID, justification, or system..."
        />

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 140 }}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 130 }}
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 150 }}
          value={system}
          onChange={(e) => {
            setSystem(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Systems</option>
          {SYSTEMS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button type="submit" className="btn btn-secondary">
          <Filter size={14} /> Filter
        </button>
      </form>

      {/* Requests Table */}
      {loading ? (
        <LoadingState message="Loading requests..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRequests} />
      ) : requests.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <RequestTable
            requests={requests}
            showRequester={managerMode || adminMode}
            canDecide={isManager || isAdmin}
            currentUserId={user?._id}
            onCancel={handleCancel}
            onApprove={(req) => setActiveModal({ type: 'approve', request: req })}
            onReject={(req) => setActiveModal({ type: 'reject', request: req })}
          />
          <Pagination
            page={meta?.page || page}
            totalPages={meta?.pages || meta?.totalPages || 1}
            totalItems={meta?.total || 0}
            limit={limit}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        <EmptyState
          title="No access requests match your criteria"
          description="Try clearing search filters or raise a new request if needed."
          action={
            !managerMode && (
              <Link to="/requests/new" className="btn btn-primary btn-sm">
                Create Access Request
              </Link>
            )
          }
        />
      )}

      {/* Action Modals */}
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
