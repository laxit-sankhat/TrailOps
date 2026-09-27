import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { createOrganization } from '../services/organizationService';
import { getPlatformStats } from '../services/analyticsService';

export default function SuperAdminDashboard() {
  const [form, setForm] = useState({
    orgName: '', registrationDetails: '', contactEmail: '', address: '',
    orgAdminName: '', orgAdminEmail: '', orgAdminPassword: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOrganization(form);
      setMessage('Organization created successfully');
      fetchPlatformStats(); // refresh count immediately
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [platformStats, setPlatformStats] = useState<any>(null);

  const fetchPlatformStats = async () => {
    try {
      const response = await getPlatformStats();
      setPlatformStats(response.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Super Admin Dashboard</h1>

        <div className="card">
          <h2>Create Organization</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Organization Name</label>
              <input name="orgName" placeholder="Organization Name" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Registration Details</label>
              <input name="registrationDetails" placeholder="Registration Details" onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Contact Email</label>
              <input name="contactEmail" type="email" placeholder="contact@org.com" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input name="address" placeholder="Address" onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Org Admin Name</label>
              <input name="orgAdminName" placeholder="Admin Full Name" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Org Admin Email</label>
              <input name="orgAdminEmail" type="email" placeholder="admin@org.com" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Org Admin Password</label>
              <input name="orgAdminPassword" type="password" placeholder="Password" onChange={handleChange} required />
            </div>
            <button type="submit" className="btn">Create Organization</button>
          </form>
          {message && (
            <p className={message.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {message}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Platform Analytics</h2>
          {platformStats ? (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Total Organizations</div>
                <div className="stat-value">{platformStats.totalOrganizations}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total Trips</div>
                <div className="stat-value">{platformStats.totalTrips}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total Bookings</div>
                <div className="stat-value">{platformStats.totalBookings}</div>
              </div>
            </div>
          ) : (
            <p>Loading analytics...</p>
          )}
        </div>
      </div>
    </div>
  );
}