import { useAuth } from '../context/AuthContext';

export default function VolunteerDashboard() {
  const { logout } = useAuth();

  return (
    <div>
      <h1>Volunteer Dashboard</h1>
      <button onClick={() => logout()}>Log Out</button>
    </div>
  );
}