import { useAuth } from '../context/AuthContext';

export default function TrekLeaderDashboard() {
  const { logout } = useAuth();

  return (
    <div>
      <h1>Trek Leader Dashboard</h1>
      <button onClick={() => logout()}>Log Out</button>
    </div>
  );
}