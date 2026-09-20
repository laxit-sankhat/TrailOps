import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getPendingReviews, reviewMedicalSubmission } from '../services/medicalService';

export default function MedicalOfficerDashboard() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  const fetchReviews = async () => {
    try {
      const response = await getPendingReviews();
      setReviews(response.data.reviews);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDecision = async (reviewId: string, status: string) => {
    try {
      await reviewMedicalSubmission(reviewId, { status, notes: 'Reviewed via dashboard' });
      setMessage(`Review updated to ${status}`);
      fetchReviews();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div>
      <Navbar />
      <h1>Medical Officer Dashboard</h1>
      {message && <p>{message}</p>}

      <h2>Pending Reviews</h2>
        <ul>
            {reviews.map((r) => (
                <li key={r._id} style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '0.5rem' }}>
                <p><strong>Booking:</strong> {r.bookingId?._id}</p>
                <p><strong>Blood Group:</strong> {r.medicalProfileId?.bloodGroup}</p>
                <p><strong>Allergies:</strong> {r.medicalProfileId?.allergies}</p>
                <p><strong>Conditions:</strong> {r.medicalProfileId?.medicalConditions}</p>
                <p><strong>Medications:</strong> {r.medicalProfileId?.medications}</p>
                <p><strong>Status:</strong> {r.status}</p>
                <button onClick={() => handleDecision(r._id, 'Approved')}>Approve</button>
                <button onClick={() => handleDecision(r._id, 'Rejected')}>Reject</button>
                <button onClick={() => handleDecision(r._id, 'NeedsMoreInfo')}>Needs More Info</button>
                </li>
            ))}
        </ul>
    </div>
  );
}