import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { createTrip, getTripsByOrg } from '../services/tripService';
import { createBatch } from '../services/batchService';
import { createBatchAssignment } from '../services/batchAssignmentService';
import { createGearItem } from '../services/gearService';

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

  return (
    <div>
      <Navbar />
      <h1>Org Admin Dashboard</h1>

      <h2>Existing Trips</h2>
      <ul>
        {trips.map((trip) => (
          <li key={trip._id}>{trip.name} — {trip._id}</li>
        ))}
      </ul>

      <h2>Create Trip</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Trip Name" onChange={handleChange} />
        <input name="location" placeholder="Location" onChange={handleChange} />
        <input name="description" placeholder="Description" onChange={handleChange} />
        <select name="difficultyLevel" onChange={handleChange}>
          <option value="Easy">Easy</option>
          <option value="Moderate">Moderate</option>
          <option value="Difficult">Difficult</option>
        </select>
        <input name="durationDays" type="number" placeholder="Duration (days)" onChange={handleChange} />
        <input name="startDate" type="date" onChange={handleChange} />
        <input name="endDate" type="date" onChange={handleChange} />
        <input name="basePrice" type="number" placeholder="Base Price" onChange={handleChange} />
        <button type="submit">Create Trip</button>
      </form>
      {message && <p>{message}</p>}

      <h2>Create Batch</h2>
      <form onSubmit={handleBatchSubmit}>
        <input name="tripId" placeholder="Trip ID" onChange={handleBatchChange} />
        <input name="batchName" placeholder="Batch Name" onChange={handleBatchChange} />
        <input name="startDate" type="date" onChange={handleBatchChange} />
        <input name="endDate" type="date" onChange={handleBatchChange} />
        <input name="maxCapacity" type="number" placeholder="Max Capacity" onChange={handleBatchChange} />
        <button type="submit">Create Batch</button>
      </form>
      {batchMessage && <p>{batchMessage}</p>}

      <h2>Assign Trek Leader / Volunteer to Batch</h2>
      <form onSubmit={handleAssignSubmit}>
        <input name="batchId" placeholder="Batch ID" onChange={handleAssignChange} />
        <input name="userId" placeholder="User ID (Trek Leader/Volunteer)" onChange={handleAssignChange} />
        <select name="roleInBatch" onChange={handleAssignChange}>
          <option value="TrekLeader">Trek Leader</option>
          <option value="Volunteer">Volunteer</option>
        </select>
        <input name="supervisingTrekLeaderId" placeholder="Supervising Trek Leader ID (Volunteer only)" onChange={handleAssignChange} />
        <button type="submit">Assign</button>
      </form>
      {assignMessage && <p>{assignMessage}</p>}

      <h2>Create Gear Item</h2>
      <form onSubmit={handleGearSubmit}>
        <input name="name" placeholder="Item Name" onChange={handleGearChange} />
        <input name="category" placeholder="Category" onChange={handleGearChange} />
        <input name="quantity" type="number" placeholder="Quantity" onChange={handleGearChange} />
        <input name="condition" placeholder="Condition" onChange={handleGearChange} />
        <input name="dailyLateFeeRate" type="number" placeholder="Daily Late Fee" onChange={handleGearChange} />
        <input name="minorDamageFee" type="number" placeholder="Minor Damage Fee" onChange={handleGearChange} />
        <input name="moderateDamageFee" type="number" placeholder="Moderate Damage Fee" onChange={handleGearChange} />
        <input name="severeDamageFee" type="number" placeholder="Severe Damage Fee" onChange={handleGearChange} />
        <input name="lostItemFee" type="number" placeholder="Lost Item Fee" onChange={handleGearChange} />
        <button type="submit">Create Gear Item</button>
      </form>
      {gearMessage && <p>{gearMessage}</p>}

    </div>
  );
}