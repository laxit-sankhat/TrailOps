import { useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getAllPublicTrips } from '../services/tripService';
import { createBooking, submitForMedicalReview, getMyBookings, cancelBooking, getBookingQR } from '../services/bookingService';
import { uploadMedicalProfile } from '../services/medicalService';
import { getBatchesByTrip } from '../services/batchService';
import { submitFeedback } from '../services/feedbackService';
import { createBookingGroup, joinBookingGroup, submitBookingGroup } from '../services/bookingGroupService';
import type { BatchSummary, ParticipantBookingSummary } from '../types';

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [batchId, setBatchId] = useState('');
  const [selectedTripId, setSelectedTripId] = useState('');
  const [availableBatches, setAvailableBatches] = useState<BatchSummary[]>([]);
  const [batchesError, setBatchesError] = useState('');
  const [myBookings, setMyBookings] = useState<ParticipantBookingSummary[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [message, setMessage] = useState('');

  const fetchMyBookings = async () => {
    setLoadingBookings(true);
    try {
      const response = await getMyBookings();
      setMyBookings(response.data.bookings || []);
      setBookingsError('');
    } catch (err) {
      console.error(err);
      setBookingsError('Unable to load your bookings. Please try again later.');
    } finally {
      setLoadingBookings(false);
    }
  };

  // Note: since Participant is global, this currently only shows ONE org's
  // trips (hardcoded org ID for testing) - a real "browse across all NGOs"
  // view needs a new public trip-search endpoint, not yet built.
  useEffect(() => {
    let active = true;
    const fetchTrips = async () => {
      try {
        const response = await getAllPublicTrips();
        if (active) setTrips(response.data.trips);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTrips();
    getMyBookings()
      .then((response) => {
        if (active) {
          setMyBookings(response.data.bookings || []);
          setBookingsError('');
        }
      })
      .catch((err) => {
        console.error(err);
        if (active) setBookingsError('Unable to load your bookings. Please try again later.');
      })
      .finally(() => {
        if (active) setLoadingBookings(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleTripSelect = async (tripId: string) => {
    setSelectedTripId(tripId);
    setBatchId('');
    setBatchesError('');
    if (!tripId) {
      setAvailableBatches([]);
      return;
    }
    try {
      const response = await getBatchesByTrip(tripId);
      setAvailableBatches(response.data.batches || []);
    } catch (err) {
      console.error(err);
      setAvailableBatches([]);
      setBatchesError('Unable to load batches for this trip. Please try again.');
    }
  };

  const handleBook = async () => {
    try {
      const response = await createBooking({ batchId });
      setMessage(`Booking created - status: ${response.data.booking.status}`);
      await fetchMyBookings();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleCancelBooking = async (id: string) => {
    try {
      await cancelBooking(id);
      setMessage('Booking cancelled successfully');
      await fetchMyBookings();
    } catch (err: unknown) {
      const errorMessage = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
      setMessage(errorMessage || 'Failed to cancel booking');
    }
  };

  const handleSubmitMedicalForBooking = async (id: string) => {
    try {
      const response = await submitForMedicalReview(id);
      setMessage(`Booking submitted for medical review - status: ${response.data.booking.status}`);
      await fetchMyBookings();
    } catch (err: unknown) {
      const errorMessage = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
      setMessage(errorMessage || 'Failed to submit for medical review');
    }
  };

  const handleFetchQRForBooking = async (id: string) => {
    try {
      const response = await getBookingQR(id);
      setQrImage(response.data.qrImage);
      setMessage('QR Code loaded below');
    } catch (err: unknown) {
      const errorMessage = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
      setMessage(errorMessage || 'Failed to retrieve QR code');
    }
  };

    const [medicalForm, setMedicalForm] = useState({
    bloodGroup: '', allergies: '', medicalConditions: '', medications: '',
    emergencyContactDetails: '', reportFileUrl: 'placeholder.pdf', validUntil: ''
    });
    const [medicalValidationErrors, setMedicalValidationErrors] = useState<Record<string, string>>({});
    const [bookingId, setBookingId] = useState('');

    const handleMedicalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMedicalForm({ ...medicalForm, [e.target.name]: e.target.value });
    };

    const validateMedicalField = (field: string, formElement: HTMLFormElement) => {
    const values = new FormData(formElement);
    const value = String(values.get(field) || '');
    if (['bloodGroup', 'emergencyContactDetails', 'validUntil'].includes(field) && !value.trim()) {
        return 'This field is required.';
    }
    if (field === 'validUntil' && value) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(`${value}T00:00:00`) <= today) return 'Valid-until date must be in the future.';
    }
    return '';
    };

    const handleMedicalBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const field = e.currentTarget.name;
    const formElement = e.currentTarget.form;
    if (!formElement) return;
    const error = validateMedicalField(field, formElement);
    setMedicalValidationErrors((current) => ({ ...current, [field]: error }));
    };

    const handleMedicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await uploadMedicalProfile(medicalForm);
        setMessage('Medical profile uploaded');
    } catch (err: any) {
        setMessage(err.response?.data?.message || 'Something went wrong');
    }
    };

    const handleValidatedMedicalSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fields = ['bloodGroup', 'emergencyContactDetails', 'validUntil'];
    const nextErrors = Object.fromEntries(
        fields.map((field) => [field, validateMedicalField(field, e.currentTarget)])
    );
    setMedicalValidationErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    handleMedicalSubmit(e);
    };

    const handleSubmitReview = async () => {
    try {
        const response = await submitForMedicalReview(bookingId);
        setMessage(`Booking submitted - status: ${response.data.booking.status}`);
        await fetchMyBookings();
    } catch (err: any) {
        setMessage(err.response?.data?.message || 'Something went wrong');
    }
    };

    const [qrImage, setQrImage] = useState('');

    const handleGetQR = async () => {
    try {
        const response = await getBookingQR(bookingId);
        setQrImage(response.data.qrImage);
    } catch (err: any) {
        setMessage(err.response?.data?.message || 'Something went wrong');
    }
    };

    const [feedbackForm, setFeedbackForm] = useState({
      bookingId: '', ratingGuide: 5, ratingFood: 5, ratingSafety: 5, ratingOverall: 5, comments: ''
    });
    const [feedbackMessage, setFeedbackMessage] = useState('');

    const handleFeedbackChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFeedbackForm({ ...feedbackForm, [e.target.name]: e.target.value });
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await submitFeedback(feedbackForm);
        setFeedbackMessage('Feedback submitted successfully');
      } catch (err: any) {
        setFeedbackMessage(err.response?.data?.message || 'Something went wrong');
      }
    };

    // Group Booking state & handlers
    const [groupBatchId, setGroupBatchId] = useState('');
    const [createdGroupCode, setCreatedGroupCode] = useState('');
    const [createGroupMessage, setCreateGroupMessage] = useState('');

    const [joinGroupCode, setJoinGroupCode] = useState('');
    const [joinGroupMessage, setJoinGroupMessage] = useState('');

    const [submitGroupId, setSubmitGroupId] = useState('');
    const [submitGroupMessage, setSubmitGroupMessage] = useState('');

    const handleCreateGroup = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const response = await createBookingGroup(groupBatchId);
        setCreatedGroupCode(response.data.group.groupCode);
        setCreateGroupMessage(`Group created successfully! Group Code: ${response.data.group.groupCode}`);
      } catch (err: any) {
        setCreateGroupMessage(err.response?.data?.message || 'Something went wrong');
      }
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const response = await joinBookingGroup(joinGroupCode);
        setJoinGroupMessage(`Joined group successfully! Booking status: ${response.data.booking.status}`);
      } catch (err: any) {
        setJoinGroupMessage(err.response?.data?.message || 'Something went wrong');
      }
    };

    const handleSubmitGroup = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const response = await submitBookingGroup(submitGroupId);
        setSubmitGroupMessage(`${response.data.message} (Group size: ${response.data.groupSize})`);
      } catch (err: any) {
        setSubmitGroupMessage(err.response?.data?.message || 'Something went wrong');
      }
    };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Participant Dashboard — {user?.fullName}</h1>

        <div className="card">
          <h2>Available Trips</h2>
          {trips.length > 0 ? (
            <ul className="item-list">
              {trips.map((trip) => (
                <li key={trip._id}>
                  <div>
                    <strong>{trip.name}</strong>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Location: {trip.location}</div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>ID: {trip._id}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No public trips available at this time.</p>
          )}
        </div>

        <div className="card">
          <h2>Book a Batch</h2>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Select Trip</label>
            <select value={selectedTripId} onChange={(e) => handleTripSelect(e.target.value)}>
              <option value="">Select a Trip</option>
              {trips.map((trip) => (
                <option key={trip._id} value={trip._id}>
                  {trip.name} ({trip.location})
                </option>
              ))}
            </select>
          </div>
          <div className="form-inline">
            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Select Batch</label>
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={!selectedTripId}>
                <option value="">
                    {selectedTripId ? (batchesError ? 'Could not load batches' : availableBatches.length > 0 ? 'Select a Batch' : 'No upcoming batches found') : 'Select a trip first'}
                </option>
                {availableBatches.map((batch) => (
                  <option key={batch._id} value={batch._id}>
                    {batch.batchName}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleBook} className="btn" disabled={!batchId}>Book Batch</button>
          </div>
          {batchesError && <p className="alert alert-error">{batchesError}</p>}
          {message && (
            <p className={message.includes('created') || message.includes('successfully') || message.includes('submitted for medical review') || message.includes('QR Code loaded') ? 'alert alert-success' : 'alert alert-error'}>
              {message}
            </p>
          )}
        </div>

        <div className="card">
          <h2>My Bookings</h2>
          {loadingBookings ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading your bookings...</p>
          ) : bookingsError ? (
            <p className="alert alert-error">{bookingsError}</p>
          ) : myBookings.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
              {myBookings.map((booking) => (
                <div key={booking._id} style={{ background: 'var(--bg-body)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <strong>{booking.tripId?.name || 'Trek'}</strong>
                    <span className="role-badge" style={{ backgroundColor: 'var(--primary-accent)', color: '#fff' }}>{booking.status}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    <div><strong>Batch:</strong> {booking.batchId?.batchName || 'N/A'}</div>
                    {booking.batchId?.startDate && booking.batchId.endDate && (
                      <div>
                        {new Date(booking.batchId.startDate).toLocaleDateString()} — {new Date(booking.batchId.endDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {booking.status === 'Inquiry' && (
                      <button onClick={() => handleSubmitMedicalForBooking(booking._id)} className="btn btn-sm">Submit Medical</button>
                    )}
                    {booking.status === 'Confirmed' && (
                      <button onClick={() => handleFetchQRForBooking(booking._id)} className="btn btn-sm">Get QR Code</button>
                    )}
                    {booking.status === 'Confirmed' && (
                      <button onClick={() => setFeedbackForm({ ...feedbackForm, bookingId: booking._id })} className="btn btn-sm btn-secondary">Give Feedback</button>
                    )}
                    {['Inquiry', 'PendingMedicalReview', 'MedicallyApproved', 'Confirmed'].includes(booking.status) && (
                      <button onClick={() => handleCancelBooking(booking._id)} className="btn btn-sm btn-danger">Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>You have no bookings yet.</p>
          )}
        </div>

        <div className="card">
          <h2>Group Bookings</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3>Create a Group</h3>
              <form onSubmit={handleCreateGroup}>
                <div className="form-group">
                  <label>Batch ID</label>
                  <input
                    placeholder="Enter Batch ID"
                    value={groupBatchId}
                    onChange={(e) => setGroupBatchId(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn">Create Group</button>
              </form>
              {createdGroupCode && (
                <div className="group-code-display">
                  <strong>Group Code (share with friends):</strong> {createdGroupCode}
                </div>
              )}
              {createGroupMessage && (
                <p className={createGroupMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
                  {createGroupMessage}
                </p>
              )}
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3>Join a Group</h3>
              <form onSubmit={handleJoinGroup}>
                <div className="form-group">
                  <label>Group Code</label>
                  <input
                    placeholder="Enter Group Code"
                    value={joinGroupCode}
                    onChange={(e) => setJoinGroupCode(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn">Join Group</button>
              </form>
              {joinGroupMessage && (
                <p className={joinGroupMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
                  {joinGroupMessage}
                </p>
              )}
            </div>

            <div style={{ padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3>Submit a Group</h3>
              <form onSubmit={handleSubmitGroup}>
                <div className="form-group">
                  <label>Group ID</label>
                  <input
                    placeholder="Enter Group ID"
                    value={submitGroupId}
                    onChange={(e) => setSubmitGroupId(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn">Submit Group</button>
              </form>
              {submitGroupMessage && (
                <p className={submitGroupMessage.includes('pipeline') || submitGroupMessage.includes('together') ? 'alert alert-success' : 'alert alert-error'}>
                  {submitGroupMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Upload Medical Profile</h2>
          <form onSubmit={handleValidatedMedicalSubmit} noValidate>
            <div className="form-group">
              <label>Blood Group</label>
              <input name="bloodGroup" placeholder="e.g. O+, A-, B+" onChange={handleMedicalChange} onBlur={handleMedicalBlur} aria-invalid={Boolean(medicalValidationErrors.bloodGroup)} required />
              {medicalValidationErrors.bloodGroup && <p className="field-error">{medicalValidationErrors.bloodGroup}</p>}
            </div>
            <div className="form-group">
              <label>Allergies</label>
              <input name="allergies" placeholder="e.g. Peanuts, Dust, None" onChange={handleMedicalChange} />
            </div>
            <div className="form-group">
              <label>Medical Conditions</label>
              <input name="medicalConditions" placeholder="e.g. Asthma, Hypertension, None" onChange={handleMedicalChange} />
            </div>
            <div className="form-group">
              <label>Medications</label>
              <input name="medications" placeholder="e.g. Inhaler, None" onChange={handleMedicalChange} />
            </div>
            <div className="form-group">
              <label>Emergency Contact Details</label>
              <input name="emergencyContactDetails" placeholder="Name & Phone Number" onChange={handleMedicalChange} onBlur={handleMedicalBlur} aria-invalid={Boolean(medicalValidationErrors.emergencyContactDetails)} required />
              {medicalValidationErrors.emergencyContactDetails && <p className="field-error">{medicalValidationErrors.emergencyContactDetails}</p>}
            </div>
            <div className="form-group">
              <label>Valid Until</label>
              <input name="validUntil" type="date" onChange={handleMedicalChange} onBlur={handleMedicalBlur} aria-invalid={Boolean(medicalValidationErrors.validUntil)} required />
              {medicalValidationErrors.validUntil && <p className="field-error">{medicalValidationErrors.validUntil}</p>}
            </div>
            <button type="submit" className="btn">Upload Medical Profile</button>
          </form>
        </div>

        <div className="card">
          <h2>Submit Booking for Review</h2>
          <div className="form-inline">
            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Booking ID</label>
              <input placeholder="Enter Booking ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
            </div>
            <button onClick={handleSubmitReview} className="btn">Submit for Review</button>
          </div>
        </div>

        <div className="card">
          <h2>Get My QR Code</h2>
          <div className="form-inline">
            <button onClick={handleGetQR} className="btn">Generate / View QR</button>
          </div>
          {qrImage && (
            <div className="qr-image-container">
              <img src={qrImage} alt="Booking QR Code" style={{ width: '200px', display: 'block' }} />
            </div>
          )}
        </div>

        <div className="card">
          <h2>Submit Feedback</h2>
          <form onSubmit={handleFeedbackSubmit}>
            <div className="form-group">
              <label>Booking ID</label>
              <input name="bookingId" placeholder="Enter Booking ID" value={feedbackForm.bookingId} onChange={handleFeedbackChange} required />
            </div>
            <div className="form-group">
              <label>Guide Rating (1-5)</label>
              <input name="ratingGuide" type="number" min="1" max="5" defaultValue={5} onChange={handleFeedbackChange} required />
            </div>
            <div className="form-group">
              <label>Food Rating (1-5)</label>
              <input name="ratingFood" type="number" min="1" max="5" defaultValue={5} onChange={handleFeedbackChange} required />
            </div>
            <div className="form-group">
              <label>Safety Rating (1-5)</label>
              <input name="ratingSafety" type="number" min="1" max="5" defaultValue={5} onChange={handleFeedbackChange} required />
            </div>
            <div className="form-group">
              <label>Overall Rating (1-5)</label>
              <input name="ratingOverall" type="number" min="1" max="5" defaultValue={5} onChange={handleFeedbackChange} required />
            </div>
            <div className="form-group">
              <label>Comments</label>
              <textarea name="comments" placeholder="Share your experience..." onChange={handleFeedbackChange} />
            </div>
            <button type="submit" className="btn">Submit Feedback</button>
          </form>
          {feedbackMessage && (
            <p className={feedbackMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {feedbackMessage}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}