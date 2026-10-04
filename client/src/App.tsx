import Home from './pages/Home';
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
import ParticipantExploreTripsPage from './pages/participant/ParticipantExploreTripsPage';
import ParticipantBookingsPage from './pages/participant/ParticipantBookingsPage';
import ParticipantTripsPage from './pages/participant/ParticipantTripsPage';
import ParticipantGroupsPage from './pages/participant/ParticipantGroupsPage';
import ParticipantMedicalPage from './pages/participant/ParticipantMedicalPage';
import ParticipantFeedbackPage from './pages/participant/ParticipantFeedbackPage';
import ParticipantProfilePage from './pages/participant/ParticipantProfilePage';
import Register from './pages/Register';
import VerifyCertificate from './pages/VerifyCertificate';
import OrgAdminRouteLayout from './components/org-admin/OrgAdminRouteLayout';
import ParticipantRouteLayout from './layouts/ParticipantRouteLayout';
import TripsPage from './pages/org-admin/TripsPage';
import BatchesPage from './pages/org-admin/BatchesPage';
import StaffPage from './pages/org-admin/StaffPage';
import GearPage from './pages/org-admin/GearPage';
import AnalyticsPage from './pages/org-admin/AnalyticsPage';
import FeedbackPage from './pages/org-admin/FeedbackPage';
import OrganizationPage from './pages/org-admin/OrganizationPage';
import TripDetailsPage from './pages/org-admin/TripDetailsPage';
import BatchDetailsPage from './pages/org-admin/BatchDetailsPage';
import StaffDetailsPage from './pages/org-admin/StaffDetailsPage';
import GearDetailsPage from './pages/org-admin/GearDetailsPage';

function App() {
  const { isLoading } = useAuth();

  if (isLoading) return <p>Loading...</p>;

  return (
    <BrowserRouter>
      <Routes>

        <Route path='/' element={<Home />} />

        <Route path='/register' element={<Register />} />

        <Route path='/verify-certificate' element={<VerifyCertificate />} />

        <Route path='/login' element={<Login />} />

        <Route path='/dashboard'>

          <Route
            path='org-admin'
            element={
              <ProtectedRoute allowedRoles={['OrgAdmin']}>
                <OrgAdminRouteLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OrgAdminDashboard />} />
            <Route path='trips' element={<TripsPage />} />
            <Route path='trips/:tripId' element={<TripDetailsPage />} />
            <Route path='batches' element={<BatchesPage />} />
            <Route path='batches/:batchId' element={<BatchDetailsPage />} />
            <Route path='staff' element={<StaffPage />} />
            <Route path='staff/:userId' element={<StaffDetailsPage />} />
            <Route path='gear' element={<GearPage />} />
            <Route path='gear/:gearItemId' element={<GearDetailsPage />} />
            <Route path='analytics' element={<AnalyticsPage />} />
            <Route path='feedback' element={<FeedbackPage />} />
            <Route path='organization' element={<OrganizationPage />} />
          </Route>

          <Route
            path='trek-leader'
            element={
              <ProtectedRoute allowedRoles={['TrekLeader']}>
                <TrekLeaderDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path='super-admin'
            element={
              <ProtectedRoute allowedRoles={['SuperAdmin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path='trip-coordinator'
            element={
              <ProtectedRoute allowedRoles={['TripCoordinator']}>
                <TripCoordinatorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path='medical-officer'
            element={
              <ProtectedRoute allowedRoles={['MedicalOfficer']}>
                <MedicalOfficerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path='volunteer'
            element={
              <ProtectedRoute allowedRoles={['Volunteer']}>
                <VolunteerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path='participant'
            element={
              <ProtectedRoute allowedRoles={['Participant']}>
                <ParticipantRouteLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ParticipantDashboard />} />
            <Route path='explore' element={<ParticipantExploreTripsPage />} />
            <Route path='bookings' element={<ParticipantBookingsPage />} />
            <Route path='trips' element={<ParticipantTripsPage />} />
            <Route path='groups' element={<ParticipantGroupsPage />} />
            <Route path='medical' element={<ParticipantMedicalPage />} />
            <Route path='feedback' element={<ParticipantFeedbackPage />} />
            <Route path='profile' element={<ParticipantProfilePage />} />
          </Route>

        </Route>

        <Route path='/unauthorized' element={<h1>You are not authorized to view this page</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;