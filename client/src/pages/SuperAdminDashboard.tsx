import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar'

export default function SuperAdminDashboard() {
  const { logout } = useAuth();

  return (
    <div>
        <Navbar />
        <h1>Super Admin Dashboard</h1>
        <button onClick={() => logout()}>Log Out</button>
    </div>
  );
}