import { useState } from 'react';
import Navbar from '../components/Navbar';
import AttendanceScanner from '../components/AttendanceScanner';
import { createCheckpoint } from '../services/checkpointService';

export default function TrekLeaderDashboard() {
  const [checkpointForm, setCheckpointForm] = useState({ batchId: '', name: '', sequenceOrder: 1 });
  const [checkpointMessage, setCheckpointMessage] = useState('');

  const handleCheckpointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCheckpointForm({ ...checkpointForm, [e.target.name]: e.target.value });
  };

  const handleCheckpointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCheckpoint(checkpointForm);
      setCheckpointMessage('Checkpoint created successfully');
    } catch (err: any) {
      setCheckpointMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div>
      <Navbar />
      <h1>Trek Leader Dashboard</h1>

      <h2>Create Checkpoint</h2>
      <form onSubmit={handleCheckpointSubmit}>
        <input name="batchId" placeholder="Batch ID" onChange={handleCheckpointChange} />
        <input name="name" placeholder="Checkpoint Name" onChange={handleCheckpointChange} />
        <input name="sequenceOrder" type="number" placeholder="Sequence Order" onChange={handleCheckpointChange} />
        <button type="submit">Create Checkpoint</button>
      </form>
      {checkpointMessage && <p>{checkpointMessage}</p>}

      <h2>Scan Attendance</h2>
      <AttendanceScanner />
    </div>
  );
}