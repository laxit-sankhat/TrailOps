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
      <div className="dashboard-container">
        <h1>Medical Officer Dashboard</h1>
        {message && (
          <p className={message.includes('Approved') || message.includes('updated') ? 'alert alert-success' : 'alert alert-error'}>
            {message}
          </p>
        )}

        <div className="card">
          <h2>Pending Medical Reviews</h2>
          {reviews.length > 0 ? (
            <ul className="data-list" style={{ marginTop: '1rem' }}>
              {reviews.map((r) => (
                <li key={r._id} style={{ display: 'block', padding: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div><strong>Booking ID:</strong> <span style={{ color: 'var(--text-muted)' }}>{r.bookingId?._id || r.bookingId}</span></div>
                    <div><strong>Blood Group:</strong> <span>{r.medicalProfileId?.bloodGroup || 'N/A'}</span></div>
                    <div><strong>Allergies:</strong> <span>{r.medicalProfileId?.allergies || 'None'}</span></div>
                    <div><strong>Conditions:</strong> <span>{r.medicalProfileId?.medicalConditions || 'None'}</span></div>
                    <div><strong>Medications:</strong> <span>{r.medicalProfileId?.medications || 'None'}</span></div>
                    <div><strong>Current Status:</strong> <span className="role-badge" style={{ backgroundColor: 'var(--primary-accent)', color: '#fff' }}>{r.status}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => handleDecision(r._id, 'Approved')} className="btn btn-sm">Approve</button>
                    <button onClick={() => handleDecision(r._id, 'Rejected')} className="btn btn-sm btn-danger">Reject</button>
                    <button onClick={() => handleDecision(r._id, 'NeedsMoreInfo')} className="btn btn-sm btn-secondary">Needs More Info</button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No pending reviews found.</p>
          )}
        </div>
      </div>
    </div>
  );
}