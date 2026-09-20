import { useAuth } from '../context/AuthContext';

export default function ParicipantDashboard() {
  const { logout } = useAuth();

  return (
    <div>
      <h1>Paricipant Dashboard</h1>
      <button onClick={() => logout()}>Log Out</button>
    </div>
  );
}