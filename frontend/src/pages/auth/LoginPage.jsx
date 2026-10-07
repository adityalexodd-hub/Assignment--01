import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderLock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo-badge">
            <FolderLock size={24} />
          </div>
          <h1 className="auth-title">AccessGuard IAM</h1>
          <p className="auth-subtitle">Corporate Access Request & Approval System</p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-md)',
              color: '#991b1b',
              fontSize: 13,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Corporate Email</label>
            <input
              type="email"
              className="form-input"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <div className="auth-demo-accounts">
          <div className="auth-demo-title">Quick Demo Login</div>
          <div className="auth-demo-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => handleQuickLogin('employee@example.com')}
            >
              Employee
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => handleQuickLogin('manager@example.com')}
            >
              Manager
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => handleQuickLogin('admin@example.com')}
            >
              Admin
            </button>
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            Password: <code>Password123!</code>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>
            Register employee access
          </Link>
        </div>
      </div>
    </div>
  );
};
