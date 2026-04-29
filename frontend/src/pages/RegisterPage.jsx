import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/ui/Icon';
import './AuthPages.css';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      navigate('/map', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <Icon name="signal_cellular_alt_2_bar" size={32} />
          <h1 className="text-headline-lg">Join RESPONDER</h1>
          <p className="text-body-md" style={{ color: 'var(--color-on-surface-variant)' }}>Register as a volunteer coordinator</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error"><Icon name="error" size={16} /> {error}</div>}
          <div className="form-field">
            <label className="text-label-bold" htmlFor="name">Full Name</label>
            <input className="input" id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" required />
          </div>
          <div className="form-field">
            <label className="text-label-bold" htmlFor="email">Email</label>
            <input className="input" id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="responder@rescue.org" required />
          </div>
          <div className="form-field">
            <label className="text-label-bold" htmlFor="password">Password</label>
            <input className="input" id="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
}
