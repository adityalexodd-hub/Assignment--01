import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { notificationService } from '../../services/notificationService';

export const Topbar = () => {
  const [summary, setSummary] = useState({ unreadCount: 0, recent: [] });
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const loadSummary = async () => {
    try {
      const data = await notificationService.getSummary();
      setSummary(data || { unreadCount: 0, recent: [] });
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadSummary();
    const interval = setInterval(loadSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      loadSummary();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif._id);
        loadSummary();
      } catch (err) {
        console.error(err);
      }
    }
    setPanelOpen(false);
    if (notif.relatedRequest) {
      navigate(`/requests/${notif.relatedRequest}`);
    } else {
      navigate('/notifications');
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          Environment: <span style={{ color: '#16a34a', fontWeight: 600 }}>Production Replica</span>
        </span>
      </div>

      <div className="topbar-right">
        <div style={{ position: 'relative' }} ref={panelRef}>
          <button
            className="notif-bell-btn"
            onClick={() => setPanelOpen(!panelOpen)}
            title="Notifications"
          >
            <Bell size={18} />
            {summary.unreadCount > 0 && (
              <span className="notif-badge-count">
                {summary.unreadCount > 9 ? '9+' : summary.unreadCount}
              </span>
            )}
          </button>

          {panelOpen && (
            <div className="notif-panel">
              <div className="notif-panel-header">
                <span style={{ fontWeight: 600, fontSize: 13 }}>Notifications</span>
                {summary.unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-accent)',
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div className="notif-panel-list">
                {summary.recent?.length === 0 ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No notifications
                  </div>
                ) : (
                  summary.recent?.map((item) => (
                    <div
                      key={item._id}
                      className={`notif-item ${!item.isRead ? 'unread' : ''}`}
                      onClick={() => handleNotificationClick(item)}
                    >
                      <div className="notif-item-title">{item.title}</div>
                      <div className="notif-item-msg">{item.message}</div>
                      <div className="notif-item-time">
                        {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
                <button
                  onClick={() => {
                    setPanelOpen(false);
                    navigate('/notifications');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-accent)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
