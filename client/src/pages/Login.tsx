import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type {Role} from '../types';
import { useNavigate, Link } from 'react-router-dom';

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
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  const validateLoginField = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : 'Enter a valid email address.';
    }
    return value.trim() ? '' : 'Password is required.';
  };

  const handleLoginBlur = (field: 'email' | 'password', value: string) => {
    setValidationErrors((current) => ({ ...current, [field]: validateLoginField(field, value) }));
  };

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

  const handleValidatedSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = {
      email: validateLoginField('email', email),
      password: validateLoginField('password', password)
    };
    setValidationErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    handleSubmit(e);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🌲</span>
          <h2>TrailOps Login</h2>
          <p className="auth-subtitle">Sign in to manage your trekking operations</p>
        </div>
        <form onSubmit={handleValidatedSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => handleLoginBlur('email', e.target.value)}
              aria-invalid={Boolean(validationErrors.email)}
              required
            />
            {validationErrors.email && <p className="field-error">{validationErrors.email}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={(e) => handleLoginBlur('password', e.target.value)}
              aria-invalid={Boolean(validationErrors.password)}
              required
            />
            {validationErrors.password && <p className="field-error">{validationErrors.password}</p>}
          </div>
          {error && <p className="alert alert-error">{error}</p>}
          <button type="submit" className="btn">Log In</button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.9rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>New participant? </span>
            <Link to="/register">Register here</Link>
          </div>
          <div>
            <Link to="/verify-certificate">Verify a Certificate</Link>
          </div>
          <div style={{ marginTop: '0.25rem' }}>
            <Link to="/" style={{ color: 'var(--text-muted)' }}>← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}