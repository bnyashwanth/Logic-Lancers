import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/ui/Icon';
import './AuthPages.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/map', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <Icon name="signal_cellular_alt_2_bar" size={32} />
          <h1 className="text-headline-lg">SMART RELIEF</h1>
          <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>Hyperlocal Disaster Coordination</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error"><Icon name="error" size={16} /> {error}</div>}
          <div className="form-field">
            <label className="text-label-bold" htmlFor="email">Email</label>
            <input className="input" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="volunteer@smartrelief.org" required />
          </div>
          <div className="form-field">
            <label className="text-label-bold" htmlFor="password">Password</label>
            <input className="input" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>
        <p className="auth-link">
          No account? <Link to="/register">Register as Volunteer</Link>
        </p>
      </div>
    </div>
  );
}
