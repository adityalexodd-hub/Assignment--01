import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { PageHeader } from '../../components/layout/PageHeader';
import { User, Shield, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateUserProfile } = useAuth();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    jobTitle: user?.jobTitle || '',
    department: user?.department || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    try {
      const updated = await userService.updateUser(user._id, profileData);
      updateUserProfile(updated);
      setProfileSuccess('Profile updated successfully');
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      await authService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password');
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <PageHeader
        title="User Account & Security Profile"
        subtitle="Manage your personal information, department designation, and authentication password"
      />

      {/* Account Overview Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Corporate Identity Summary</div>
          <span className="badge badge-approved">Active Identity</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Corporate Email</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{user?.email}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assigned IAM Role</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2, textTransform: 'capitalize' }}>
              {user?.role}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Department Scope</div>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{user?.department}</div>
          </div>
        </div>
      </div>

      {/* Profile Details Edit */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Personal Information</div>
        </div>

        {profileSuccess && (
          <div style={{ padding: 10, background: '#dcfce7', color: '#15803d', borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
            {profileSuccess}
          </div>
        )}
        {profileError && (
          <div style={{ padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
            {profileError}
          </div>
        )}

        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Job Title</label>
            <input
              type="text"
              className="form-input"
              value={profileData.jobTitle}
              onChange={(e) => setProfileData({ ...profileData, jobTitle: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary">
            Save Profile Changes
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Update Password</div>
        </div>

        {passwordSuccess && (
          <div style={{ padding: 10, background: '#dcfce7', color: '#15803d', borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
            {passwordSuccess}
          </div>
        )}
        {passwordError && (
          <div style={{ padding: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input
              type="password"
              className="form-input"
              required
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                required
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                required
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-secondary">
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
};
