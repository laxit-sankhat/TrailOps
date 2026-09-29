import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getParticipantsByBatch, confirmBooking } from '../services/bookingService';
import { allocateGear, returnGear, getMyOrgGear, getMyOrgAllocations } from '../services/gearService';
import { generateCertificate } from '../services/certificateService';
import { getMyOrgBatches } from '../services/batchService';
import type { BatchSummary } from '../types';

type GearOption = { _id: string; name: string };
type AllocationOption = {
  _id: string;
  gearItemId: { name: string } | null;
  participantId: { fullName: string } | null;
};
type ParticipantOption = {
  _id: string;
  status: string;
  participantId: { _id: string; fullName: string } | null;
};

export default function TripCoordinatorDashboard() {
  const [batchId, setBatchId] = useState('');
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [gearItems, setGearItems] = useState<GearOption[]>([]);
  const [allocations, setAllocations] = useState<AllocationOption[]>([]);
  const [allocationParticipants, setAllocationParticipants] = useState<ParticipantOption[]>([]);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await getMyOrgBatches();
        setBatches(response.data.batches || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBatches();
    const fetchGearData = async () => {
      try {
        const [gearResponse, allocationResponse] = await Promise.all([
          getMyOrgGear(),
          getMyOrgAllocations()
        ]);
        setGearItems(gearResponse.data.gearItems || []);
        setAllocations(allocationResponse.data.allocations || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchGearData();
  }, []);

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

  const handleAllocChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAllocForm({ ...allocForm, [e.target.name]: e.target.value });
  };

  const handleAllocBatchSelect = async (batchId: string) => {
    setAllocForm((current) => ({ ...current, batchId, participantId: '' }));
    setAllocationParticipants([]);
    if (!batchId) return;
    try {
      const response = await getParticipantsByBatch(batchId);
      setAllocationParticipants(response.data.bookings || []);
    } catch (err) {
      console.error(err);
    }
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
      const allocationsResponse = await getMyOrgAllocations();
      setAllocations(allocationsResponse.data.allocations || []);
    } catch (err: any) {
      setGearMsg(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [certBookingId, setCertBookingId] = useState('');
  const [certParticipantId, setCertParticipantId] = useState('');
  const [certMessage, setCertMessage] = useState('');

  const handleCertificateBatchSelect = async (selectedBatchId: string) => {
    setBatchId(selectedBatchId);
    setBookings([]);
    setCertBookingId('');
    setCertParticipantId('');
    if (!selectedBatchId) return;
    try {
      const response = await getParticipantsByBatch(selectedBatchId);
      setBookings(response.data.bookings || []);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Unable to load bookings');
    }
  };

  const handleCertificateBookingSelect = (bookingId: string) => {
    setCertBookingId(bookingId);
    const selectedBooking = bookings.find((booking) => booking._id === bookingId);
    setCertParticipantId(selectedBooking?.participantId?._id || '');
  };

  const handleGenerateCert = async () => {
    try {
      const response = await generateCertificate(certBookingId, certParticipantId || undefined);
      setCertMessage(`Certificate generated: ${response.data.certificate.pdfUrl}`);
    } catch (err: any) {
      setCertMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Trip Coordinator Dashboard</h1>

        <div className="card">
          <h2>Batch Bookings</h2>
          <div className="form-inline">
            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Batch</label>
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                <option value="">Select a Batch</option>
                {batches.map((batch) => (
                  <option key={batch._id} value={batch._id}>{batch.batchName}</option>
                ))}
              </select>
            </div>
            <button onClick={handleFetch} className="btn" disabled={!batchId}>Load Bookings</button>
          </div>

          {message && (
            <p className={message.includes('confirmed') ? 'alert alert-success' : 'alert alert-error'}>
              {message}
            </p>
          )}

          {bookings.length > 0 ? (
            <ul className="item-list" style={{ marginTop: '1.25rem' }}>
              {bookings.map((b) => (
                <li key={b._id}>
                  <div>
                    <strong>{b.participantId?.fullName || 'Participant'}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status: {b.status}</div>
                  </div>
                  {b.status === 'MedicallyApproved' && (
                    <button onClick={() => handleConfirm(b._id)} className="btn btn-sm">Confirm Booking</button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>No bookings loaded yet.</p>
          )}
        </div>

        <div className="card">
          <h2>Allocate Gear</h2>
          <form onSubmit={handleAllocSubmit}>
            <div className="form-group">
              <label>Gear Item</label>
              <select name="gearItemId" value={allocForm.gearItemId} onChange={handleAllocChange} required>
                <option value="">Select Gear</option>
                {gearItems.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Batch</label>
              <select name="batchId" value={allocForm.batchId} onChange={(e) => handleAllocBatchSelect(e.target.value)} required>
                <option value="">Select a Batch</option>
                {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.batchName}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Participant</label>
              <select name="participantId" value={allocForm.participantId} onChange={handleAllocChange} disabled={!allocForm.batchId} required>
                <option value="">Select a Participant</option>
                {allocationParticipants.filter((booking) => booking.status === 'Confirmed').map((booking) => (
                  booking.participantId && <option key={booking._id} value={booking.participantId._id}>{booking.participantId.fullName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Expected Return Date</label>
              <input name="expectedReturnDate" type="date" onChange={handleAllocChange} required />
            </div>
            <button type="submit" className="btn">Allocate Gear</button>
          </form>
        </div>

        <div className="card">
          <h2>Return Gear</h2>
          <form onSubmit={handleReturnSubmit}>
            <div className="form-group">
              <label>Gear Allocation</label>
              <select name="allocationId" value={returnForm.allocationId} onChange={handleReturnChange} required>
                <option value="">Select an Allocation</option>
                {allocations.map((allocation) => (
                  <option key={allocation._id} value={allocation._id}>
                    {allocation.gearItemId?.name || 'Gear'} — {allocation.participantId?.fullName || 'Participant'}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Condition on Return</label>
              <select name="conditionOnReturn" onChange={handleReturnChange}>
                <option value="Good">Good</option>
                <option value="Minor">Minor Damage</option>
                <option value="Moderate">Moderate Damage</option>
                <option value="Severe">Severe Damage</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
            <button type="submit" className="btn">Return Gear</button>
          </form>
          {gearMsg && (
            <p className={gearMsg.includes('successfully') || gearMsg.includes('returned') ? 'alert alert-success' : 'alert alert-error'}>
              {gearMsg}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Generate Certificate</h2>
          <div className="form-inline">
            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Batch</label>
              <select value={batchId} onChange={(e) => handleCertificateBatchSelect(e.target.value)}>
                <option value="">Select a Batch</option>
                {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.batchName}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Confirmed Booking</label>
              <select value={certBookingId} onChange={(e) => handleCertificateBookingSelect(e.target.value)} disabled={!batchId}>
                <option value="">Select a Confirmed Booking</option>
                {bookings.filter((booking) => booking.status === 'Confirmed').map((booking) => (
                  <option key={booking._id} value={booking._id}>
                    {booking.participantId?.fullName || 'Participant'} — {booking._id}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Participant ID (safety check)</label>
              <input value={certParticipantId} readOnly aria-readonly="true" />
            </div>
            <button onClick={handleGenerateCert} className="btn" disabled={!certBookingId}>Generate Certificate</button>
          </div>
          {certMessage && (
            <p className={certMessage.includes('generated') ? 'alert alert-success' : 'alert alert-error'}>
              {certMessage.startsWith('Certificate generated') ? (
                <>Certificate generated: <a href={certMessage.split(': ')[1]} target="_blank" rel="noopener noreferrer">View PDF</a></>
              ) : certMessage}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}