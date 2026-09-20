import { useState } from 'react';
import Navbar from '../components/Navbar';
import { getParticipantsByBatch, confirmBooking } from '../services/bookingService';

export default function TripCoordinatorDashboard() {
  const [batchId, setBatchId] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const handleFetch = async () => {
    try {
      const response = await getParticipantsByBatch(batchId);
      setBookings(response.data.bookings);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleConfirm = async (bookingId: string) => {
    try {
      await confirmBooking(bookingId);
      setMessage('Booking confirmed');
      handleFetch(); // refresh list to show updated status
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div>
      <Navbar />
      <h1>Trip Coordinator Dashboard</h1>

      <input placeholder="Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
      <button onClick={handleFetch}>Load Bookings</button>

      {message && <p>{message}</p>}

      <ul>
        {bookings.map((b) => (
          <li key={b._id}>
            {b.participantId?.fullName} — {b.status}
            {b.status === 'MedicallyApproved' && (
              <button onClick={() => handleConfirm(b._id)}>Confirm</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}