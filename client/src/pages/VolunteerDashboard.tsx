import { useState } from 'react';
import Navbar from '../components/Navbar';
import AttendanceScanner from '../components/AttendanceScanner';
import { addVolunteerNote } from '../services/sosService';
import { markAttendanceManual } from '../services/attendanceService';

export default function VolunteerDashboard() {
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

  const [noteForm, setNoteForm] = useState({ incidentId: '', notes: '' });
  const [noteMessage, setNoteMessage] = useState('');

  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNoteForm({ ...noteForm, [e.target.name]: e.target.value });
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addVolunteerNote(noteForm.incidentId, noteForm.notes);
      setNoteMessage('Note added successfully');
    } catch (err: any) {
      setNoteMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Volunteer Dashboard</h1>

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

        <div className="card">
          <h2>Add Note to Incident</h2>
          <form onSubmit={handleNoteSubmit}>
            <div className="form-group">
              <label>Incident ID</label>
              <input name="incidentId" placeholder="Incident ID" onChange={handleNoteChange} required />
            </div>
            <div className="form-group">
              <label>Volunteer Notes</label>
              <textarea name="notes" placeholder="Add observations or notes..." onChange={handleNoteChange} required />
            </div>
            <button type="submit" className="btn">Add Note</button>
          </form>
          {noteMessage && (
            <p className={noteMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {noteMessage}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}