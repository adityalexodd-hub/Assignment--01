import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Users,
  ShieldCheck,
  Bell,
  User,
  LogOut,
  FolderLock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = () => {
  const { user, logout, isEmployee, isManager, isAdmin } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <FolderLock size={18} />
        </div>
        <div>
          <div className="sidebar-title">AccessGuard</div>
          <div className="sidebar-subtitle">IAM Governance</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* Main Section */}
        <div className="nav-section-title">Overview</div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/requests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={18} />
          <span>Access Requests</span>
        </NavLink>
        <NavLink to="/requests/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <PlusCircle size={18} />
          <span>New Request</span>
        </NavLink>

        {/* Manager Section */}
        {(isManager || isAdmin) && (
          <>
            <div className="nav-section-title">Department Review</div>
            <NavLink to="/manager/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Manager Hub</span>
            </NavLink>
            <NavLink to="/manager/requests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>Review Queue</span>
            </NavLink>
          </>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="nav-section-title">Administration</div>
            <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={18} />
              <span>IAM Oversight</span>
            </NavLink>
            <NavLink to="/admin/requests" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <FileText size={18} />
              <span>All Requests</span>
            </NavLink>
            <NavLink to="/admin/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Users size={18} />
              <span>User Directory</span>
            </NavLink>
            <NavLink to="/admin/audit" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <ShieldCheck size={18} />
              <span>Audit Trail</span>
            </NavLink>
          </>
        )}

        {/* Account Section */}
        <div className="nav-section-title">Account</div>
        <NavLink to="/notifications" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Bell size={18} />
          <span>Notifications</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <User size={18} />
          <span>My Profile</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role-badge">{user?.role} • {user?.department}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
