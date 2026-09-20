import { useAuth } from '../context/AuthContext';

export default function MedicalOfficerDashboard() {
  const { logout } = useAuth();

  return (
    <div>
      <h1>Medical Officer Dashboard</h1>
      <button onClick={() => logout()}>Log Out</button>
    </div>
  );
}