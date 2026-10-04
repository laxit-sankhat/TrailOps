import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Mountain,
  RefreshCw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getMyBookings } from '../../services/bookingService';
import { getAllPublicTrips } from '../../services/tripService';
import type { BookingStatus, ParticipantBookingSummary } from '../../types';
import './ParticipantTripsPage.css';

type ParticipantBooking = Omit<ParticipantBookingSummary, 'tripId' | 'batchId'> & {
  tripId: (NonNullable<ParticipantBookingSummary['tripId']> & { _id?: string }) | null;
  batchId: (NonNullable<ParticipantBookingSummary['batchId']> & {
    _id?: string;
    status?: string;
  }) | null;
};

type PublicTrip = {
  _id: string;
  name: string;
  location?: string;
  description?: string;
  difficultyLevel?: string;
  durationInHours?: number;
  images?: { url: string; publicId?: string }[];
  imageUrl?: string | null;
};

type TripAdventure = {
  key: string;
  bookingId: string;
  tripId?: string;
  name: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  batchName?: string;
  startDate?: string;
  endDate?: string;
  bookingStatus: BookingStatus;
  batchStatus?: string;
  difficultyLevel?: string;
  durationInHours?: number;
  isPast: boolean;
};

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isPastAdventure(batchStatus: string | undefined, endDate: string | undefined, today: Date) {
  if (batchStatus) return batchStatus === 'Completed';
  return Boolean(endDate && new Date(endDate) < today);
}

function getErrorMessage(error: unknown) {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || 'Unable to load your trips. Please try again.'
    : 'Unable to load your trips. Please try again.';
}

function formatBookingStatus(status: BookingStatus): string {
  switch (status) {
    case 'PendingMedicalReview':
      return 'Pending Medical';
    case 'MedicallyApproved':
      return 'Medically Approved';
    default:
      return status;
  }
}

function getBookingStatusClass(status: BookingStatus): string {
  switch (status) {
    case 'Confirmed':
    case 'MedicallyApproved':
      return 'success';
    case 'PendingMedicalReview':
    case 'Inquiry':
    case 'Waitlisted':
      return 'warning';
    case 'Rejected':
    case 'Cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

function getBatchStatusClass(batchStatus?: string): string {
  const s = (batchStatus || '').toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'completed') return 'completed';
  if (s === 'cancelled') return 'cancelled';
  return 'scheduled';
}

function makeTripAdventures(bookings: ParticipantBooking[], trips: PublicTrip[], today: Date): TripAdventure[] {
  const tripsById = new Map(trips.map((trip) => [trip._id, trip]));
  const adventuresByTrip = new Map<string, TripAdventure>();

  bookings.forEach((booking) => {
    const tripId = booking.tripId?._id;
    const publicTrip = tripId ? tripsById.get(tripId) : undefined;
    const tripName = publicTrip?.name || booking.tripId?.name || 'Trek';
    const isPast = isPastAdventure(booking.batchId?.status, booking.batchId?.endDate, today);
    const tripKey = tripId || tripName;
    const key = `${tripKey}:${isPast ? 'past' : 'upcoming'}:${booking._id}`;

    const adventure: TripAdventure = {
      key,
      bookingId: booking._id,
      tripId,
      name: tripName,
      location: publicTrip?.location,
      description: publicTrip?.description,
      imageUrl: publicTrip?.images?.[0]?.url || publicTrip?.imageUrl || undefined,
      batchName: booking.batchId?.batchName,
      startDate: booking.batchId?.startDate,
      endDate: booking.batchId?.endDate,
      bookingStatus: booking.status,
      batchStatus: booking.batchId?.status,
      difficultyLevel: publicTrip?.difficultyLevel,
      durationInHours: publicTrip?.durationInHours,
      isPast
    };

    adventuresByTrip.set(key, adventure);
  });

  return Array.from(adventuresByTrip.values()).sort((a, b) => {
    const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
    if (a.isPast && b.isPast) return timeB - timeA;
    return timeA - timeB;
  });
}

export default function ParticipantTripsPage() {
  const navigate = useNavigate();
  const [adventures, setAdventures] = useState<TripAdventure[]>([]);
  const [rawBookingsCount, setRawBookingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailsNotice, setDetailsNotice] = useState('');

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    setDetailsNotice('');
    try {
      const bookingResponse = await getMyBookings();
      const bookings = (bookingResponse.data.bookings || []) as ParticipantBooking[];
      setRawBookingsCount(bookings.length);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const referencedTripIds = new Set(
        bookings.map((booking) => booking.tripId?._id).filter((id): id is string => Boolean(id))
      );

      let publicTrips: PublicTrip[] = [];
      if (referencedTripIds.size > 0) {
        try {
          const tripResponse = await getAllPublicTrips();
          publicTrips = (tripResponse.data.trips || []) as PublicTrip[];
        } catch (tripError: unknown) {
          console.error(tripError);
          setDetailsNotice('Some trek destination details are currently operating in offline mode.');
        }
      }

      setAdventures(makeTripAdventures(bookings, publicTrips, today));
    } catch (bookingError: unknown) {
      console.error(bookingError);
      setError(getErrorMessage(bookingError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const upcomingTrips = useMemo(() => adventures.filter((a) => !a.isPast), [adventures]);
  const pastTrips = useMemo(() => adventures.filter((a) => a.isPast), [adventures]);
  const activeTrips = useMemo(
    () => adventures.filter((a) => a.batchStatus === 'Active' || (a.bookingStatus === 'Confirmed' && !a.isPast)),
    [adventures]
  );

  const renderJourneyCard = (adventure: TripAdventure) => {
    const sDate = adventure.startDate ? new Date(adventure.startDate) : null;
    const isDateValid = Boolean(sDate && !Number.isNaN(sDate.getTime()));
    const dayStr = isDateValid && sDate ? String(sDate.getDate()).padStart(2, '0') : null;
    const monthStr = isDateValid && sDate
      ? sDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()
      : null;

    return (
      <article
        className={`participant-journey-card ${adventure.isPast ? 'participant-journey-card--past' : ''}`}
        key={adventure.key}
        role="link"
        tabIndex={0}
        aria-label={`View booking for ${adventure.name}`}
        onClick={() => navigate('/dashboard/participant/bookings')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate('/dashboard/participant/bookings');
          }
        }}
      >
        {/* Media / Photo Area with Date Circle */}
        <div className="participant-journey-card__media">
          {adventure.imageUrl ? (
            <img
              className="participant-journey-card__image"
              src={adventure.imageUrl}
              alt={`${adventure.name} trek`}
              loading="lazy"
            />
          ) : (
            <div className="participant-journey-card__fallback" aria-hidden="true">
              <Mountain size={40} className="participant-journey-card__fallback-icon" />
              <span>{adventure.name}</span>
            </div>
          )}

          {/* Difficulty Badge (if available) */}
          {adventure.difficultyLevel && (
            <div className="participant-journey-card__difficulty-badge">
              <span>{adventure.difficultyLevel}</span>
            </div>
          )}

          {/* Prominent Date Circle Badge */}
          {dayStr && monthStr && (
            <div
              className="participant-journey-card__date-badge"
              aria-label={`Departure: ${dayStr} ${monthStr}`}
            >
              <span className="participant-journey-card__date-day">{dayStr}</span>
              <span className="participant-journey-card__date-month">{monthStr}</span>
            </div>
          )}
        </div>

        {/* Card Content Body */}
        <div className="participant-journey-card__content">
          <div className="participant-journey-card__header-row">
            <h3 className="participant-journey-card__title" title={adventure.name}>
              {adventure.name}
            </h3>
            <span
              className={`participant-journey-card__status-pill participant-journey-card__status-pill--${getBookingStatusClass(adventure.bookingStatus)}`}
            >
              {formatBookingStatus(adventure.bookingStatus)}
            </span>
          </div>

          {/* Metadata Row: Location & Duration */}
          {(adventure.location || adventure.durationInHours != null) && (
            <div className="participant-journey-card__meta-row">
              {adventure.location && (
                <span className="participant-journey-card__meta-item">
                  <MapPin size={13} aria-hidden="true" />
                  <span>{adventure.location}</span>
                </span>
              )}
              {adventure.durationInHours != null && (
                <span className="participant-journey-card__meta-item">
                  <Clock size={13} aria-hidden="true" />
                  <span>{adventure.durationInHours} {adventure.durationInHours === 1 ? 'hour' : 'hours'}</span>
                </span>
              )}
            </div>
          )}

          {adventure.description && (
            <p className="participant-journey-card__description">
              {adventure.description}
            </p>
          )}

          {/* Departure & Batch Information Box */}
          <div className="participant-journey-card__batch-box">
            <div className="participant-journey-card__batch-details">
              <span className="participant-journey-card__batch-label">Departure Batch</span>
              <strong className="participant-journey-card__batch-name">
                {adventure.batchName || 'Assigned Batch'}
              </strong>
            </div>
            {adventure.batchStatus && (
              <span
                className={`participant-journey-card__batch-status-pill participant-journey-card__batch-status-pill--${getBatchStatusClass(adventure.batchStatus)}`}
              >
                {adventure.batchStatus}
              </span>
            )}
          </div>

          {/* Schedule Date Range */}
          {(adventure.startDate || adventure.endDate) && (
            <div className="participant-journey-card__dates">
              <CalendarDays size={14} aria-hidden="true" />
              <span>
                {formatDate(adventure.startDate) || 'Date pending'}
                {adventure.endDate ? ` — ${formatDate(adventure.endDate)}` : ''}
              </span>
            </div>
          )}

          {/* Card Footer Actions */}
          <div className="participant-journey-card__footer">
            <Link
              to="/dashboard/participant/bookings"
              className="participant-journey-card__action-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View Booking</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="participant-trips-page">
      <Navbar />
      <main className="participant-trips-main">
        <div className="participant-trips-container">
          {/* 1. Page Header */}
          <header className="participant-trips-header">
            <p className="participant-trips-eyebrow">MY JOURNEY</p>
            <h1>My Trips</h1>
            <p className="participant-trips-subtitle">
              Your upcoming adventures and trekking history.
            </p>
          </header>

          {detailsNotice && (
            <div className="participant-trips-notice" role="status">
              <span>{detailsNotice}</span>
            </div>
          )}

          {/* 2. Loading State */}
          {loading ? (
            <div className="participant-trips-loading" role="status">
              <span className="participant-trips-loading-icon">
                <RefreshCw size={22} aria-hidden="true" />
              </span>
              <p>Discovering your trekking journeys…</p>
            </div>
          ) : error ? (
            /* 3. Error State */
            <div className="participant-trips-error" role="alert">
              <AlertCircle size={22} aria-hidden="true" />
              <div className="participant-trips-error-text">
                <strong>Unable to load your trips</strong>
                <p>{error}</p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary participant-trips-retry-btn"
                onClick={() => void loadTrips()}
              >
                Retry
              </button>
            </div>
          ) : adventures.length === 0 ? (
            /* 4. Complete Empty State */
            <div className="participant-trips-empty">
              <div className="participant-trips-empty-icon" aria-hidden="true">
                <Compass size={32} />
              </div>
              <h3>No trek bookings yet</h3>
              <p>
                You haven't booked any treks yet. Discover upcoming departures and begin your mountain journey.
              </p>
              <Link to="/dashboard/participant/explore" className="btn btn-primary participant-trips-empty-btn">
                Explore Available Treks <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <>
              {/* 5. Journey KPI Summary Cards */}
              <div className="participant-trips-kpis">
                <div className="participant-trips-kpi">
                  <div className="participant-trips-kpi__icon" aria-hidden="true">
                    <CalendarDays size={18} />
                  </div>
                  <div className="participant-trips-kpi__info">
                    <span className="participant-trips-kpi__label">Total Bookings</span>
                    <strong className="participant-trips-kpi__value">{rawBookingsCount}</strong>
                  </div>
                </div>

                <div className="participant-trips-kpi">
                  <div className="participant-trips-kpi__icon participant-trips-kpi__icon--upcoming" aria-hidden="true">
                    <Mountain size={18} />
                  </div>
                  <div className="participant-trips-kpi__info">
                    <span className="participant-trips-kpi__label">Upcoming Trips</span>
                    <strong className="participant-trips-kpi__value">{upcomingTrips.length}</strong>
                  </div>
                </div>

                <div className="participant-trips-kpi">
                  <div className="participant-trips-kpi__icon participant-trips-kpi__icon--active" aria-hidden="true">
                    <Compass size={18} />
                  </div>
                  <div className="participant-trips-kpi__info">
                    <span className="participant-trips-kpi__label">Active / Confirmed</span>
                    <strong className="participant-trips-kpi__value">{activeTrips.length}</strong>
                  </div>
                </div>

                <div className="participant-trips-kpi">
                  <div className="participant-trips-kpi__icon participant-trips-kpi__icon--past" aria-hidden="true">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="participant-trips-kpi__info">
                    <span className="participant-trips-kpi__label">Past Expeditions</span>
                    <strong className="participant-trips-kpi__value">{pastTrips.length}</strong>
                  </div>
                </div>
              </div>

              {/* 6. Upcoming / Active Journeys (Primary Section) */}
              <section className="participant-trips-section" aria-labelledby="upcoming-trips-heading">
                <div className="participant-trips-section__header">
                  <div>
                    <p className="participant-trips-section__eyebrow">UPCOMING EXPEDITIONS</p>
                    <h2 id="upcoming-trips-heading">Upcoming Journeys</h2>
                  </div>
                  <span className="participant-trips-section__badge">
                    {upcomingTrips.length} {upcomingTrips.length === 1 ? 'trip' : 'trips'}
                  </span>
                </div>

                {upcomingTrips.length > 0 ? (
                  <div className="participant-trips-grid">
                    {upcomingTrips.map(renderJourneyCard)}
                  </div>
                ) : (
                  <div className="participant-trips-empty participant-trips-empty--subtle">
                    <div className="participant-trips-empty-icon participant-trips-empty-icon--small" aria-hidden="true">
                      <Mountain size={24} />
                    </div>
                    <h3>No upcoming adventures</h3>
                    <p>Your next trek will appear here once you have a confirmed or active booking.</p>
                    <Link to="/dashboard/participant/explore" className="btn btn-secondary btn-sm participant-trips-empty-btn">
                      Explore Treks <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </section>

              {/* 7. Completed / Past Journeys Section */}
              <section
                className="participant-trips-section participant-trips-section--past"
                aria-labelledby="past-trips-heading"
              >
                <div className="participant-trips-section__header">
                  <div>
                    <p className="participant-trips-section__eyebrow">EXPEDITION ARCHIVE</p>
                    <h2 id="past-trips-heading">Past Expeditions</h2>
                  </div>
                  <span className="participant-trips-section__badge participant-trips-section__badge--past">
                    {pastTrips.length} {pastTrips.length === 1 ? 'expedition' : 'expeditions'}
                  </span>
                </div>

                {pastTrips.length > 0 ? (
                  <div className="participant-trips-grid">
                    {pastTrips.map(renderJourneyCard)}
                  </div>
                ) : (
                  <div className="participant-trips-empty participant-trips-empty--subtle">
                    <p className="participant-trips-empty-text">
                      Your completed treks and expedition trail history will be archived here.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
