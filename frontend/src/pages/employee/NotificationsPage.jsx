import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import { PageHeader } from '../../components/layout/PageHeader';
import { Pagination } from '../../components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import { Bell, Check, ExternalLink } from 'lucide-react';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationService.getNotifications({ page, limit: 15 });
      setNotifications(res.data?.notifications || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
    } catch (err) {
      alert(err.message || 'Failed to mark notifications as read');
    }
  };

  const handleClickItem = async (notif) => {
    if (!notif.isRead) {
      await notificationService.markAsRead(notif._id);
    }
    if (notif.relatedRequest) {
      navigate(`/requests/${notif.relatedRequest}`);
    } else {
      fetchNotifications();
    }
  };

  return (
    <div style={{ maxWidth: 840, margin: '0 auto' }}>
      <PageHeader
        title="Activity Notifications"
        subtitle="Live alerts for access request submissions, approvals, and decisions"
        actions={
          <button className="btn btn-secondary" onClick={handleMarkAllRead}>
            <Check size={14} /> Mark all read
          </button>
        }
      />

      {loading ? (
        <LoadingState message="Loading notifications..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchNotifications} />
      ) : notifications.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.map((n) => (
              <div
                key={n._id}
                onClick={() => handleClickItem(n)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-light)',
                  backgroundColor: n.isRead ? '#ffffff' : '#f0f7ff',
                  borderLeft: n.isRead ? '3px solid transparent' : '3px solid #2563eb',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-main)', marginBottom: 4 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-light)' }}>
                    {new Date(n.createdAt).toLocaleDateString()} at{' '}
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {n.relatedRequest && (
                  <span style={{ fontSize: 12, color: 'var(--brand-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    View Request <ExternalLink size={12} />
                  </span>
                )}
              </div>
            ))}
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
        <EmptyState title="No notifications" description="You have no notifications at this time." />
      )}
    </div>
  );
};
