import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import AttendanceScanner from '../components/AttendanceScanner';
import { addVolunteerNote } from '../services/sosService';
import { markAttendanceManual } from '../services/attendanceService';
import { getMyBatchAssignments } from '../services/batchAssignmentService';
import { getCheckpointsByBatch } from '../services/checkpointService';
import type { BatchAssignmentSummary, CheckpointSummary } from '../types';

export default function VolunteerDashboard() {
  const [myBatches, setMyBatches] = useState<BatchAssignmentSummary[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointSummary[]>([]);
  const [manualForm, setManualForm] = useState({ participantId: '', checkpointId: '', batchId: '' });
  const [manualMessage, setManualMessage] = useState('');

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const response = await getMyBatchAssignments();
        setMyBatches(response.data.assignments || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadAssignments();
  }, []);

  const handleBatchSelect = async (batchId: string) => {
    setManualForm((previous) => ({ ...previous, batchId, checkpointId: '' }));
    setCheckpoints([]);
    if (!batchId) return;

    try {
      const response = await getCheckpointsByBatch(batchId);
      setCheckpoints(response.data.checkpoints || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
              <label>Batch</label>
              <select name="batchId" value={manualForm.batchId} onChange={(e) => handleBatchSelect(e.target.value)} required>
                <option value="">Select a Batch</option>
                {myBatches.map((assignment) => assignment.batchId && (
                  <option key={assignment._id} value={assignment.batchId._id}>{assignment.batchId.batchName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Checkpoint</label>
              <select name="checkpointId" value={manualForm.checkpointId} onChange={handleManualChange} disabled={!manualForm.batchId} required>
                <option value="">Select a Checkpoint</option>
                {checkpoints.map((checkpoint) => (
                  <option key={checkpoint._id} value={checkpoint._id}>{checkpoint.name}</option>
                ))}
              </select>
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