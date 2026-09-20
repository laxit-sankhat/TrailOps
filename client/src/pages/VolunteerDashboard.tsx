import Navbar from '../components/Navbar';
import AttendanceScanner from '../components/AttendanceScanner';

export default function VolunteerDashboard() {
  return (
    <div>
      <Navbar />
      <h1>Volunteer Dashboard</h1>
      <h2>Scan Attendance</h2>
      <AttendanceScanner />
    </div>
  );
}