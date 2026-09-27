import { useState } from 'react';
import Navbar from '../components/Navbar';
import AttendanceScanner from '../components/AttendanceScanner';
import { createCheckpoint } from '../services/checkpointService';
import { triggerSOS, logIncident } from '../services/sosService';
import { postTrekStatusUpdate, getTrekStatusHistory } from '../services/trekStatusService';
import { markAttendanceManual } from '../services/attendanceService';

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

  const [manualForm, setManualForm] = useState({ participantId: '', checkpointId: '', batchId: '' });
  const [manualMessage, setManualMessage] = useState('');

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualForm({ ...manualForm, [e.target.name]: e.target.value });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await markAttendanceManual(manualForm);
      setManualMessage('Attendance marked successfully');
    } catch (err: any) {
      setManualMessage(err.response?.data?.message || 'Something went wrong');
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

  const [statusForm, setStatusForm] = useState({ batchId: '', milestone: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [statusHistory, setStatusHistory] = useState<any[]>([]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusForm({ ...statusForm, [e.target.name]: e.target.value });
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await postTrekStatusUpdate(statusForm);
      setStatusMessage('Status update posted');
      handleFetchHistory();
    } catch (err: any) {
      setStatusMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleFetchHistory = async () => {
    try {
      const response = await getTrekStatusHistory(statusForm.batchId);
      setStatusHistory(response.data.updates);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Trek Leader Dashboard</h1>

        <div className="card">
          <h2>Create Checkpoint</h2>
          <form onSubmit={handleCheckpointSubmit}>
            <div className="form-group">
              <label>Batch ID</label>
              <input name="batchId" placeholder="Batch ID" onChange={handleCheckpointChange} required />
            </div>
            <div className="form-group">
              <label>Checkpoint Name</label>
              <input name="name" placeholder="Checkpoint Name" onChange={handleCheckpointChange} required />
            </div>
            <div className="form-group">
              <label>Sequence Order</label>
              <input name="sequenceOrder" type="number" placeholder="Sequence Order (e.g. 1)" onChange={handleCheckpointChange} required />
            </div>
            <button type="submit" className="btn">Create Checkpoint</button>
          </form>
          {checkpointMessage && (
            <p className={checkpointMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {checkpointMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Scan Attendance</h2>
          <AttendanceScanner />
        </div>

        <div className="card">
          <h2>Manual Attendance</h2>
          <form onSubmit={handleManualSubmit}>
            <div className="form-group">
              <label>Participant ID</label>
              <input name="participantId" placeholder="Participant ID" value={manualForm.participantId} onChange={handleManualChange} required />
            </div>
            <div className="form-group">
              <label>Checkpoint ID</label>
              <input name="checkpointId" placeholder="Checkpoint ID" value={manualForm.checkpointId} onChange={handleManualChange} required />
            </div>
            <div className="form-group">
              <label>Batch ID</label>
              <input name="batchId" placeholder="Batch ID" value={manualForm.batchId} onChange={handleManualChange} required />
            </div>
            <button type="submit" className="btn">Mark Attendance (Manual)</button>
          </form>
          {manualMessage && (
            <p className={manualMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {manualMessage}
            </p>
          )}
        </div>

        <div className="card" style={{ borderColor: '#fecaca' }}>
          <h2 style={{ color: '#dc2626' }}>🚨 Trigger SOS Alert</h2>
          <form onSubmit={handleSosSubmit}>
            <div className="form-group">
              <label>Batch ID</label>
              <input name="batchId" placeholder="Batch ID" onChange={handleSosChange} required />
            </div>
            <div className="form-group">
              <label>Emergency Type</label>
              <input name="emergencyType" placeholder="e.g. Medical Emergency, Weather Evacuation" onChange={handleSosChange} required />
            </div>
            <button type="submit" className="btn btn-danger">Trigger SOS Alert</button>
          </form>
          {sosMessage && (
            <p className={sosMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {sosMessage}
            </p>
          )}
          {lastSosId && (
            <p className="alert alert-error" style={{ marginTop: '0.5rem' }}>
              Last SOS Alert ID: <strong>{lastSosId}</strong>
            </p>
          )}
        </div>

        <div className="card">
          <h2>Log Incident Report</h2>
          <form onSubmit={handleIncidentSubmit}>
            <div className="form-group">
              <label>SOS Alert ID (optional)</label>
              <input name="sosAlertId" placeholder="SOS Alert ID (if related)" onChange={handleIncidentChange} />
            </div>
            <div className="form-group">
              <label>Batch ID</label>
              <input name="batchId" placeholder="Batch ID" onChange={handleIncidentChange} required />
            </div>
            <div className="form-group">
              <label>Affected Participant ID</label>
              <input name="affectedParticipantId" placeholder="Affected Participant ID" onChange={handleIncidentChange} required />
            </div>
            <div className="form-group">
              <label>Incident Description</label>
              <textarea name="description" placeholder="Describe what occurred..." onChange={handleIncidentChange} required />
            </div>
            <div className="form-group">
              <label>Action Taken</label>
              <textarea name="actionTaken" placeholder="Describe immediate actions taken..." onChange={handleIncidentChange} required />
            </div>
            <button type="submit" className="btn">Log Incident</button>
          </form>
          {incidentMessage && (
            <p className={incidentMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {incidentMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Post Trek Status Update</h2>
          <form onSubmit={handleStatusSubmit}>
            <div className="form-group">
              <label>Batch ID</label>
              <input name="batchId" placeholder="Batch ID" onChange={handleStatusChange} required />
            </div>
            <div className="form-group">
              <label>Milestone</label>
              <input name="milestone" placeholder="e.g. Reached Base Camp, Weather Clear" onChange={handleStatusChange} required />
            </div>
            <button type="submit" className="btn">Post Update</button>
          </form>
          {statusMessage && (
            <p className={statusMessage.includes('posted') ? 'alert alert-success' : 'alert alert-error'}>
              {statusMessage}
            </p>
          )}

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Status History</h3>
          {statusHistory.length > 0 ? (
            <ul className="item-list">
              {statusHistory.map((u) => (
                <li key={u._id}>
                  <span><strong>{u.milestone}</strong></span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(u.timestamp).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No status history available.</p>
          )}
        </div>

      </div>
    </div>
  );
}