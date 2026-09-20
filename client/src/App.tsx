import Login from './pages/Login';
import { useAuth } from './context/AuthContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import OrgAdminDashboard from './pages/OrgAdminDashboard';
import TrekLeaderDashboard from './pages/TrekLeaderDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TripCoordinatorDashboard from './pages/TripCoordinatorDashboard';
import MedicalOfficerDashboard from './pages/MedicalOfficerDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import ParticipantDashboard from './pages/ParticipantDashboard';

function App() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) return <p>Loading...</p>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/login' element={<Login/>} />

        <Route path='/dashboard'>

          <Route
            path='org-admin'
            element={
              <ProtectedRoute allowedRoles={['OrgAdmin']}>
                <OrgAdminDashboard/>
              </ProtectedRoute>
            }
          />

          <Route 
            path='trek-leader'
            element={
              <ProtectedRoute allowedRoles={['TrekLeader']}>
                <TrekLeaderDashboard/>
              </ProtectedRoute>
            }
          />      

          <Route 
            path='super-admin'
            element={
              <ProtectedRoute allowedRoles={['SuperAdmin']}>
                <SuperAdminDashboard/>
              </ProtectedRoute>
            }
          /> 

          <Route 
            path='trip-coordinator'
            element={
              <ProtectedRoute allowedRoles={['TripCoordinator']}>
                <TripCoordinatorDashboard/>
              </ProtectedRoute>
            }
          /> 

          <Route 
            path='medical-officer'
            element={
              <ProtectedRoute allowedRoles={['MedicalOfficer']}>
                <MedicalOfficerDashboard/>
              </ProtectedRoute>
            }
          /> 

          <Route 
            path='volunteer'
            element={
              <ProtectedRoute allowedRoles={['Volunteer']}>
                <VolunteerDashboard/>
              </ProtectedRoute>
            }
          />
          
          <Route 
            path='participant'
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <ParticipantDashboard/>
              </ProtectedRoute>
            }
          />

        </Route>

        <Route path='/unauthorized' element={<h1>You are not authorized to view this page</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;