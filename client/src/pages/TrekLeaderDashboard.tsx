import { useState } from 'react';
import Navbar from '../components/Navbar';
import AttendanceScanner from '../components/AttendanceScanner';
import { createCheckpoint } from '../services/checkpointService';
import { triggerSOS, logIncident } from '../services/sosService';

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

  const [sosForm, setSosForm] = useState({ batchId: '', emergencyType: '' });
  const [sosMessage, setSosMessage] = useState('');
  const [lastSosId, setLastSosId] = useState('');

  const handleSosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSosForm({ ...sosForm, [e.target.name]: e.target.value });
  };

  const handleSosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await triggerSOS(sosForm);
      setSosMessage('SOS triggered successfully');
      setLastSosId(response.data.sosAlert._id);
    } catch (err: any) {
      setSosMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [incidentForm, setIncidentForm] = useState({
    sosAlertId: '', batchId: '', affectedParticipantId: '', description: '', actionTaken: ''
  });
  const [incidentMessage, setIncidentMessage] = useState('');

  const handleIncidentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIncidentForm({ ...incidentForm, [e.target.name]: e.target.value });
  };

  const handleIncidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await logIncident(incidentForm);
      setIncidentMessage('Incident logged successfully');
    } catch (err: any) {
      setIncidentMessage(err.response?.data?.message || 'Something went wrong');
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

      <h2>Trigger SOS</h2>
      <form onSubmit={handleSosSubmit}>
        <input name="batchId" placeholder="Batch ID" onChange={handleSosChange} />
        <input name="emergencyType" placeholder="Emergency Type (e.g. Medical Emergency)" onChange={handleSosChange} />
        <button type="submit">Trigger SOS</button>
      </form>
      {sosMessage && <p>{sosMessage}</p>}
      {lastSosId && <p>Last SOS Alert ID: {lastSosId}</p>}

      <h2>Log Incident</h2>
      <form onSubmit={handleIncidentSubmit}>
        <input name="sosAlertId" placeholder="SOS Alert ID (optional)" onChange={handleIncidentChange} />
        <input name="batchId" placeholder="Batch ID" onChange={handleIncidentChange} />
        <input name="affectedParticipantId" placeholder="Affected Participant ID" onChange={handleIncidentChange} />
        <textarea name="description" placeholder="Description" onChange={handleIncidentChange} />
        <textarea name="actionTaken" placeholder="Action Taken" onChange={handleIncidentChange} />
        <button type="submit">Log Incident</button>
      </form>
      {incidentMessage && <p>{incidentMessage}</p>}
    </div>
  );
}