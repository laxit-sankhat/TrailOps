import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Mountain,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Utensils,
  X
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getMyBookings } from '../../services/bookingService';
import { getAllPublicTrips } from '../../services/tripService';
import { getMyFeedback, submitFeedback } from '../../services/feedbackService';
import type { ParticipantBookingSummary, PublicTrip } from '../../types';
import './ParticipantFeedbackPage.css';

type EligibleBooking = Omit<ParticipantBookingSummary, 'tripId' | 'batchId'> & {
  _id: string;
  tripId: (NonNullable<ParticipantBookingSummary['tripId']> & { _id?: string }) | null;
  batchId: (NonNullable<ParticipantBookingSummary['batchId']> & {
    _id?: string;
    batchName?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) | null;
};

type FeedbackForm = {
  bookingId: string;
  ratingGuide: number;
  ratingFood: number;
  ratingSafety: number;
  ratingOverall: number;
  comments: string;
};

type ValidationErrors = Partial<Record<keyof FeedbackForm, string>>;

export interface ParticipantFeedbackItem {
  _id: string;
  bookingId: string;
  tripId?: { _id?: string; name?: string } | string;
  batchId?: { _id?: string; batchName?: string; startDate?: string; endDate?: string } | string;
  ratingGuide: number;
  ratingFood: number;
  ratingSafety: number;
  ratingOverall: number;
  comments?: string;
  createdAt?: string;
}

type TabType = 'awaiting' | 'submitted' | 'all';

const INITIAL_FORM: FeedbackForm = {
  bookingId: '',
  ratingGuide: 5,
  ratingFood: 5,
  ratingSafety: 5,
  ratingOverall: 5,
  comments: ''
};

const RATING_FIELDS = [
  { name: 'ratingGuide' as const, label: 'Guide & Leadership', icon: UserCheck },
  { name: 'ratingFood' as const, label: 'Expedition Food', icon: Utensils },
  { name: 'ratingSafety' as const, label: 'Safety & Altitude Care', icon: ShieldCheck },
  { name: 'ratingOverall' as const, label: 'Overall Journey', icon: Sparkles }
] as const;

const RATING_DESCRIPTORS: Record<number, string> = {
  1: '1 - Poor',
  2: '2 - Fair',
  3: '3 - Good',
  4: '4 - Very Good',
  5: '5 - Exceptional'
};

function formatDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? fallback
    : fallback;
}

function isCompletedBooking(booking: EligibleBooking): boolean {
  return booking.status === 'Confirmed' && booking.batchId?.status === 'Completed';
}

function validateForm(form: FeedbackForm): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!form.bookingId) {
    errors.bookingId = 'Please select a booking.';
  }

  for (const { name, label } of RATING_FIELDS) {
    const value = form[name];
    if (value === undefined || value === null || (value as unknown) === '') {
      errors[name] = `${label} rating is required.`;
    } else if (!Number.isInteger(Number(value)) || Number(value) < 1 || Number(value) > 5) {
      errors[name] = `${label} rating must be a whole number between 1 and 5.`;
    }
  }

  return errors;
}

export default function ParticipantFeedbackPage() {
  const [bookings, setBookings] = useState<EligibleBooking[]>([]);
  const [publicTripsMap, setPublicTripsMap] = useState<Map<string, PublicTrip>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Authoritative feedbacks from backend
  const [feedbacks, setFeedbacks] = useState<ParticipantFeedbackItem[]>([]);

  // Active filter tab
  const [activeTab, setActiveTab] = useState<TabType>('awaiting');

  // Modal & Form States
  const [activeBooking, setActiveBooking] = useState<EligibleBooking | null>(null);
  const [form, setForm] = useState<FeedbackForm>(INITIAL_FORM);
  const [hoveredRatings, setHoveredRatings] = useState<Partial<Record<keyof FeedbackForm, number>>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Authoritative feedback lookup by bookingId
  const feedbackByBookingId = useMemo(() => {
    const map = new Map<string, ParticipantFeedbackItem>();
    for (const fb of feedbacks) {
      if (fb.bookingId) {
        // Normalize bookingId whether populated object or string ID
        const bId = typeof fb.bookingId === 'object' ? (fb.bookingId as { _id?: string })._id : String(fb.bookingId);
        if (bId) map.set(bId, fb);
      }
    }
    return map;
  }, [feedbacks]);

  // Load bookings, public trips, and backend feedbacks
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [bookingsRes, feedbackRes, tripsRes] = await Promise.all([
        getMyBookings(),
        getMyFeedback(),
        getAllPublicTrips().catch((e) => {
          console.warn('Public trips fetch failed:', e);
          return { data: { trips: [] } };
        })
      ]);

      const loadedBookings = (bookingsRes.data.bookings || []) as EligibleBooking[];
      setBookings(loadedBookings);

      const loadedFeedbacks = (feedbackRes.data?.feedbacks || []) as ParticipantFeedbackItem[];
      setFeedbacks(loadedFeedbacks);

      const trips = (tripsRes.data?.trips || []) as PublicTrip[];
      const map = new Map<string, PublicTrip>();
      trips.forEach((t) => {
        if (t._id) map.set(t._id, t);
      });
      setPublicTripsMap(map);
    } catch (err: unknown) {
      console.error(err);
      setLoadError('Unable to load your completed treks and feedback status. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Completed treks
  const completedBookings = useMemo(() => {
    return bookings.filter(isCompletedBooking);
  }, [bookings]);

  // Awaiting feedback bookings
  const awaitingBookings = useMemo(() => {
    return completedBookings.filter((b) => !feedbackByBookingId.has(b._id));
  }, [completedBookings, feedbackByBookingId]);

  // Submitted feedback bookings
  const reviewedBookings = useMemo(() => {
    return completedBookings.filter((b) => feedbackByBookingId.has(b._id));
  }, [completedBookings, feedbackByBookingId]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalCompleted = completedBookings.length;
    const submittedCount = reviewedBookings.length;
    const awaitingCount = awaitingBookings.length;

    // Calculate average rating across all submitted feedbacks for completed bookings
    let avgScore: string | null = null;
    if (feedbacks.length > 0) {
      const totalScore = feedbacks.reduce((acc, curr) => acc + (curr.ratingOverall || 5), 0);
      avgScore = (totalScore / feedbacks.length).toFixed(1);
    }

    return { totalCompleted, submittedCount, awaitingCount, avgScore };
  }, [completedBookings, reviewedBookings, awaitingBookings, feedbacks]);

  // Handle opening feedback form
  const openForm = (booking: EligibleBooking) => {
    setActiveBooking(booking);
    const existing = feedbackByBookingId.get(booking._id);
    if (existing) {
      setForm({
        bookingId: booking._id,
        ratingGuide: existing.ratingGuide || 5,
        ratingFood: existing.ratingFood || 5,
        ratingSafety: existing.ratingSafety || 5,
        ratingOverall: existing.ratingOverall || 5,
        comments: existing.comments || ''
      });
      setSubmitMessage('You have already submitted feedback for this completed trek.');
      setSubmitSuccess(true);
    } else {
      setForm({ ...INITIAL_FORM, bookingId: booking._id });
      setSubmitMessage('');
      setSubmitSuccess(false);
    }
    setHoveredRatings({});
    setValidationErrors({});
  };

  const closeForm = () => {
    setActiveBooking(null);
    setForm(INITIAL_FORM);
    setHoveredRatings({});
    setValidationErrors({});
    setSubmitMessage('');
    setSubmitSuccess(false);
  };

  const handleRatingSelect = (field: (typeof RATING_FIELDS)[number]['name'], score: number) => {
    setForm((prev) => ({ ...prev, [field]: score }));
    setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleRatingHover = (field: (typeof RATING_FIELDS)[number]['name'], score: number | null) => {
    setHoveredRatings((prev) => ({ ...prev, [field]: score || undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitMessage('');
    setSubmitSuccess(false);

    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitFeedback(form);
      const newFeedback = response.data?.feedback as ParticipantFeedbackItem | undefined;

      // Update state immediately with authoritative feedback or newly created payload
      if (newFeedback) {
        setFeedbacks((prev) => [newFeedback, ...prev.filter((f) => String(f.bookingId) !== form.bookingId)]);
      } else {
        // Fallback optimistic item while preserving responsiveness
        const optimisticFeedback: ParticipantFeedbackItem = {
          _id: `temp-${Date.now()}`,
          bookingId: form.bookingId,
          ratingGuide: form.ratingGuide,
          ratingFood: form.ratingFood,
          ratingSafety: form.ratingSafety,
          ratingOverall: form.ratingOverall,
          comments: form.comments,
          tripId: activeBooking?.tripId?.name ? { name: activeBooking.tripId.name } : undefined,
          batchId: activeBooking?.batchId?.batchName ? { batchName: activeBooking.batchId.batchName } : undefined,
          createdAt: new Date().toISOString()
        };
        setFeedbacks((prev) => [optimisticFeedback, ...prev.filter((f) => String(f.bookingId) !== form.bookingId)]);
      }

      setSubmitSuccess(true);
      setSubmitMessage('Feedback submitted successfully. Thank you for sharing your experience!');
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.status === 409) {
        // Refresh authoritative feedback from backend
        try {
          const freshFeedbackRes = await getMyFeedback();
          const freshFeedbacks = (freshFeedbackRes.data?.feedbacks || []) as ParticipantFeedbackItem[];
          setFeedbacks(freshFeedbacks);
        } catch {
          // If fresh fetch fails, synthesize item with current form values so UI updates correctly
          const fallbackFeedback: ParticipantFeedbackItem = {
            _id: `synced-${Date.now()}`,
            bookingId: form.bookingId,
            ratingGuide: form.ratingGuide,
            ratingFood: form.ratingFood,
            ratingSafety: form.ratingSafety,
            ratingOverall: form.ratingOverall,
            comments: form.comments,
            createdAt: new Date().toISOString()
          };
          setFeedbacks((prev) => [fallbackFeedback, ...prev.filter((f) => String(f.bookingId) !== form.bookingId)]);
        }

        setSubmitSuccess(false);
        setSubmitMessage('Feedback has already been submitted for this booking.');
      } else {
        setSubmitSuccess(false);
        setSubmitMessage(getApiErrorMessage(err, 'Unable to submit feedback. Please try again.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Determine current displayed bookings based on activeTab
  const displayedBookings = useMemo(() => {
    switch (activeTab) {
      case 'submitted':
        return reviewedBookings;
      case 'all':
        return completedBookings;
      case 'awaiting':
      default:
        return awaitingBookings;
    }
  }, [activeTab, reviewedBookings, completedBookings, awaitingBookings]);

  return (
    <div className="participant-feedback-page">
      <Navbar />

      <main className="participant-feedback-main">
        <div className="participant-feedback-container">
          {/* 1. Page Header Hierarchy */}
          <header className="participant-feedback-header">
            <div className="participant-feedback-header-content">
              <p className="participant-feedback-eyebrow">TREK EXPERIENCES</p>
              <h1 className="participant-feedback-title">Trek Feedback</h1>
              <p className="participant-feedback-subtitle">
                Review your completed mountain journeys, evaluate guide leadership and expedition safety, and help shape future departures.
              </p>
            </div>
          </header>

          {/* 2. KPI Summary Metrics Overview */}
          <section className="participant-feedback-stats-grid" aria-label="Feedback Overview Metrics">
            <div className="participant-feedback-stat-card">
              <div className="participant-feedback-stat-icon">
                <Mountain size={22} aria-hidden="true" />
              </div>
              <div className="participant-feedback-stat-meta">
                <span className="participant-feedback-stat-value">{summaryMetrics.totalCompleted}</span>
                <span className="participant-feedback-stat-label">Completed Treks</span>
              </div>
            </div>

            <div className="participant-feedback-stat-card">
              <div className="participant-feedback-stat-icon participant-feedback-stat-icon--amber">
                <Clock size={22} aria-hidden="true" />
              </div>
              <div className="participant-feedback-stat-meta">
                <span className="participant-feedback-stat-value">{summaryMetrics.awaitingCount}</span>
                <span className="participant-feedback-stat-label">Awaiting Feedback</span>
              </div>
            </div>

            <div className="participant-feedback-stat-card">
              <div className="participant-feedback-stat-icon participant-feedback-stat-icon--green">
                <CheckCircle2 size={22} aria-hidden="true" />
              </div>
              <div className="participant-feedback-stat-meta">
                <span className="participant-feedback-stat-value">{summaryMetrics.submittedCount}</span>
                <span className="participant-feedback-stat-label">Reviews Submitted</span>
              </div>
            </div>

            {summaryMetrics.avgScore && (
              <div className="participant-feedback-stat-card">
                <div className="participant-feedback-stat-icon participant-feedback-stat-icon--amber">
                  <Star size={22} aria-hidden="true" />
                </div>
                <div className="participant-feedback-stat-meta">
                  <span className="participant-feedback-stat-value">★ {summaryMetrics.avgScore}</span>
                  <span className="participant-feedback-stat-label">Average Score Given</span>
                </div>
              </div>
            )}
          </section>

          {/* 3. Filter Tabs */}
          <div className="participant-feedback-tabs-bar">
            <div className="participant-feedback-tabs" role="tablist" aria-label="Feedback Categories">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'awaiting'}
                className={`participant-feedback-tab-btn ${activeTab === 'awaiting' ? 'participant-feedback-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('awaiting')}
              >
                <Clock size={15} aria-hidden="true" />
                <span>Awaiting Review</span>
                <span className="participant-feedback-tab-badge">{awaitingBookings.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'submitted'}
                className={`participant-feedback-tab-btn ${activeTab === 'submitted' ? 'participant-feedback-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('submitted')}
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>Submitted Reviews</span>
                <span className="participant-feedback-tab-badge">{reviewedBookings.length}</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'all'}
                className={`participant-feedback-tab-btn ${activeTab === 'all' ? 'participant-feedback-tab-btn--active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                <Mountain size={15} aria-hidden="true" />
                <span>All Completed</span>
                <span className="participant-feedback-tab-badge">{completedBookings.length}</span>
              </button>
            </div>
          </div>

          {/* 4. Main Feedback Content */}
          {loading ? (
            <div className="participant-feedback-state" role="status">
              <LoaderCircle size={32} className="participant-spin participant-feedback-state-icon" aria-hidden="true" />
              <p className="participant-feedback-state-title">Loading Completed Treks</p>
              <p className="participant-feedback-state-desc">Retrieving your confirmed expeditions and feedback history…</p>
            </div>
          ) : loadError ? (
            <div className="participant-feedback-state" role="alert">
              <AlertCircle size={34} className="participant-feedback-state-icon" style={{ color: '#ef4444' }} aria-hidden="true" />
              <p className="participant-feedback-state-title">Unable to Load Feedback</p>
              <p className="participant-feedback-state-desc">{loadError}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void fetchData()}>
                Retry Loading
              </button>
            </div>
          ) : completedBookings.length === 0 ? (
            <div className="participant-feedback-state">
              <Mountain size={38} className="participant-feedback-state-icon" aria-hidden="true" />
              <h2 className="participant-feedback-state-title">No Completed Treks Ready for Feedback</h2>
              <p className="participant-feedback-state-desc">
                Feedback opens as soon as your trek batch is completed by the organizers. Check back once your journey concludes!
              </p>
            </div>
          ) : displayedBookings.length === 0 ? (
            <div className="participant-feedback-state">
              <CheckCircle2 size={36} className="participant-feedback-state-icon" style={{ color: '#16a34a' }} aria-hidden="true" />
              <h2 className="participant-feedback-state-title">
                {activeTab === 'awaiting' ? 'All Caught Up!' : 'No Reviews in this Category'}
              </h2>
              <p className="participant-feedback-state-desc">
                {activeTab === 'awaiting'
                  ? 'You have shared feedback for all your completed treks so far. Thank you for your contributions!'
                  : 'No reviews found in this view.'}
              </p>
              {activeTab === 'awaiting' && reviewedBookings.length > 0 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveTab('submitted')}
                >
                  View Submitted Reviews
                </button>
              )}
            </div>
          ) : (
            <div className="participant-feedback-grid">
              {displayedBookings.map((booking) => {
                const tripId = booking.tripId?._id;
                const publicTrip = tripId ? publicTripsMap.get(tripId) : undefined;
                const tripName = publicTrip?.name || booking.tripId?.name || 'Trek Adventure';
                const tripImage = publicTrip?.images?.[0]?.url || publicTrip?.imageUrl;
                const location = publicTrip?.location;
                const batchName = booking.batchId?.batchName || 'Departure Batch';

                // Date calculations
                const sDate = booking.batchId?.startDate ? new Date(booking.batchId.startDate) : null;
                const isDateValid = Boolean(sDate && !Number.isNaN(sDate.getTime()));
                const dayStr = isDateValid && sDate ? String(sDate.getDate()).padStart(2, '0') : null;
                const monthStr = isDateValid && sDate
                  ? sDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()
                  : null;

                const submitted = feedbackByBookingId.get(booking._id);

                return (
                  <article key={booking._id} className="participant-feedback-card">
                    {/* Visual & Date Circle */}
                    <div className="participant-feedback-card-visual">
                      {tripImage ? (
                        <img
                          src={tripImage}
                          alt={tripName}
                          className="participant-feedback-card-thumb"
                          loading="lazy"
                        />
                      ) : (
                        <div className="participant-feedback-card-thumb participant-feedback-card-thumb--placeholder">
                          <Mountain size={32} aria-hidden="true" />
                        </div>
                      )}

                      {dayStr && monthStr && (
                        <div className="participant-feedback-date-badge" aria-label={`Departure: ${monthStr} ${dayStr}`}>
                          <span className="participant-feedback-date-badge-day">{dayStr}</span>
                          <span className="participant-feedback-date-badge-month">{monthStr}</span>
                        </div>
                      )}

                      {submitted ? (
                        <span className="participant-feedback-status-pill participant-feedback-status-pill--reviewed">
                          <CheckCircle2 size={13} aria-hidden="true" />
                          <span>Reviewed</span>
                        </span>
                      ) : (
                        <span className="participant-feedback-status-pill participant-feedback-status-pill--completed">
                          <span>Completed</span>
                        </span>
                      )}
                    </div>

                    {/* Card Body */}
                    <div className="participant-feedback-card-body">
                      <div className="participant-feedback-card-header">
                        <h3 className="participant-feedback-card-title">{tripName}</h3>
                        {location && (
                          <span className="participant-feedback-card-location">
                            <MapPin size={13} aria-hidden="true" />
                            <span>{location}</span>
                          </span>
                        )}
                        <span className="participant-feedback-card-batch">{batchName}</span>
                      </div>

                      {(booking.batchId?.startDate || booking.batchId?.endDate) && (
                        <div className="participant-feedback-card-dates">
                          <CalendarDays size={14} aria-hidden="true" />
                          <span>
                            {formatDate(booking.batchId?.startDate) ?? 'Date unavailable'}
                            {booking.batchId?.endDate ? ` — ${formatDate(booking.batchId.endDate)}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Display Submitted Review summary if already submitted */}
                      {submitted ? (
                        <div className="participant-feedback-review-summary">
                          <div className="participant-feedback-score-row">
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              YOUR RATING
                            </span>
                            <span className="participant-feedback-overall-badge">
                              <Star size={13} className="participant-feedback-overall-star" fill="currentColor" aria-hidden="true" />
                              <span>{submitted.ratingOverall}.0</span>
                            </span>
                          </div>

                          <div className="participant-feedback-ratings-chips">
                            <span className="participant-feedback-rating-chip" title="Guide & Leadership">
                              <UserCheck size={12} aria-hidden="true" />
                              <span>Guide: {submitted.ratingGuide}★</span>
                            </span>
                            <span className="participant-feedback-rating-chip" title="Expedition Food">
                              <Utensils size={12} aria-hidden="true" />
                              <span>Food: {submitted.ratingFood}★</span>
                            </span>
                            <span className="participant-feedback-rating-chip" title="Safety & Altitude Care">
                              <ShieldCheck size={12} aria-hidden="true" />
                              <span>Safety: {submitted.ratingSafety}★</span>
                            </span>
                          </div>

                          {submitted.comments && (
                            <blockquote className="participant-feedback-comment-quote">
                              “{submitted.comments}”
                            </blockquote>
                          )}

                          {submitted.createdAt && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              Submitted on {formatDate(submitted.createdAt)}
                            </span>
                          )}
                        </div>
                      ) : null}

                      {/* Card Footer / Action */}
                      <div className="participant-feedback-card-footer">
                        {submitted ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary participant-feedback-btn-action"
                            onClick={() => openForm(booking)}
                          >
                            <Star size={14} aria-hidden="true" />
                            <span>View Submitted Review</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary participant-feedback-btn-action"
                            onClick={() => openForm(booking)}
                          >
                            <MessageSquare size={14} aria-hidden="true" />
                            <span>Share Your Experience</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 5. Interactive Feedback Modal */}
      {activeBooking && (
        <div className="participant-feedback-backdrop" role="presentation" onClick={closeForm}>
          <section
            className="participant-feedback-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pf-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="participant-feedback-modal-close"
              aria-label="Close feedback form"
              onClick={closeForm}
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="participant-feedback-modal-header">
              <div className="participant-feedback-modal-icon" aria-hidden="true">
                <Star size={22} />
              </div>
              <div className="participant-feedback-modal-header-meta">
                <h2 id="pf-modal-title" className="participant-feedback-modal-title">
                  {activeBooking.tripId?.name || 'Trek Feedback'}
                </h2>
                <p className="participant-feedback-modal-subtitle">
                  {activeBooking.batchId?.batchName || 'Completed Departure'}
                  {activeBooking.batchId?.startDate ? ` · ${formatDate(activeBooking.batchId.startDate)}` : ''}
                </p>
              </div>
            </div>

            <form className="participant-feedback-form" onSubmit={(e) => void handleSubmit(e)} noValidate>
              {/* 4 Interactive Star Rating Rows */}
              {RATING_FIELDS.map(({ name, label, icon: CategoryIcon }) => {
                const currentScore = form[name];
                const hoverScore = hoveredRatings[name];
                const activeScore = hoverScore || currentScore || 0;

                return (
                  <div key={name} className="participant-feedback-rating-row">
                    <div className="participant-feedback-rating-label-group">
                      <CategoryIcon size={16} className="participant-feedback-rating-category-icon" aria-hidden="true" />
                      <span className="participant-feedback-rating-title">{label}</span>
                    </div>

                    <div className="participant-feedback-star-control">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isFilled = starVal <= activeScore;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            className={`participant-feedback-star-btn ${isFilled ? 'participant-feedback-star-btn--filled' : ''}`}
                            aria-label={`Rate ${label} ${starVal} out of 5 stars`}
                            onClick={() => handleRatingSelect(name, starVal)}
                            onMouseEnter={() => handleRatingHover(name, starVal)}
                            onMouseLeave={() => handleRatingHover(name, null)}
                            disabled={submitting || submitSuccess}
                          >
                            <Star
                              size={20}
                              fill={isFilled ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                          </button>
                        );
                      })}
                      <span className="participant-feedback-rating-descriptor" aria-live="polite">
                        {RATING_DESCRIPTORS[activeScore] || 'Tap to rate'}
                      </span>
                    </div>

                    {validationErrors[name] && (
                      <p className="field-error" role="alert" style={{ width: '100%', marginTop: '0.2rem' }}>
                        {validationErrors[name]}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Comments Field */}
              <div className="participant-feedback-form-group">
                <label htmlFor="pf-comments" className="participant-feedback-label">
                  <span>Comments & Highlights</span>
                  <span className="participant-feedback-optional">(optional)</span>
                </label>
                <textarea
                  id="pf-comments"
                  name="comments"
                  className="participant-feedback-textarea"
                  placeholder="Share details about your trek — guide support, camps, mountain weather, acclimatization, food, and moments that stood out…"
                  value={form.comments}
                  onChange={(e) => setForm((prev) => ({ ...prev, comments: e.target.value }))}
                  disabled={submitting || submitSuccess}
                  rows={4}
                />
              </div>

              {/* Feedback Alert Banner */}
              {submitMessage && (
                <div
                  className={`participant-feedback-alert ${
                    submitSuccess ? 'participant-feedback-alert--success' : 'participant-feedback-alert--error'
                  }`}
                  role={submitSuccess ? 'status' : 'alert'}
                >
                  {submitSuccess ? (
                    <CheckCircle2 size={18} aria-hidden="true" />
                  ) : (
                    <AlertCircle size={18} aria-hidden="true" />
                  )}
                  <span>{submitMessage}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="participant-feedback-modal-actions">
                {submitSuccess ? (
                  <button type="button" className="btn btn-secondary" onClick={closeForm}>
                    Done
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn btn-secondary" onClick={closeForm} disabled={submitting}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? (
                        <>
                          <LoaderCircle size={16} className="participant-spin" aria-hidden="true" />
                          <span>Submitting Review…</span>
                        </>
                      ) : (
                        <>
                          <Star size={16} aria-hidden="true" />
                          <span>Submit Trek Feedback</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
