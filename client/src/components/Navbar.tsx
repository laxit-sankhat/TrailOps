import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #ccc' }}>
      <span>TrailOps — {user?.role}</span>
      <button onClick={() => logout()}>Log Out</button>
    </nav>
  );
}