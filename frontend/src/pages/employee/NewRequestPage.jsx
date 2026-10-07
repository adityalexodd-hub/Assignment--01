import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestService } from '../../services/requestService';
import { PageHeader } from '../../components/layout/PageHeader';
import { SYSTEMS, ACCESS_LEVELS, DURATIONS, PRIORITY } from '../../constants';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const NewRequestPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    system: 'GitHub',
    accessLevel: 'Member',
    accessLevelNote: '',
    duration: '30 days',
    priority: 'Medium',
    businessJustification: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.businessJustification.trim().length < 20) {
      setError('Business justification must be at least 20 characters long for compliance auditing.');
      return;
    }

    if (formData.accessLevel === 'Custom' && !formData.accessLevelNote.trim()) {
      setError('Please provide specific details for Custom access level.');
      return;
    }

    setLoading(true);
    try {
      const created = await requestService.createRequest(formData);
      navigate(`/requests/${created._id}`);
    } catch (err) {
      setError(err.message || 'Failed to submit access request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <PageHeader
        title="Raise Access Request"
        subtitle="Submit a governed privilege request for enterprise systems and services"
        actions={
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      <div className="card">
        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-md)',
              color: '#991b1b',
              fontSize: 13,
              marginBottom: 20,
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
          {/* Target System */}
          <div className="form-group">
            <label className="form-label">
              Target System / Service <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              name="system"
              className="form-select"
              value={formData.system}
              onChange={handleChange}
            >
              {SYSTEMS.map((sys) => (
                <option key={sys} value={sys}>
                  {sys}
                </option>
              ))}
            </select>
            <div className="form-hint">
              Privileged systems (AWS, Database, VPN) undergo strict two-person authorization.
            </div>
          </div>

          {/* Access Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">
                Requested Access Level <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                name="accessLevel"
                className="form-select"
                value={formData.accessLevel}
                onChange={handleChange}
              >
                {ACCESS_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Priority Tier <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                name="priority"
                className="form-select"
                value={formData.priority}
                onChange={handleChange}
              >
                {Object.values(PRIORITY).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.accessLevel === 'Custom' && (
            <div className="form-group">
              <label className="form-label">
                Custom Access Specifications <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="accessLevelNote"
                className="form-input"
                placeholder="Specify exact roles, policies, IAM groups, or repositories..."
                value={formData.accessLevelNote}
                onChange={handleChange}
              />
            </div>
          )}

          {/* Duration */}
          <div className="form-group">
            <label className="form-label">
              Access Duration / Retention <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              name="duration"
              className="form-select"
              value={formData.duration}
              onChange={handleChange}
            >
              {DURATIONS.map((dur) => (
                <option key={dur} value={dur}>
                  {dur}
                </option>
              ))}
            </select>
            <div className="form-hint">
              Follow principle of least privilege: temporary access expires automatically in MongoDB.
            </div>
          </div>

          {/* Justification */}
          <div className="form-group">
            <label className="form-label">
              Business Justification <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              name="businessJustification"
              className="form-textarea"
              rows={4}
              required
              placeholder="Explain why this access is required, relevant ticket numbers (Jira), project name, and business impact (min 20 characters)..."
              value={formData.businessJustification}
              onChange={handleChange}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span className="form-hint">Recorded into immutable security audit logs</span>
              <span style={{ fontSize: 11.5, color: formData.businessJustification.length < 20 ? '#dc2626' : '#16a34a' }}>
                {formData.businessJustification.length} / 1000 chars (min 20)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/requests')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Access Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
