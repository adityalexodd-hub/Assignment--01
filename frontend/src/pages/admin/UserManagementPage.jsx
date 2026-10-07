import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { PageHeader } from '../../components/layout/PageHeader';
import { SearchInput } from '../../components/common/SearchInput';
import { Pagination } from '../../components/common/Pagination';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/FeedbackStates';
import { UserPlus, Shield, UserCheck, UserX, Check, X } from 'lucide-react';
import { DEPARTMENTS, ROLES } from '../../constants';

export const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  // New User Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    department: 'Engineering',
    jobTitle: '',
    role: 'employee',
    password: 'Password123!',
  });
  const [createError, setCreateError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await userService.getUsers({
        page,
        limit: 10,
        search,
        department,
        role,
      });
      setUsers(res.data?.users || []);
      setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, department, role]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await userService.changeRole(userId, newRole);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleStatusChange = async (userId, currentActive) => {
    const action = currentActive ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      try {
        await userService.changeStatus(userId, !currentActive);
        fetchUsers();
      } catch (err) {
        alert(err.message || 'Failed to change status');
      }
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      await userService.createUser(newUserData);
      setCreateModalOpen(false);
      setNewUserData({
        name: '',
        email: '',
        department: 'Engineering',
        jobTitle: '',
        role: 'employee',
        password: 'Password123!',
      });
      fetchUsers();
    } catch (err) {
      setCreateError(err.message || 'Failed to create user');
    }
  };

  return (
    <div>
      <PageHeader
        title="Enterprise User Directory"
        subtitle="Manage user accounts, roles, access levels, and account status"
        actions={
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <UserPlus size={16} /> Provision New Account
          </button>
        }
      />

      {/* Filter Bar */}
      <form onSubmit={handleSearch} className="filter-bar">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or title..."
        />

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 160 }}
          value={department}
          onChange={(e) => {
            setDepartment(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: 'auto', minWidth: 140 }}
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Roles</option>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      {/* Users Table */}
      {loading ? (
        <LoadingState message="Loading directory..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUsers} />
      ) : users.length > 0 ? (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Department</th>
                  <th>Job Title</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </td>
                    <td>{u.department}</td>
                    <td>{u.jobTitle || 'N/A'}</td>
                    <td>
                      <select
                        className="form-select"
                        style={{ padding: '3px 8px', fontSize: 12, width: 'auto' }}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-approved' : 'badge-rejected'}`}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={`btn btn-sm ${u.isActive ? 'btn-secondary' : 'btn-success'}`}
                        onClick={() => handleStatusChange(u._id, u.isActive)}
                        title={u.isActive ? 'Deactivate Account' : 'Activate Account'}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
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
            limit={10}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      ) : (
        <EmptyState title="No users found" description="Try clearing search filters." />
      )}

      {/* Provision Account Modal */}
      {createModalOpen && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <div className="modal-title">Provision New Corporate Account</div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {createError && (
                  <div style={{ padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, marginBottom: 12, fontSize: 13 }}>
                    {createError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Corporate Email</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select
                      className="form-select"
                      value={newUserData.department}
                      onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">IAM Role</label>
                    <select
                      className="form-select"
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Job Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newUserData.jobTitle}
                    onChange={(e) => setNewUserData({ ...newUserData, jobTitle: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input
                    type="password"
                    className="form-input"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
