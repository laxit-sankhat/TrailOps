import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { createTrip, getTripsByOrg } from '../services/tripService';
import { createBatch } from '../services/batchService';
import { createBatchAssignment } from '../services/batchAssignmentService';
import { createGearItem } from '../services/gearService';
import { completeBatch } from '../services/batchService';
import { getOrgStats } from '../services/analyticsService';

export default function OrgAdminDashboard() {

  const { user } = useAuth();

  const [trips, setTrips] = useState<any[]>([]);

  const [form, setForm] = useState({
    name: '', location: '', description: '', difficultyLevel: 'Easy',
    durationDays: 1, startDate: '', endDate: '', basePrice: 0
  });
  const [message, setMessage] = useState('');

  const fetchTrips = async () => {
    try {
      const response = await getTripsByOrg(user!.organizationId!);
      setTrips(response.data.trips);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTrip(form);
      setMessage('Trip created successfully');
      fetchTrips(); // refresh the list so the new trip shows immediately
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [batchForm, setBatchForm] = useState({
    tripId: '', batchName: '', startDate: '', endDate: '', maxCapacity: 10
  });
  const [batchMessage, setBatchMessage] = useState('');

  const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBatchForm({ ...batchForm, [e.target.name]: e.target.value });
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBatch(batchForm);
      setBatchMessage('Batch created successfully');
    } catch (err: any) {
      setBatchMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [assignForm, setAssignForm] = useState({ batchId: '', userId: '', roleInBatch: 'TrekLeader', supervisingTrekLeaderId: '' });
  const [assignMessage, setAssignMessage] = useState('');

  const handleAssignChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAssignForm({ ...assignForm, [e.target.name]: e.target.value });
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBatchAssignment(assignForm);
      setAssignMessage('Assignment created successfully');
    } catch (err: any) {
      setAssignMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [gearForm, setGearForm] = useState({
  name: '', category: '', quantity: 1, condition: 'Good',
  dailyLateFeeRate: 50, minorDamageFee: 200, moderateDamageFee: 500, severeDamageFee: 1000, lostItemFee: 5000
});

  const [gearMessage, setGearMessage] = useState('');

  const handleGearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGearForm({ ...gearForm, [e.target.name]: e.target.value });
  };

  const handleGearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGearItem(gearForm);
      setGearMessage('Gear item created successfully');
    } catch (err: any) {
      setGearMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [completeBatchId, setCompleteBatchId] = useState('');
  const [completeMessage, setCompleteMessage] = useState('');

  const handleCompleteBatch = async () => {
    try {
      await completeBatch(completeBatchId);
      setCompleteMessage('Batch marked as completed');
    } catch (err: any) {
      setCompleteMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const response = await getOrgStats();
      setStats(response.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Org Admin Dashboard</h1>

        <div className="card">
          <h2>Existing Trips</h2>
          {trips.length > 0 ? (
            <ul className="item-list">
              {trips.map((trip) => (
                <li key={trip._id}>
                  <div>
                    <strong>{trip.name}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {trip._id}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No trips created yet.</p>
          )}
        </div>

        <div className="card">
          <h2>Create Trip</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Trip Name</label>
              <input name="name" placeholder="Trip Name" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input name="location" placeholder="Location" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input name="description" placeholder="Description" onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Difficulty Level</label>
              <select name="difficultyLevel" onChange={handleChange}>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Difficult">Difficult</option>
              </select>
            </div>
            <div className="form-group">
              <label>Duration (days)</label>
              <input name="durationDays" type="number" placeholder="Duration (days)" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input name="startDate" type="date" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input name="endDate" type="date" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Base Price ($)</label>
              <input name="basePrice" type="number" placeholder="Base Price" onChange={handleChange} required />
            </div>
            <button type="submit" className="btn">Create Trip</button>
          </form>
          {message && (
            <p className={message.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {message}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Create Batch</h2>
          <form onSubmit={handleBatchSubmit}>
            <div className="form-group">
              <label>Trip ID</label>
              <input name="tripId" placeholder="Trip ID" onChange={handleBatchChange} required />
            </div>
            <div className="form-group">
              <label>Batch Name</label>
              <input name="batchName" placeholder="Batch Name" onChange={handleBatchChange} required />
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input name="startDate" type="date" onChange={handleBatchChange} required />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input name="endDate" type="date" onChange={handleBatchChange} required />
            </div>
            <div className="form-group">
              <label>Max Capacity</label>
              <input name="maxCapacity" type="number" placeholder="Max Capacity" onChange={handleBatchChange} required />
            </div>
            <button type="submit" className="btn">Create Batch</button>
          </form>
          {batchMessage && (
            <p className={batchMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {batchMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Assign Trek Leader / Volunteer to Batch</h2>
          <form onSubmit={handleAssignSubmit}>
            <div className="form-group">
              <label>Batch ID</label>
              <input name="batchId" placeholder="Batch ID" onChange={handleAssignChange} required />
            </div>
            <div className="form-group">
              <label>User ID (Staff)</label>
              <input name="userId" placeholder="User ID (Trek Leader/Volunteer)" onChange={handleAssignChange} required />
            </div>
            <div className="form-group">
              <label>Role in Batch</label>
              <select name="roleInBatch" onChange={handleAssignChange}>
                <option value="TrekLeader">Trek Leader</option>
                <option value="Volunteer">Volunteer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Supervising Trek Leader ID (Volunteer only)</label>
              <input name="supervisingTrekLeaderId" placeholder="Supervising Trek Leader ID" onChange={handleAssignChange} />
            </div>
            <button type="submit" className="btn">Assign to Batch</button>
          </form>
          {assignMessage && (
            <p className={assignMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {assignMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Create Gear Item</h2>
          <form onSubmit={handleGearSubmit}>
            <div className="form-group">
              <label>Item Name</label>
              <input name="name" placeholder="Item Name" onChange={handleGearChange} required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input name="category" placeholder="e.g. Tent, Backpack" onChange={handleGearChange} required />
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input name="quantity" type="number" placeholder="Quantity" onChange={handleGearChange} required />
            </div>
            <div className="form-group">
              <label>Condition</label>
              <input name="condition" placeholder="Condition (e.g. Good)" onChange={handleGearChange} required />
            </div>
            <div className="form-group">
              <label>Daily Late Fee ($)</label>
              <input name="dailyLateFeeRate" type="number" placeholder="Daily Late Fee" onChange={handleGearChange} />
            </div>
            <div className="form-group">
              <label>Minor Damage Fee ($)</label>
              <input name="minorDamageFee" type="number" placeholder="Minor Damage Fee" onChange={handleGearChange} />
            </div>
            <div className="form-group">
              <label>Moderate Damage Fee ($)</label>
              <input name="moderateDamageFee" type="number" placeholder="Moderate Damage Fee" onChange={handleGearChange} />
            </div>
            <div className="form-group">
              <label>Severe Damage Fee ($)</label>
              <input name="severeDamageFee" type="number" placeholder="Severe Damage Fee" onChange={handleGearChange} />
            </div>
            <div className="form-group">
              <label>Lost Item Fee ($)</label>
              <input name="lostItemFee" type="number" placeholder="Lost Item Fee" onChange={handleGearChange} />
            </div>
            <button type="submit" className="btn">Create Gear Item</button>
          </form>
          {gearMessage && (
            <p className={gearMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {gearMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Mark Batch Completed</h2>
          <div className="form-inline" style={{ marginTop: '0.5rem' }}>
            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Batch ID</label>
              <input placeholder="Enter Batch ID" value={completeBatchId} onChange={(e) => setCompleteBatchId(e.target.value)} />
            </div>
            <button onClick={handleCompleteBatch} className="btn">Mark Completed</button>
          </div>
          {completeMessage && (
            <p className={completeMessage.includes('completed') ? 'alert alert-success' : 'alert alert-error'}>
              {completeMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Organization Analytics</h2>
          {stats ? (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Total Trips</div>
                <div className="stat-value">{stats.totalTrips}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total Batches</div>
                <div className="stat-value">{stats.totalBatches}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total Bookings</div>
                <div className="stat-value">{stats.totalBookings}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Confirmed Bookings</div>
                <div className="stat-value">{stats.confirmedBookings}</div>
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