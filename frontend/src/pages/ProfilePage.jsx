import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import { ADMIN_CREDENTIALS } from '../config/AdminCredentials';
import './ProfilePage.css';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, logout, login } = useAuth(); // Assume login is available for re-auth
  const navigate = useNavigate();
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  if (!user) return null;

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="profile-name">{user.name}</h1>
        <span className="profile-role-badge">{user.role}</span>
      </div>

      <div className="profile-content">
        <div className="profile-section">
          <h3 className="profile-section-title">Account Information</h3>
          <div className="profile-info-card">
            <div className="profile-info-row">
              <Icon name="mail" size={20} />
              <div className="profile-info-details">
                <span className="label">Email Address</span>
                <span className="value">{user.email}</span>
              </div>
            </div>
            <div className="profile-info-row">
              <Icon name="verified_user" size={20} />
              <div className="profile-info-details">
                <span className="label">Account Status</span>
                <span className="value">{user.isBanned ? 'Suspended' : 'Active'}</span>
              </div>
            </div>
          </div>
        </div>

        {user.role === 'ADMIN' ? (
          <div className="profile-section">
            <h3 className="profile-section-title">Administrative Tools</h3>
            <button className="btn btn-primary admin-login-btn" onClick={() => navigate('/admin')}>
              <Icon name="admin_panel_settings" size={20} />
              Enter Admin Command Center
            </button>
          </div>
        ) : (
          <div className="profile-section">
            <h3 className="profile-section-title">Admin Access</h3>
            {!showAdminForm ? (
              <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setShowAdminForm(true)}>
                Login to Admin Panel
              </button>
            ) : (
              <form className="admin-login-form" onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await api.post('/admin/auth', { email: adminEmail, password: adminPass });
                  if (res.data.success) {
                    sessionStorage.setItem('admin_authenticated', 'true');
                    alert("Admin access granted! Your role has been updated.");
                    window.location.reload();
                  }
                } catch (err) {
                  console.error('[ADMIN AUTH ERROR]', err.response?.data);
                  alert(err.response?.data?.message || "Verification failed");
                }
              }}>
                <input 
                  type="email" 
                  placeholder="Admin Email" 
                  className="profile-input" 
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
                <input 
                  type="password" 
                  placeholder="Admin Password" 
                  className="profile-input" 
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowAdminForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Login</button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="profile-actions">
          <button className="btn btn-outline logout-btn" onClick={() => {
            sessionStorage.removeItem('admin_authenticated');
            logout();
            navigate('/login');
          }}>
            <Icon name="logout" size={20} />
            Sign Out
          </button>
        </div>
      </div>

      <div className="profile-footer">
        <p>RESPONDER v1.0.4</p>
        <p>Logic Lancers • 2026</p>
      </div>
    </div>
  );
}
