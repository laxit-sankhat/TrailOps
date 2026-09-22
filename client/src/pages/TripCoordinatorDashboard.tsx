import { useState } from 'react';
import Navbar from '../components/Navbar';
import { getParticipantsByBatch, confirmBooking } from '../services/bookingService';
import { allocateGear, returnGear } from '../services/gearService';

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

  const [allocForm, setAllocForm] = useState({ gearItemId: '', participantId: '', batchId: '', expectedReturnDate: '' });
  const [returnForm, setReturnForm] = useState({ allocationId: '', conditionOnReturn: 'Good' });
  const [gearMsg, setGearMsg] = useState('');

  const handleAllocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAllocForm({ ...allocForm, [e.target.name]: e.target.value });
  };

  const handleAllocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await allocateGear(allocForm);
      setGearMsg('Gear allocated successfully');
    } catch (err: any) {
      setGearMsg(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleReturnChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setReturnForm({ ...returnForm, [e.target.name]: e.target.value });
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await returnGear(returnForm.allocationId, { conditionOnReturn: returnForm.conditionOnReturn });
      setGearMsg(`Gear returned - fine: ${response.data.allocation.fineAmount}`);
    } catch (err: any) {
      setGearMsg(err.response?.data?.message || 'Something went wrong');
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

      <h2>Allocate Gear</h2>
      <form onSubmit={handleAllocSubmit}>
        <input name="gearItemId" placeholder="Gear Item ID" onChange={handleAllocChange} />
        <input name="participantId" placeholder="Participant ID" onChange={handleAllocChange} />
        <input name="batchId" placeholder="Batch ID" onChange={handleAllocChange} />
        <input name="expectedReturnDate" type="date" onChange={handleAllocChange} />
        <button type="submit">Allocate</button>
      </form>

      <h2>Return Gear</h2>
      <form onSubmit={handleReturnSubmit}>
        <input name="allocationId" placeholder="Allocation ID" onChange={handleReturnChange} />
        <select name="conditionOnReturn" onChange={handleReturnChange}>
          <option value="Good">Good</option>
          <option value="Minor">Minor Damage</option>
          <option value="Moderate">Moderate Damage</option>
          <option value="Severe">Severe Damage</option>
          <option value="Lost">Lost</option>
        </select>
        <button type="submit">Return Gear</button>
      </form>
      {gearMsg && <p>{gearMsg}</p>}
    </div>
  );
}