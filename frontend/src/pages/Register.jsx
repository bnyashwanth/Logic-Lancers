import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passkeys do not match');
    }
    if (formData.password.length < 6) {
      return setError('Passkey must be at least 6 characters');
    }

    setLoading(true);
    const result = await registerUser({
      firstName: formData.firstName,
      lastName:  formData.lastName,
      email:     formData.email,
      password:  formData.password,
    });
    setLoading(false);

    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.msg || 'Registration failed');
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-8 py-32 block-low">
      <div className="bg-surface-lowest p-12 max-w-lg w-full shadow-ambient relative">
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary"></div>

        <h1 className="font-display text-4xl font-bold mb-2 tracking-tight">Volunteer Registration</h1>
        <p className="text-secondary mb-8 font-bold tracking-wider text-sm uppercase">Create your volunteer account</p>

        {error && (
          <div className="bg-primary text-on-primary p-4 mb-6 font-bold text-sm tracking-wider">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm tracking-wider uppercase" htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} className="input-brutalist" placeholder="John" required />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-bold text-sm tracking-wider uppercase" htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} className="input-brutalist" placeholder="Doe" required />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm tracking-wider uppercase" htmlFor="email">Email Address</label>
            <input type="email" id="email" value={formData.email} onChange={handleChange} className="input-brutalist" placeholder="yourname@gmail.com" required />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm tracking-wider uppercase" htmlFor="password">Password</label>
            <input type="password" id="password" value={formData.password} onChange={handleChange} className="input-brutalist" placeholder="Min. 6 characters" required />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-bold text-sm tracking-wider uppercase" htmlFor="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-brutalist" placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
            {loading ? 'COMMITTING...' : <span className="flex items-center justify-center gap-2">Create Account <ArrowRight size={20} strokeWidth={2.5} /></span>}
          </button>
        </form>

        <div className="mt-8 pt-8  ghost-border text-center">
          <p className="text-secondary font-bold text-sm ">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-secondary transition-colors">Sign-In</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
