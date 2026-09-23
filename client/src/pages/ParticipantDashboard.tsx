import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getTripsByOrg, getAllPublicTrips } from '../services/tripService';
import { createBooking, submitForMedicalReview } from '../services/bookingService';
import { uploadMedicalProfile } from '../services/medicalService';
import { getBookingQR } from '../services/bookingService';
import { submitFeedback } from '../services/feedbackService';

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

  return (
    <div>
      <Navbar />
      <h1>Participant Dashboard — {user?.fullName}</h1>

      <h2>Available Trips</h2>
      <ul>
        {trips.map((trip) => (
          <li key={trip._id}>{trip.name} — {trip.location}</li>
        ))}
      </ul>

      <h2>Book a Batch</h2>
      <input placeholder="Batch ID" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
      <button onClick={handleBook}>Book</button>
      {message && <p>{message}</p>}

    <h2>Upload Medical Profile</h2>
    <form onSubmit={handleMedicalSubmit}>
        <input name="bloodGroup" placeholder="Blood Group" onChange={handleMedicalChange} />
        <input name="allergies" placeholder="Allergies" onChange={handleMedicalChange} />
        <input name="medicalConditions" placeholder="Medical Conditions" onChange={handleMedicalChange} />
        <input name="medications" placeholder="Medications" onChange={handleMedicalChange} />
        <input name="emergencyContactDetails" placeholder="Emergency Contact" onChange={handleMedicalChange} />
        <input name="validUntil" type="date" onChange={handleMedicalChange} />
    <button type="submit">Upload Profile</button>
    </form>

    <h2>Submit Booking for Review</h2>
    <input placeholder="Booking ID" value={bookingId} onChange={(e) => setBookingId(e.target.value)} />
    <button onClick={handleSubmitReview}>Submit for Review</button>

    <h2>Get My QR Code</h2>
    <button onClick={handleGetQR}>Get QR</button>
    {qrImage && <img src={qrImage} alt="Booking QR Code" style={{ width: '200px' }} />}

    <h2>Submit Feedback</h2>
    <form onSubmit={handleFeedbackSubmit}>
      <input name="bookingId" placeholder="Booking ID" onChange={handleFeedbackChange} />
      <label>Guide Rating (1-5): <input name="ratingGuide" type="number" min="1" max="5" onChange={handleFeedbackChange} /></label>
      <label>Food Rating (1-5): <input name="ratingFood" type="number" min="1" max="5" onChange={handleFeedbackChange} /></label>
      <label>Safety Rating (1-5): <input name="ratingSafety" type="number" min="1" max="5" onChange={handleFeedbackChange} /></label>
      <label>Overall Rating (1-5): <input name="ratingOverall" type="number" min="1" max="5" onChange={handleFeedbackChange} /></label>
      <textarea name="comments" placeholder="Comments" onChange={handleFeedbackChange} />
      <button type="submit">Submit Feedback</button>
    </form>
    {feedbackMessage && <p>{feedbackMessage}</p>}

    </div>
  );
}