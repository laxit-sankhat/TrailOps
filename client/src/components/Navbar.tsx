import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import ParticipantNavbar from './participant/ParticipantNavbar';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (user?.role === 'Participant' || location.pathname.startsWith('/dashboard/participant')) {
    return <ParticipantNavbar />;
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🌲</span>
        <span className="navbar-title">TrailOps</span>
      </div>
      <div className="navbar-user">
        {user && <NotificationBell />}
        {user?.fullName && <span className="navbar-name">{user.fullName}</span>}
        <span className="role-badge">{user?.role}</span>
        <button className="btn-logout" onClick={() => logout()}>Log Out</button>
      </div>
    </nav>
  );
}