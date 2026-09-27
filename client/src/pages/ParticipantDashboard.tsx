import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getAllPublicTrips } from '../services/tripService';
import { createBooking, submitForMedicalReview } from '../services/bookingService';
import { uploadMedicalProfile } from '../services/medicalService';
import { getBookingQR } from '../services/bookingService';
import { submitFeedback } from '../services/feedbackService';
import { createBookingGroup, joinBookingGroup, submitBookingGroup } from '../services/bookingGroupService';

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<any[]>([]);
  const [batchId, setBatchId] = useState('');
  const [message, setMessage] = useState('');

  // Note: since Participant is global, this currently only shows ONE org's
  // trips (hardcoded org ID for testing) - a real "browse across all NGOs"
  // view needs a new public trip-search endpoint, not yet built.
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const response = await getAllPublicTrips();
        setTrips(response.data.trips);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTrips();
  }, []);

  const handleBook = async () => {
    try {
      const response = await createBooking({ batchId });
      setMessage(`Booking created - status: ${response.data.booking.status}`);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

    const [medicalForm, setMedicalForm] = useState({
    bloodGroup: '', allergies: '', medicalConditions: '', medications: '',
    emergencyContactDetails: '', reportFileUrl: 'placeholder.pdf', validUntil: ''
    });
    const [bookingId, setBookingId] = useState('');

    const handleMedicalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMedicalForm({ ...medicalForm, [e.target.name]: e.target.value });
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

    const handleSubmitReview = async () => {
    try {
        const response = await submitForMedicalReview(bookingId);
        setMessage(`Booking submitted - status: ${response.data.booking.status}`);
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
          <div className="form-inline">
            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Batch ID</label>
              <input placeholder="Enter Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
            </div>
            <button onClick={handleBook} className="btn">Book Batch</button>
          </div>
          {message && (
            <p className={message.includes('created') ? 'alert alert-success' : 'alert alert-error'}>
              {message}
            </p>
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
          <form onSubmit={handleMedicalSubmit}>
            <div className="form-group">
              <label>Blood Group</label>
              <input name="bloodGroup" placeholder="e.g. O+, A-, B+" onChange={handleMedicalChange} required />
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
              <input name="emergencyContactDetails" placeholder="Name & Phone Number" onChange={handleMedicalChange} required />
            </div>
            <div className="form-group">
              <label>Valid Until</label>
              <input name="validUntil" type="date" onChange={handleMedicalChange} required />
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
              <input name="bookingId" placeholder="Enter Booking ID" onChange={handleFeedbackChange} required />
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