import Login from './pages/Login';
import { useAuth } from './context/AuthContext';

function App() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return <p>Loading...</p>;

  if (!user) return <Login />;

  return (
    <div>
      <h1>Welcome, {user.fullName}</h1>
      <p>Role: {user.role}</p>
      <button onClick={logout}>Log Out</button>
    </div>
  );
}

export default App;