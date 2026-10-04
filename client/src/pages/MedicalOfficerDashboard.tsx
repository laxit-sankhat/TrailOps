import { useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileX,
  Inbox,
  LoaderCircle,
  XCircle
} from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  getPendingReviews,
  getReviewDocument,
  reviewMedicalSubmission
} from '../services/medicalService';
import './MedicalOfficerDashboard.css';

interface MedicalProfileMeta {
  _id?: string;
  participantId?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalConditions?: string;
  medications?: string;
  emergencyContactDetails?: string;
  reportFileName?: string | null;
  hasDocument?: boolean;
  validUntil?: string | Date;
}

interface BookingMeta {
  _id?: string;
  tripId?: string | { _id?: string; name?: string };
  batchId?: string | { _id?: string; batchName?: string; startDate?: string; endDate?: string };
  status?: string;
}

interface MedicalReviewItem {
  _id: string;
  bookingId?: BookingMeta | string;
  medicalProfileId?: MedicalProfileMeta;
  organizationId?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'NeedsMoreInfo';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function MedicalOfficerDashboard() {
  const [reviews, setReviews] = useState<MedicalReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'success' | 'error'>('success');
  const [openingDocId, setOpeningDocId] = useState<string | null>(null);
  const [submittingDecisionId, setSubmittingDecisionId] = useState<string | null>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await getPendingReviews();
      setReviews(response.data.reviews || []);
    } catch (err: unknown) {
      console.error(err);
      setMessage(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to load medical reviews.'
          : 'Failed to load medical reviews.'
      );
      setMessageTone('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDecision = async (reviewId: string, status: string) => {
    if (submittingDecisionId) return;
    try {
      setSubmittingDecisionId(reviewId);
      setMessage('');
      await reviewMedicalSubmission(reviewId, { status, notes: 'Reviewed via dashboard' });
      setMessage(`Review updated to ${status}`);
      setMessageTone('success');
      fetchReviews();
    } catch (err: unknown) {
      const errMsg = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message || 'Something went wrong'
        : 'Something went wrong';
      setMessage(errMsg);
      setMessageTone('error');
    } finally {
      setSubmittingDecisionId(null);
    }
  };

  const handleViewDocument = async (reviewId: string) => {
    if (openingDocId) return; // prevent duplicate clicks while opening
    setOpeningDocId(reviewId);
    setMessage('');

    try {
      const response = await getReviewDocument(reviewId);
      const signedUrl = response.data?.url;

      if (!signedUrl) {
        throw new Error('Document download URL was not provided.');
      }

      // Open temporary signed URL in secure new tab
      const newTab = window.open(signedUrl, '_blank', 'noopener,noreferrer');
      if (!newTab) {
        setMessage('Pop-up was blocked. Please allow pop-ups for this site to view the document.');
        setMessageTone('error');
      }
    } catch (err: unknown) {
      let errorText = 'Unable to open medical document. Please try again.';
      if (isAxiosError<{ message?: string }>(err)) {
        if (err.response?.status === 404) {
          errorText = 'Medical document was not found for this review.';
        } else if (err.response?.status === 403) {
          errorText = 'You are not authorized to view documents for this review.';
        } else if (err.response?.data?.message) {
          errorText = err.response.data.message;
        }
      } else if (err instanceof Error) {
        errorText = err.message;
      }
      setMessage(errorText);
      setMessageTone('error');
    } finally {
      setOpeningDocId(null);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <header className="mo-header">
          <p className="mo-eyebrow">OPERATIONS CONSOLE</p>
          <h1 className="mo-title">Medical Officer Dashboard</h1>
          <p className="mo-subtitle">
            Review participant health profiles, verify uploaded supporting documents, and issue medical clearances.
          </p>
        </header>

        {message && (
          <div
            className={`mo-feedback-alert mo-feedback-alert--${messageTone}`}
            role={messageTone === 'error' ? 'alert' : 'status'}
          >
            {messageTone === 'error' ? (
              <AlertCircle size={18} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={18} aria-hidden="true" />
            )}
            <span>{message}</span>
          </div>
        )}

        <div className="mo-reviews-card">
          <div className="mo-card-header">
            <h2 className="mo-card-title">Pending Medical Reviews</h2>
            <span className="mo-count-badge">
              {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
            </span>
          </div>

          {loading ? (
            <div className="mo-empty-state">
              <LoaderCircle size={28} className="mo-spin mo-empty-icon" aria-hidden="true" />
              <p>Loading pending reviews…</p>
            </div>
          ) : reviews.length > 0 ? (
            <ul className="mo-reviews-list" aria-label="Pending medical reviews list">
              {reviews.map((r) => {
                const bookingRef =
                  typeof r.bookingId === 'object' && r.bookingId !== null
                    ? r.bookingId._id || 'N/A'
                    : r.bookingId || 'N/A';

                const hasDoc = Boolean(
                  r.medicalProfileId?.reportFileName || r.medicalProfileId?.hasDocument
                );
                const documentFileName =
                  r.medicalProfileId?.reportFileName || 'Medical Supporting Document';

                const isOpeningThisDoc = openingDocId === r._id;
                const isSubmittingThisDecision = submittingDecisionId === r._id;

                return (
                  <li key={r._id} className="mo-review-item">
                    {/* Top reference bar */}
                    <div className="mo-review-top">
                      <div className="mo-review-id-group">
                        <span className="mo-review-id-label">Booking ID:</span>
                        <span className="mo-review-id-value">{bookingRef}</span>
                      </div>
                      <span className="mo-status-badge">
                        <Clock size={13} aria-hidden="true" />
                        <span>{r.status}</span>
                      </span>
                    </div>

                    {/* Medical Profile Meta Grid */}
                    <div className="mo-profile-grid">
                      <div className="mo-profile-field">
                        <span className="mo-field-label">Blood Group</span>
                        <span className="mo-field-value">
                          {r.medicalProfileId?.bloodGroup || 'N/A'}
                        </span>
                      </div>
                      <div className="mo-profile-field">
                        <span className="mo-field-label">Allergies</span>
                        <span className="mo-field-value">
                          {r.medicalProfileId?.allergies || 'None'}
                        </span>
                      </div>
                      <div className="mo-profile-field">
                        <span className="mo-field-label">Conditions</span>
                        <span className="mo-field-value">
                          {r.medicalProfileId?.medicalConditions || 'None'}
                        </span>
                      </div>
                      <div className="mo-profile-field">
                        <span className="mo-field-label">Medications</span>
                        <span className="mo-field-value">
                          {r.medicalProfileId?.medications || 'None'}
                        </span>
                      </div>
                      {r.medicalProfileId?.emergencyContactDetails && (
                        <div className="mo-profile-field">
                          <span className="mo-field-label">Emergency Contact</span>
                          <span className="mo-field-value">
                            {r.medicalProfileId.emergencyContactDetails}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Dedicated Medical Document Section */}
                    <div className="mo-doc-section">
                      {hasDoc ? (
                        <div className="mo-doc-card">
                          <div className="mo-doc-info">
                            <div className="mo-doc-icon-wrap" aria-hidden="true">
                              <FileCheck size={18} />
                            </div>
                            <div className="mo-doc-meta">
                              <span className="mo-doc-tag">Medical Supporting Document</span>
                              <strong className="mo-doc-filename" title={documentFileName}>
                                {documentFileName}
                              </strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary mo-view-doc-btn"
                            aria-label={`View medical document ${documentFileName} for booking ${bookingRef}`}
                            onClick={() => handleViewDocument(r._id)}
                            disabled={openingDocId !== null}
                          >
                            {isOpeningThisDoc ? (
                              <>
                                <LoaderCircle size={14} className="mo-spin" aria-hidden="true" />
                                <span>Opening…</span>
                              </>
                            ) : (
                              <>
                                <ExternalLink size={14} aria-hidden="true" />
                                <span>View Document</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="mo-doc-empty">
                          <FileX size={16} aria-hidden="true" className="mo-doc-empty-icon" />
                          <span>No supporting medical document uploaded for this profile</span>
                        </div>
                      )}
                    </div>

                    {/* Decision Actions Bar */}
                    <div className="mo-actions-bar">
                      <button
                        type="button"
                        onClick={() => handleDecision(r._id, 'Approved')}
                        className="btn btn-sm mo-action-btn"
                        disabled={isSubmittingThisDecision || openingDocId !== null}
                      >
                        {isSubmittingThisDecision ? (
                          <LoaderCircle size={14} className="mo-spin" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 size={14} aria-hidden="true" />
                        )}
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(r._id, 'Rejected')}
                        className="btn btn-sm btn-danger mo-action-btn"
                        disabled={isSubmittingThisDecision || openingDocId !== null}
                      >
                        {isSubmittingThisDecision ? (
                          <LoaderCircle size={14} className="mo-spin" aria-hidden="true" />
                        ) : (
                          <XCircle size={14} aria-hidden="true" />
                        )}
                        <span>Reject</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(r._id, 'NeedsMoreInfo')}
                        className="btn btn-sm btn-secondary mo-action-btn"
                        disabled={isSubmittingThisDecision || openingDocId !== null}
                      >
                        {isSubmittingThisDecision ? (
                          <LoaderCircle size={14} className="mo-spin" aria-hidden="true" />
                        ) : (
                          <AlertCircle size={14} aria-hidden="true" />
                        )}
                        <span>Needs More Info</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mo-empty-state">
              <Inbox size={32} className="mo-empty-icon" aria-hidden="true" />
              <p>No pending medical reviews found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}