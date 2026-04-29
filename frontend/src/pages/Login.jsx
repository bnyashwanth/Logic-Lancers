import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/map', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await loginUser(email, password);
    setLoading(false);
    if (result.success) {
      navigate(result.role === 'ADMIN' ? '/admin' : '/map', { replace: true });
    } else {
      setError(result.msg || 'AUTHORIZATION DENIED');
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-8 py-32 block-low">
      <div className="bg-surface-lowest p-12 max-w-md w-full shadow-ambient relative">
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary"></div>

        <h1 className="font-display text-4xl font-bold mb-2 tracking-tight">Volunteer's Login</h1>
        <p className="text-secondary mb-8 font-bold tracking-wider text-sm uppercase">Please enter your details</p>

        {error && (
          <div className="bg-primary text-on-primary p-4 mb-6 font-bold text-sm tracking-wider">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm tracking-wider uppercase" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-brutalist"
              placeholder="yourname@gmail.com"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm tracking-wider uppercase" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-brutalist"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
            {loading ? 'AUTHENTICATING...' : <span className="flex items-center justify-center gap-2">Login<ArrowRight size={20} strokeWidth={2.5} /></span>}
          </button>
        </form>

        <div className="mt-8 pt-8  ghost-border text-center">
          <p className="text-secondary font-bold text-sm mb-3">
            New volunteer?{' '}
            <Link to="/register" className="text-primary hover:text-secondary transition-colors">
              Create an account
            </Link>
          </p>
          <p className="text-secondary font-bold text-sm ">
            Need to review active incidents?{' '}
            <Link to="/map" className="text-primary hover:text-secondary transition-colors">
              Open Live Map
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
