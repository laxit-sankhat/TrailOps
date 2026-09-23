import { useState } from 'react';
import Navbar from '../components/Navbar';
import AttendanceScanner from '../components/AttendanceScanner';
import { addVolunteerNote } from '../services/sosService';

export default function VolunteerDashboard() {

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
      <h1>Volunteer Dashboard</h1>
      <h2>Scan Attendance</h2>
      <AttendanceScanner />

      <h2>Add Note to Incident</h2>
      <form onSubmit={handleNoteSubmit}>
        <input name="incidentId" placeholder="Incident ID" onChange={handleNoteChange} />
        <textarea name="notes" placeholder="Your Notes" onChange={handleNoteChange} />
        <button type="submit">Add Note</button>
      </form>
      {noteMessage && <p>{noteMessage}</p>}
    </div>
  );
}