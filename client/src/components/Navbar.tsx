import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">🌲</span>
        <span className="navbar-title">TrailOps</span>
      </div>
      <div className="navbar-user">
        {user?.fullName && <span className="navbar-name">{user.fullName}</span>}
        <span className="role-badge">{user?.role}</span>
        <button className="btn-logout" onClick={() => logout()}>Log Out</button>
      </div>
    </nav>
  );
}