import { use, useState, useEffect } from 'react';
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
    <form onSubmit={handleSubmit}>
      <h2>TrailOps Login</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button type="submit">Log In</button>
    </form>
  );
}