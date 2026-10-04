import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  HeartPulse,
  Info,
  MapPin,
  Mountain,
  QrCode,
  RefreshCw,
  Star,
  Ticket,
  Users,
  X,
  XCircle
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import {
  cancelBooking,
  getBookingQR,
  getMyBookings,
  submitForMedicalReview
} from '../../services/bookingService';
import { getAllPublicTrips } from '../../services/tripService';
import { submitFeedback } from '../../services/feedbackService';
import CancelBookingModal from '../../components/participant/CancelBookingModal';
import type { BookingStatus, ParticipantBookingSummary, PublicTrip } from '../../types';
import './ParticipantBookingsPage.css';

type ParticipantBooking = Omit<ParticipantBookingSummary, 'tripId' | 'batchId'> & {
  _id: string;
  tripId: (NonNullable<ParticipantBookingSummary['tripId']> & { _id?: string }) | null;
  batchId: (NonNullable<ParticipantBookingSummary['batchId']> & {
    _id?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) | null;
  groupId?: string | null;
  qrCodeValue?: string;
};

type FeedbackForm = {
  bookingId: string;
  ratingGuide: number;
  ratingFood: number;
  ratingSafety: number;
  ratingOverall: number;
  comments: string;
};

type FilterTab = 'all' | 'upcoming' | 'confirmed' | 'pending' | 'past_cancelled';

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getErrorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : fallback;
}

function isPastAdventure(booking: ParticipantBooking, today: Date) {
  if (booking.batchId?.status) return booking.batchId.status === 'Completed';
  const endDate = booking.batchId?.endDate;
  return Boolean(endDate && new Date(endDate) < today);
}

const cancellableStatuses: BookingStatus[] = [
  'Inquiry',
  'PendingMedicalReview',
  'MedicallyApproved',
  'Confirmed'
];

const initialFeedbackForm: FeedbackForm = {
  bookingId: '',
  ratingGuide: 5,
  ratingFood: 5,
  ratingSafety: 5,
  ratingOverall: 5,
  comments: ''
};

function formatBookingReference(id: string): string {
  if (!id) return '';
  const suffix = id.slice(-6).toUpperCase();
  return `#BK-${suffix}`;
}

export default function ParticipantBookingsPage() {
  const [bookings, setBookings] = useState<ParticipantBooking[]>([]);
  const [publicTripsMap, setPublicTripsMap] = useState<Map<string, PublicTrip>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');
  const [busyBookingId, setBusyBookingId] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [qrBooking, setQrBooking] = useState<ParticipantBooking | null>(null);
  const [feedbackBooking, setFeedbackBooking] = useState<ParticipantBooking | null>(null);
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>(initialFeedbackForm);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const [bookingToCancel, setBookingToCancel] = useState<ParticipantBooking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchBookingsAndTrips = useCallback(async () => {
    try {
      const response = await getMyBookings();
      const rawBookings = (response.data.bookings || []) as ParticipantBooking[];
      setBookings(rawBookings);
      setError('');

      // Fetch public trips quietly to enrich images and locations if available
      try {
        const tripsRes = await getAllPublicTrips();
        const tripsList = (tripsRes.data.trips || []) as PublicTrip[];
        const map = new Map<string, PublicTrip>();
        tripsList.forEach((t) => map.set(t._id, t));
        setPublicTripsMap(map);
      } catch (tripsErr) {
        console.warn('Could not fetch public trips for image enrichment:', tripsErr);
      }
    } catch (fetchError: unknown) {
      console.error(fetchError);
      setError('Unable to load your bookings. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBookingsAndTrips();
  }, [fetchBookingsAndTrips]);

  // Keyboard close for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (qrImage) {
          setQrImage('');
          setQrBooking(null);
        }
        if (feedbackBooking && !submittingFeedback) {
          setFeedbackBooking(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [qrImage, feedbackBooking, submittingFeedback]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status === 'Confirmed').length;
    const pendingReview = bookings.filter(
      (b) => b.status === 'PendingMedicalReview' || b.status === 'Inquiry'
    ).length;
    const waitlisted = bookings.filter((b) => b.status === 'Waitlisted').length;
    return { total, confirmed, pendingReview, waitlisted };
  }, [bookings]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const upcoming = bookings.filter(
      (b) => !isPastAdventure(b, today) && b.status !== 'Cancelled'
    ).length;
    const confirmed = bookings.filter((b) => b.status === 'Confirmed').length;
    const pending = bookings.filter(
      (b) => b.status === 'PendingMedicalReview' || b.status === 'Inquiry'
    ).length;
    const pastCancelled = bookings.filter(
      (b) => isPastAdventure(b, today) || b.status === 'Cancelled'
    ).length;
    return { all: bookings.length, upcoming, confirmed, pending, pastCancelled };
  }, [bookings, today]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const isPast = isPastAdventure(b, today);
      switch (activeFilter) {
        case 'upcoming':
          return !isPast && b.status !== 'Cancelled';
        case 'confirmed':
          return b.status === 'Confirmed';
        case 'pending':
          return b.status === 'PendingMedicalReview' || b.status === 'Inquiry';
        case 'past_cancelled':
          return isPast || b.status === 'Cancelled';
        case 'all':
        default:
          return true;
      }
    });
  }, [bookings, activeFilter, today]);

  const handleOpenCancelModal = (booking: ParticipantBooking) => {
    setBookingToCancel(booking);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    setCancelling(true);
    setBusyBookingId(bookingToCancel._id);
    setMessage('');
    try {
      await cancelBooking(bookingToCancel._id);
      setMessage('Booking cancelled successfully.');
      setMessageTone('success');
      setBookingToCancel(null);
      await fetchBookingsAndTrips();
    } catch (actionError: unknown) {
      setMessage(getErrorMessage(actionError, 'Failed to cancel booking.'));
      setMessageTone('error');
    } finally {
      setCancelling(false);
      setBusyBookingId('');
    }
  };

  const handleSubmitMedical = async (booking: ParticipantBooking) => {
    setBusyBookingId(booking._id);
    setMessage('');
    try {
      const response = await submitForMedicalReview(booking._id);
      setMessage(`Booking submitted for medical review. Status: ${response.data.booking.status}`);
      setMessageTone('success');
      await fetchBookingsAndTrips();
    } catch (actionError: unknown) {
      const errorMsg = getErrorMessage(actionError, 'Failed to submit for medical review.');
      setMessage(errorMsg);
      setMessageTone('error');
    } finally {
      setBusyBookingId('');
    }
  };

  const handleShowQr = async (booking: ParticipantBooking) => {
    setBusyBookingId(booking._id);
    setMessage('');
    try {
      const response = await getBookingQR(booking._id);
      setQrImage(response.data.qrImage);
      setQrBooking(booking);
    } catch (actionError: unknown) {
      setMessage(getErrorMessage(actionError, 'Failed to retrieve check-in QR code.'));
      setMessageTone('error');
    } finally {
      setBusyBookingId('');
    }
  };

  const openFeedback = (booking: ParticipantBooking) => {
    setFeedbackBooking(booking);
    setFeedbackForm({ ...initialFeedbackForm, bookingId: booking._id });
    setFeedbackMessage('');
  };

  const handleFeedbackSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingFeedback(true);
    setFeedbackMessage('');
    try {
      await submitFeedback(feedbackForm);
      setFeedbackMessage('Thank you! Your feedback has been submitted successfully.');
    } catch (submitError: unknown) {
      setFeedbackMessage(getErrorMessage(submitError, 'Unable to submit feedback.'));
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="participant-booking-badge participant-booking-badge--success">
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>Confirmed</span>
          </span>
        );
      case 'MedicallyApproved':
        return (
          <span className="participant-booking-badge participant-booking-badge--success">
            <CheckCircle2 size={13} aria-hidden="true" />
            <span>Medically Approved</span>
          </span>
        );
      case 'PendingMedicalReview':
        return (
          <span className="participant-booking-badge participant-booking-badge--warning">
            <Clock size={13} aria-hidden="true" />
            <span>Medical Review Pending</span>
          </span>
        );
      case 'Inquiry':
        return (
          <span className="participant-booking-badge participant-booking-badge--warning">
            <HeartPulse size={13} aria-hidden="true" />
            <span>Action Required: Medical</span>
          </span>
        );
      case 'Waitlisted':
        return (
          <span className="participant-booking-badge participant-booking-badge--neutral">
            <Clock size={13} aria-hidden="true" />
            <span>Waitlisted</span>
          </span>
        );
      case 'Rejected':
        return (
          <span className="participant-booking-badge participant-booking-badge--danger">
            <XCircle size={13} aria-hidden="true" />
            <span>Medical Rejected</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="participant-booking-badge participant-booking-badge--danger">
            <XCircle size={13} aria-hidden="true" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="participant-booking-badge participant-booking-badge--neutral">
            <span>{status}</span>
          </span>
        );
    }
  };

  const renderMedicalReviewStatus = (status: BookingStatus) => {
    switch (status) {
      case 'PendingMedicalReview':
        return (
          <div className="participant-booking-medical-note participant-booking-medical-note--pending">
            <HeartPulse size={14} aria-hidden="true" />
            <span>Awaiting clinical clearance from Medical Officer.</span>
          </div>
        );
      case 'MedicallyApproved':
        return (
          <div className="participant-booking-medical-note participant-booking-medical-note--approved">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>Medical clearance granted for high altitude.</span>
          </div>
        );
      case 'Inquiry':
        return (
          <div className="participant-booking-medical-note participant-booking-medical-note--action">
            <AlertCircle size={14} aria-hidden="true" />
            <span>Please submit your medical profile to proceed.</span>
          </div>
        );
      case 'Rejected':
        return (
          <div className="participant-booking-medical-note participant-booking-medical-note--rejected">
            <XCircle size={14} aria-hidden="true" />
            <span>Medical clearance declined. Check medical dashboard for notes.</span>
          </div>
        );
      case 'Confirmed':
        return (
          <div className="participant-booking-medical-note participant-booking-medical-note--confirmed">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>Medical & reservation requirements verified.</span>
          </div>
        );
      default:
        return null;
    }
  };

  const renderBookingCard = (booking: ParticipantBooking) => {
    const isPast = isPastAdventure(booking, today);
    const tripId = booking.tripId?._id;
    const publicTrip = tripId ? publicTripsMap.get(tripId) : undefined;
    const tripName = publicTrip?.name || booking.tripId?.name || 'Trek Adventure';
    const tripImage = publicTrip?.images?.[0]?.url || publicTrip?.imageUrl;
    const location = publicTrip?.location;
    const busy = busyBookingId === booking._id;

    // Date calculations
    const sDate = booking.batchId?.startDate ? new Date(booking.batchId.startDate) : null;
    const isDateValid = Boolean(sDate && !Number.isNaN(sDate.getTime()));
    const dayStr = isDateValid && sDate ? String(sDate.getDate()).padStart(2, '0') : null;
    const monthStr = isDateValid && sDate
      ? sDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()
      : null;

    const canGiveFeedback =
      booking.status === 'Confirmed' && (!isPast || booking.batchId?.status === 'Completed');
    const isCancellable = !isPast && cancellableStatuses.includes(booking.status);

    return (
      <article
        key={booking._id}
        className={`participant-booking-record ${isPast ? 'participant-booking-record--past' : ''}`}
      >
        <div className="participant-booking-record-main">
          {/* Visual Thumbnail & Date circle */}
          <div className="participant-booking-visual">
            {tripImage ? (
              <img
                src={tripImage}
                alt={tripName}
                className="participant-booking-thumb"
                loading="lazy"
              />
            ) : (
              <div className="participant-booking-thumb participant-booking-thumb--placeholder">
                <Mountain size={28} aria-hidden="true" />
              </div>
            )}
            {dayStr && monthStr && (
              <div className="participant-booking-date-badge" aria-label={`Departure: ${monthStr} ${dayStr}`}>
                <span className="participant-booking-date-badge-day">{dayStr}</span>
                <span className="participant-booking-date-badge-month">{monthStr}</span>
              </div>
            )}
          </div>

          {/* Core Info & Metadata */}
          <div className="participant-booking-details">
            {/* Top row: Reference ID, Status, Group indicator */}
            <div className="participant-booking-header-row">
              <div className="participant-booking-identity">
                <span
                  className="participant-booking-ref"
                  title={`Booking ID: ${booking._id}`}
                >
                  {formatBookingReference(booking._id)}
                </span>
                {booking.groupId && (
                  <span className="participant-booking-group-tag" title="Group Booking">
                    <Users size={12} aria-hidden="true" />
                    <span>Group Booking</span>
                  </span>
                )}
              </div>
              <div className="participant-booking-status-wrap">
                {renderStatusBadge(booking.status)}
              </div>
            </div>

            {/* Trip Title & Departure / Batch */}
            <h3 className="participant-booking-trip-title">{tripName}</h3>

            <div className="participant-booking-batch-line">
              <span className="participant-booking-batch-name">
                {booking.batchId?.batchName || 'Departure Batch details unavailable'}
              </span>
              {booking.batchId?.status && (
                <span className={`participant-batch-pill participant-batch-pill--${booking.batchId.status.toLowerCase()}`}>
                  {booking.batchId.status}
                </span>
              )}
            </div>

            {/* Departure Info Metadata Grid */}
            <div className="participant-booking-meta-grid">
              {(booking.batchId?.startDate || booking.batchId?.endDate) && (
                <div className="participant-booking-meta-item">
                  <CalendarDays size={14} aria-hidden="true" />
                  <span>
                    {formatDate(booking.batchId.startDate) || 'Start date TBA'}
                    {booking.batchId.endDate ? ` — ${formatDate(booking.batchId.endDate)}` : ''}
                  </span>
                </div>
              )}

              {location && (
                <div className="participant-booking-meta-item">
                  <MapPin size={14} aria-hidden="true" />
                  <span>{location}</span>
                </div>
              )}
            </div>

            {/* Medical Review Status Note */}
            {renderMedicalReviewStatus(booking.status)}
          </div>
        </div>

        {/* Actions Row */}
        <div className="participant-booking-actions-row">
          <div className="participant-booking-actions-left">
            {/* Context message if inquiry */}
            {booking.status === 'Inquiry' && (
              <span className="participant-booking-action-hint">
                Submit medical profile to request clearance.
              </span>
            )}
            {booking.status === 'Confirmed' && (
              <span className="participant-booking-action-hint">
                Check-in QR code is ready for departure.
              </span>
            )}
          </div>

          <div className="participant-booking-buttons">
            {!isPast && booking.status === 'Inquiry' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() => void handleSubmitMedical(booking)}
              >
                <HeartPulse size={15} aria-hidden="true" />
                <span>{busy ? 'Submitting…' : 'Submit Medical'}</span>
              </button>
            )}

            {!isPast && booking.status === 'Confirmed' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => void handleShowQr(booking)}
              >
                <QrCode size={15} aria-hidden="true" />
                <span>{busy ? 'Loading…' : 'View Check-in QR'}</span>
              </button>
            )}

            {canGiveFeedback && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => openFeedback(booking)}
              >
                <Star size={14} aria-hidden="true" />
                <span>Give Feedback</span>
              </button>
            )}

            {isCancellable && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                disabled={busy}
                onClick={() => handleOpenCancelModal(booking)}
              >
                <XCircle size={14} aria-hidden="true" />
                <span>{busy && busyBookingId === booking._id ? 'Cancelling…' : 'Cancel Booking'}</span>
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="participant-bookings-page">
      <Navbar />

      <main className="participant-bookings-main">
        <div className="participant-bookings-container">
          {/* 1. Page Header */}
          <header className="participant-bookings-header">
            <div className="participant-bookings-header-content">
              <p className="participant-bookings-eyebrow">BOOKINGS</p>
              <h1 className="participant-bookings-title">My Bookings</h1>
              <p className="participant-bookings-subtitle">
                Manage your trek reservations, medical status, and booking details.
              </p>
            </div>
            <div className="participant-bookings-header-actions">
              <Link to="/dashboard/participant/explore" className="btn btn-secondary">
                <Compass size={16} aria-hidden="true" />
                <span>Explore Treks</span>
              </Link>
            </div>
          </header>

          {/* Feedback/Status Alert Banner */}
          {message && (
            <div
              className={`participant-bookings-alert participant-bookings-alert--${messageTone}`}
              role="status"
            >
              {messageTone === 'error' ? (
                <AlertCircle size={18} aria-hidden="true" />
              ) : messageTone === 'success' ? (
                <CheckCircle2 size={18} aria-hidden="true" />
              ) : (
                <Info size={18} aria-hidden="true" />
              )}
              <div className="participant-bookings-alert-text">
                <span>{message}</span>
                {message.toLowerCase().includes('medical profile') && (
                  <Link
                    to="/dashboard/participant/medical"
                    className="participant-bookings-alert-link"
                  >
                    Go to Medical Profile &rarr;
                  </Link>
                )}
              </div>
              <button
                type="button"
                className="participant-bookings-alert-close"
                aria-label="Dismiss message"
                onClick={() => setMessage('')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* 2. Booking Summary KPI Cards */}
          <section className="participant-bookings-kpi-grid" aria-label="Bookings overview metrics">
            <article className="participant-bookings-kpi-card">
              <div className="participant-bookings-kpi-icon-wrap participant-bookings-kpi-icon-wrap--primary">
                <Ticket size={20} aria-hidden="true" />
              </div>
              <div className="participant-bookings-kpi-data">
                <span className="participant-bookings-kpi-label">Total Bookings</span>
                <span className="participant-bookings-kpi-value">{summaryMetrics.total}</span>
              </div>
            </article>

            <article className="participant-bookings-kpi-card">
              <div className="participant-bookings-kpi-icon-wrap participant-bookings-kpi-icon-wrap--success">
                <CheckCircle2 size={20} aria-hidden="true" />
              </div>
              <div className="participant-bookings-kpi-data">
                <span className="participant-bookings-kpi-label">Confirmed</span>
                <span className="participant-bookings-kpi-value">{summaryMetrics.confirmed}</span>
              </div>
            </article>

            <article className="participant-bookings-kpi-card">
              <div className="participant-bookings-kpi-icon-wrap participant-bookings-kpi-icon-wrap--warning">
                <HeartPulse size={20} aria-hidden="true" />
              </div>
              <div className="participant-bookings-kpi-data">
                <span className="participant-bookings-kpi-label">Pending Review</span>
                <span className="participant-bookings-kpi-value">{summaryMetrics.pendingReview}</span>
              </div>
            </article>

            <article className="participant-bookings-kpi-card">
              <div className="participant-bookings-kpi-icon-wrap participant-bookings-kpi-icon-wrap--neutral">
                <Clock size={20} aria-hidden="true" />
              </div>
              <div className="participant-bookings-kpi-data">
                <span className="participant-bookings-kpi-label">Waitlisted</span>
                <span className="participant-bookings-kpi-value">{summaryMetrics.waitlisted}</span>
              </div>
            </article>
          </section>

          {/* Main Content Area */}
          {loading ? (
            /* Loading Skeletons */
            <div className="participant-bookings-skeletons" aria-busy="true" aria-label="Loading bookings">
              {[1, 2, 3].map((n) => (
                <div key={n} className="participant-booking-skeleton-card">
                  <div className="participant-skeleton-thumb" />
                  <div className="participant-skeleton-body">
                    <div className="participant-skeleton-bar participant-skeleton-bar--sm" />
                    <div className="participant-skeleton-bar participant-skeleton-bar--lg" />
                    <div className="participant-skeleton-bar participant-skeleton-bar--md" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State with Retry */
            <div className="participant-bookings-error-card" role="alert">
              <AlertCircle size={28} className="participant-bookings-error-icon" aria-hidden="true" />
              <div className="participant-bookings-error-content">
                <h3>Failed to load bookings</h3>
                <p>{error}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setLoading(true);
                  void fetchBookingsAndTrips();
                }}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Try Again</span>
              </button>
            </div>
          ) : bookings.length === 0 ? (
            /* 9. Overall Empty State */
            <div className="participant-bookings-empty-hero">
              <div className="participant-bookings-empty-icon-wrap">
                <Ticket size={36} aria-hidden="true" />
              </div>
              <h2>No bookings yet</h2>
              <p>Your trek reservations will appear here once you book an adventure.</p>
              <Link to="/dashboard/participant/explore" className="btn btn-primary">
                <Compass size={16} aria-hidden="true" />
                <span>Explore Treks</span>
              </Link>
            </div>
          ) : (
            /* Booking List & Filters */
            <section className="participant-bookings-content-area" aria-label="Bookings list">
              {/* 10. Filter Tabs */}
              <div className="participant-bookings-filters" role="tablist" aria-label="Filter bookings by status">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === 'all'}
                  className={`participant-filter-tab ${activeFilter === 'all' ? 'participant-filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  <span>All</span>
                  <span className="participant-filter-count">{tabCounts.all}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === 'upcoming'}
                  className={`participant-filter-tab ${activeFilter === 'upcoming' ? 'participant-filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('upcoming')}
                >
                  <span>Upcoming & Active</span>
                  <span className="participant-filter-count">{tabCounts.upcoming}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === 'confirmed'}
                  className={`participant-filter-tab ${activeFilter === 'confirmed' ? 'participant-filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('confirmed')}
                >
                  <span>Confirmed</span>
                  <span className="participant-filter-count">{tabCounts.confirmed}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === 'pending'}
                  className={`participant-filter-tab ${activeFilter === 'pending' ? 'participant-filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('pending')}
                >
                  <span>Pending Medical</span>
                  <span className="participant-filter-count">{tabCounts.pending}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === 'past_cancelled'}
                  className={`participant-filter-tab ${activeFilter === 'past_cancelled' ? 'participant-filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('past_cancelled')}
                >
                  <span>Past & Cancelled</span>
                  <span className="participant-filter-count">{tabCounts.pastCancelled}</span>
                </button>
              </div>

              {/* Bookings List or Filter Empty State */}
              {filteredBookings.length > 0 ? (
                <div className="participant-bookings-stack">
                  {filteredBookings.map((booking) => renderBookingCard(booking))}
                </div>
              ) : (
                <div className="participant-bookings-filter-empty">
                  <AlertCircle size={24} aria-hidden="true" />
                  <h4>No bookings in this filter</h4>
                  <p>None of your reservations match the selected view.</p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveFilter('all')}
                  >
                    View All Bookings
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* QR Code Check-in Modal */}
      {qrImage && (
        <div
          className="participant-bookings-backdrop"
          role="presentation"
          onClick={() => {
            setQrImage('');
            setQrBooking(null);
          }}
        >
          <section
            className="participant-bookings-modal participant-bookings-qr-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="participant-bookings-qr-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="participant-bookings-modal-close"
              aria-label="Close QR code dialog"
              onClick={() => {
                setQrImage('');
                setQrBooking(null);
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div className="participant-bookings-modal-icon">
              <QrCode size={24} aria-hidden="true" />
            </div>
            <h2 id="participant-bookings-qr-title">Check-in QR Code</h2>
            <p className="participant-bookings-qr-subtitle">
              {qrBooking?.tripId?.name
                ? `${qrBooking.tripId.name} • ${qrBooking.batchId?.batchName || 'Departure'}`
                : 'Present this verification code during trek check-in.'}
            </p>
            <div className="participant-bookings-qr-frame">
              <img src={qrImage} alt="Booking QR Code for check-in" />
            </div>
            <span className="participant-bookings-qr-id">
              {qrBooking ? formatBookingReference(qrBooking._id) : ''}
            </span>
            <p className="participant-bookings-qr-helper">
              Keep this screen accessible offline or take a screenshot before heading out to the trailhead.
            </p>
          </section>
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackBooking && (
        <div
          className="participant-bookings-backdrop"
          role="presentation"
          onClick={() => {
            if (!submittingFeedback) setFeedbackBooking(null);
          }}
        >
          <section
            className="participant-bookings-modal participant-bookings-feedback-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="participant-bookings-feedback-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="participant-bookings-modal-close"
              aria-label="Close feedback form"
              disabled={submittingFeedback}
              onClick={() => setFeedbackBooking(null)}
            >
              <X size={18} aria-hidden="true" />
            </button>
            <h2 id="participant-bookings-feedback-title">
              Feedback for {feedbackBooking.tripId?.name || 'Trek Adventure'}
            </h2>
            <p className="participant-bookings-modal-sub">
              Your ratings help our field leads and organizations elevate trek quality and safety.
            </p>

            <form onSubmit={(e) => void handleFeedbackSubmit(e)}>
              <div className="participant-bookings-rating-grid">
                {([
                  ['ratingGuide', 'Guide & Leadership'],
                  ['ratingFood', 'Food & Rations'],
                  ['ratingSafety', 'Safety & Protocol'],
                  ['ratingOverall', 'Overall Trek Experience']
                ] as const).map(([name, label]) => (
                  <div className="form-group" key={name}>
                    <label htmlFor={`participant-feedback-${name}`}>{label} (1–5)</label>
                    <input
                      id={`participant-feedback-${name}`}
                      name={name}
                      type="number"
                      min="1"
                      max="5"
                      value={feedbackForm[name]}
                      onChange={(e) =>
                        setFeedbackForm({
                          ...feedbackForm,
                          [name]: Number(e.target.value)
                        })
                      }
                      required
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label htmlFor="participant-feedback-comments">Comments & Observations</label>
                <textarea
                  id="participant-feedback-comments"
                  name="comments"
                  value={feedbackForm.comments}
                  onChange={(e) =>
                    setFeedbackForm({ ...feedbackForm, comments: e.target.value })
                  }
                  placeholder="Share details regarding trail pace, equipment, terrain, or team coordination…"
                  rows={3}
                />
              </div>

              <div className="participant-bookings-modal-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submittingFeedback}
                  onClick={() => setFeedbackBooking(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingFeedback}
                >
                  {submittingFeedback ? 'Submitting…' : 'Submit Feedback'}
                </button>
              </div>
            </form>

            {feedbackMessage && (
              <p className="participant-bookings-feedback-message" role="status">
                {feedbackMessage}
              </p>
            )}
          </section>
        </div>
      )}

      {/* 6. Cancel Booking Modal - Preserving existing CancelBookingModal */}
      {bookingToCancel && (
        <CancelBookingModal
          isOpen={Boolean(bookingToCancel)}
          tripName={bookingToCancel.tripId?.name || 'this trek'}
          isProcessing={cancelling}
          onConfirm={() => void handleConfirmCancel()}
          onClose={() => {
            if (!cancelling) setBookingToCancel(null);
          }}
        />
      )}
    </div>
  );
}
