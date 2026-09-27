import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type {Role} from '../types';
import { useNavigate } from 'react-router-dom';

const roleToDashboard: Record<Role, string> = {
  SuperAdmin: '/dashboard/super-admin',
  OrgAdmin: '/dashboard/org-admin',
  TripCoordinator: '/dashboard/trip-coordinator',
  MedicalOfficer: '/dashboard/medical-officer',
  TrekLeader: '/dashboard/trek-leader',
  Volunteer: '/dashboard/volunteer',
  Participant: '/dashboard/participant'
};

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // once `user` is populated after a successful login, redirect
   useEffect(() => {
    if (user) {
      navigate(roleToDashboard[user.role]);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🌲</span>
          <h2>TrailOps Login</h2>
          <p className="auth-subtitle">Sign in to manage your trekking operations</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="alert alert-error">{error}</p>}
          <button type="submit" className="btn">Log In</button>
        </form>
      </div>
    </div>
  );
}