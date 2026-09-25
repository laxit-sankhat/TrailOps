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
      <h1>Super Admin Dashboard</h1>
      <h2>Create Organization</h2>
      <form onSubmit={handleSubmit}>
        <input name="orgName" placeholder="Organization Name" onChange={handleChange} />
        <input name="registrationDetails" placeholder="Registration Details" onChange={handleChange} />
        <input name="contactEmail" placeholder="Contact Email" onChange={handleChange} />
        <input name="address" placeholder="Address" onChange={handleChange} />
        <input name="orgAdminName" placeholder="Org Admin Name" onChange={handleChange} />
        <input name="orgAdminEmail" placeholder="Org Admin Email" onChange={handleChange} />
        <input name="orgAdminPassword" type="password" placeholder="Org Admin Password" onChange={handleChange} />
        <button type="submit">Create Organization</button>
      </form>
      {message && <p>{message}</p>}

      <h2>Platform Analytics</h2>
      {platformStats && (
        <ul>
          <li>Total Organizations: {platformStats.totalOrganizations}</li>
          <li>Total Trips: {platformStats.totalTrips}</li>
          <li>Total Bookings: {platformStats.totalBookings}</li>
        </ul>
      )}
    </div>
  );
}