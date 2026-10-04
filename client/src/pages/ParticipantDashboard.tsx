import { useState, useEffect, useMemo } from 'react';
import { isAxiosError } from 'axios';
import {
  Activity,
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  HeartPulse,
  MapPin,
  Mountain,
  QrCode,
  Star,
  Users,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { getAllPublicTrips, getBatchesForTrip } from '../services/tripService';
import {
  createBooking,
  getMyBookings,
  cancelBooking,
  getBookingQR
} from '../services/bookingService';
import { getMyOpenGroups } from '../services/bookingGroupService';
import { getTrekStatusHistory } from '../services/trekStatusService';
import { getMyNotifications } from '../services/notificationService';
import ParticipantTripCard from '../components/participant/ParticipantTripCard';
import CancelBookingModal from '../components/participant/CancelBookingModal';
import type { BatchSummary, ParticipantBookingSummary, PublicTrip } from '../types';
import './ParticipantDashboard.css';

type ParticipantBooking = ParticipantBookingSummary & {
  _id: string;
  tripId: (NonNullable<ParticipantBookingSummary['tripId']> & { _id?: string }) | null;
  batchId: (NonNullable<ParticipantBookingSummary['batchId']> & { _id?: string; status?: string }) | null;
};

type TrekUpdate = {
  _id?: string;
  batchId: string;
  batchName?: string;
  tripName?: string;
  milestone: string;
  timestamp?: string;
};

type ParticipantGroup = {
  _id: string;
  groupCode: string;
  batchId?: { batchName: string } | null;
};

type ParticipantNotification = {
  _id: string;
  message: string;
  relatedType?: string;
  isRead: boolean;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
}

function getApiErrorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : fallback;
}

export default function ParticipantDashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<PublicTrip[]>([]);
  const [batchesByTrip, setBatchesByTrip] = useState<Record<string, BatchSummary[]>>({});
  const [myBookings, setMyBookings] = useState<ParticipantBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [openGroups, setOpenGroups] = useState<ParticipantGroup[]>([]);
  const [message, setMessage] = useState('');
  const [trekUpdates, setTrekUpdates] = useState<TrekUpdate[]>([]);
  const [loadingTrekUpdates, setLoadingTrekUpdates] = useState(true);
  const [trekUpdatesError, setTrekUpdatesError] = useState('');
  const [notifications, setNotifications] = useState<ParticipantNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notificationsError, setNotificationsError] = useState('');
  const [qrImage, setQrImage] = useState('');

  // Cancellation modal state
  const [cancellingBooking, setCancellingBooking] = useState<{ id: string; tripName: string } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch participant's bookings
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

  // Initial load
  useEffect(() => {
    let active = true;

    const fetchTrips = async () => {
      try {
        const response = await getAllPublicTrips();
        if (active) {
          const loadedTrips: PublicTrip[] = response.data.trips || [];
          setTrips(loadedTrips);

          const batchEntries = await Promise.all(
            loadedTrips.map(async (t) => {
              try {
                const bRes = await getBatchesForTrip(t._id);
                return [t._id, (bRes.data.batches || []) as BatchSummary[]] as const;
              } catch {
                return [t._id, [] as BatchSummary[]] as const;
              }
            })
          );
          if (active) {
            setBatchesByTrip(Object.fromEntries(batchEntries));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    void fetchTrips();

    getMyOpenGroups()
      .then((response) => {
        if (active) setOpenGroups(response.data.groups || []);
      })
      .catch((err) => console.error(err));

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

  // Fetch notifications
  useEffect(() => {
    let active = true;
    const fetchNotifications = async () => {
      try {
        const response = await getMyNotifications();
        if (!active) return;
        setNotifications(response.data.notifications || []);
        setUnreadNotificationCount(response.data.unreadCount || 0);
        setNotificationsError('');
      } catch (err) {
        console.error(err);
        if (active) setNotificationsError('Unable to load your notifications right now.');
      } finally {
        if (active) setLoadingNotifications(false);
      }
    };

    void fetchNotifications();
    return () => {
      active = false;
    };
  }, []);

  // Fetch trek updates for booked batches
  useEffect(() => {
    let active = true;
    const bookedBatches = Array.from(
      new Map(
        myBookings
          .filter((booking) => booking.batchId?._id)
          .map((booking) => [
            booking.batchId!._id!,
            {
              batchName: booking.batchId!.batchName,
              tripName: booking.tripId?.name
            }
          ])
      ).entries()
    );

    const fetchUpdates = async () => {
      setLoadingTrekUpdates(true);
      setTrekUpdatesError('');
      if (bookedBatches.length === 0) {
        if (active) {
          setTrekUpdates([]);
          setLoadingTrekUpdates(false);
        }
        return;
      }
      const results = await Promise.allSettled(
        bookedBatches.map(async ([batchId, bookingDetails]): Promise<TrekUpdate[]> => {
          const response = await getTrekStatusHistory(batchId);
          return (
            (response.data.updates || []) as Omit<TrekUpdate, 'batchId' | 'batchName' | 'tripName'>[]
          )
            .filter((update) => Boolean(update.milestone))
            .map((update) => ({
              ...update,
              batchId,
              batchName: bookingDetails.batchName,
              tripName: bookingDetails.tripName
            }));
        })
      );
      if (!active) return;

      const fulfilledResults = results.filter(
        (result): result is PromiseFulfilledResult<TrekUpdate[]> => result.status === 'fulfilled'
      );
      const updates = fulfilledResults.flatMap((result) => result.value);
      updates.sort(
        (first, second) =>
          new Date(second.timestamp || 0).getTime() - new Date(first.timestamp || 0).getTime()
      );
      setTrekUpdates(updates);
      if (fulfilledResults.length === 0) {
        setTrekUpdatesError('Unable to load trek updates right now.');
      }
      setLoadingTrekUpdates(false);
    };

    void fetchUpdates();
    return () => {
      active = false;
    };
  }, [myBookings]);

  // Handle booking directly from preview cards
  const handleBookBatch = async (batchId: string) => {
    if (!batchId) return;
    try {
      const response = await createBooking({ batchId });
      setMessage(`Booking created successfully - status: ${response.data.booking.status}`);
      await fetchMyBookings();
    } catch (err: unknown) {
      setMessage(getApiErrorMessage(err, 'Something went wrong while booking'));
    }
  };

  // Open confirmation modal for cancellation
  const handleInitiateCancel = (id: string, tripName?: string) => {
    setCancellingBooking({
      id,
      tripName: tripName || 'this trek'
    });
  };

  // Confirmed cancellation using existing cancelBooking service
  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setIsCancelling(true);
    try {
      await cancelBooking(cancellingBooking.id);
      setMessage('Booking cancelled successfully');
      setCancellingBooking(null);
      await fetchMyBookings();
    } catch (err: unknown) {
      const errorMessage = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setMessage(errorMessage || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  // Fetch QR code for confirmed booking
  const handleFetchQRForBooking = async (id: string) => {
    try {
      const response = await getBookingQR(id);
      setQrImage(response.data.qrImage);
    } catch (err: unknown) {
      const errorMessage = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined;
      setMessage(errorMessage || 'Failed to retrieve QR code');
    }
  };

  // Journey metrics calculations
  const greeting =
    new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 18
        ? 'Good afternoon'
        : 'Good evening';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isPastAdventure = (booking: ParticipantBooking) => {
    if (booking.batchId?.status) return booking.batchId.status === 'Completed';
    const endDate = booking.batchId?.endDate;
    return Boolean(endDate && new Date(endDate) < today);
  };

  const pastBookings = myBookings.filter(isPastAdventure);
  const upcomingActiveBookings = myBookings.filter((booking) => !isPastAdventure(booking));
  const upcomingBookings = myBookings
    .filter((booking) => {
      const endDate = booking.batchId?.endDate;
      const startDate = booking.batchId?.startDate;
      const isUpcomingOrActive = endDate
        ? new Date(endDate) >= today
        : Boolean(startDate && new Date(startDate) >= today);
      return (
        isUpcomingOrActive &&
        !['Cancelled', 'Rejected', 'Draft', 'Waitlisted'].includes(booking.status)
      );
    })
    .sort((first, second) => {
      if (first.status === 'Confirmed' && second.status !== 'Confirmed') return -1;
      if (second.status === 'Confirmed' && first.status !== 'Confirmed') return 1;
      return (
        new Date(first.batchId?.startDate || 0).getTime() -
        new Date(second.batchId?.startDate || 0).getTime()
      );
    });

  const nextBooking = upcomingBookings[0];
  const nextTrip = nextBooking
    ? trips.find((trip) => trip._id === nextBooking.tripId?._id)
    : undefined;

  const confirmedBookings = myBookings.filter((booking) => booking.status === 'Confirmed').length;
  const displayableUpdates = trekUpdates.slice(0, 5);

  const bookedBatchIds = useMemo(
    () =>
      new Set(
        myBookings
          .filter((b) => b.batchId?._id && !['Cancelled', 'Rejected'].includes(b.status))
          .map((b) => b.batchId!._id!)
      ),
    [myBookings]
  );

  // Derived real medical review status
  const hasPendingMedical = myBookings.some((b) => b.status === 'PendingMedicalReview');
  const hasApprovedMedical = myBookings.some(
    (b) => b.status === 'MedicallyApproved' || b.status === 'Confirmed'
  );
  const hasInquiryMedical = myBookings.some((b) => b.status === 'Inquiry');

  const medicalStatusLabel = hasPendingMedical
    ? 'Pending Review'
    : hasApprovedMedical
      ? 'Approved'
      : hasInquiryMedical
        ? 'Action Required'
        : 'Profile Available';

  const medicalBadgeClass = hasPendingMedical
    ? 'participant-status-card__badge--pending'
    : hasApprovedMedical
      ? 'participant-status-card__badge--approved'
      : hasInquiryMedical
        ? 'participant-status-card__badge--action'
        : 'participant-status-card__badge--neutral';

  // Derived real feedback eligibility
  const completedConfirmedBookings = pastBookings.filter((b) => b.status === 'Confirmed');
  const feedbackStatusLabel =
    completedConfirmedBookings.length > 0 ? 'Feedback available' : 'Share Experience';

  // Preview trips for Discover section (up to 3 cards)
  const previewTrips = trips.slice(0, 3);

  return (
    <div className="participant-dashboard">
      <Navbar />
      <main className="participant-dashboard-main">
        <div className="participant-dashboard-container">
          {/* 1. Welcome / Header */}
          <header className="participant-welcome">
            <div>
              <p className="participant-eyebrow">Your TrailOps journey</p>
              <h1>
                {greeting}
                {user?.fullName ? `, ${user.fullName}` : ''}
              </h1>
              <p>Your trekking journey at a glance.</p>
            </div>
            <Link className="participant-text-link" to="/dashboard/participant/explore">
              Explore treks <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </header>

          {/* Feedback message banner if present */}
          {message && (
            <div
              className={`participant-alert-banner ${
                message.includes('successfully') || message.includes('created')
                  ? 'participant-alert-banner--success'
                  : 'participant-alert-banner--error'
              }`}
              role="status"
            >
              <span>{message}</span>
              <button
                type="button"
                className="participant-alert-dismiss"
                onClick={() => setMessage('')}
                aria-label="Dismiss message"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* 2. Next Adventure / Hero */}
          <section className="participant-next-adventure" aria-labelledby="next-adventure-title">
            <div className="participant-section-heading">
              <div>
                <p className="participant-eyebrow">Up next</p>
                <h2 id="next-adventure-title">Your next adventure</h2>
              </div>
            </div>
            {loadingBookings ? (
              <div className="participant-adventure-empty" role="status">
                Finding your next adventure…
              </div>
            ) : nextBooking ? (
              <article className="participant-adventure-card">
                {nextTrip?.images?.[0]?.url ? (
                  <img
                    className="participant-adventure-image"
                    src={nextTrip.images[0].url}
                    alt={`${nextBooking.tripId?.name || nextTrip.name} trek`}
                  />
                ) : (
                  <div className="participant-adventure-image participant-adventure-image--fallback">
                    <Mountain size={44} aria-hidden="true" />
                  </div>
                )}
                <div className="participant-adventure-content">
                  <div className="participant-adventure-title-row">
                    <div>
                      <p className="participant-eyebrow">Your booked trek</p>
                      <h3>{nextBooking.tripId?.name || 'Your trek'}</h3>
                    </div>
                    <span
                      className={`participant-status-badge participant-status-${nextBooking.status.toLowerCase()}`}
                    >
                      {nextBooking.status}
                    </span>
                  </div>
                  {nextTrip?.location && (
                    <p className="participant-adventure-location">
                      <MapPin size={16} aria-hidden="true" /> {nextTrip.location}
                    </p>
                  )}
                  <div className="participant-adventure-details">
                    <div>
                      <span>Batch</span>
                      <strong>
                        {nextBooking.batchId?.batchName || 'Batch details unavailable'}
                      </strong>
                    </div>
                    {(nextBooking.batchId?.startDate || nextBooking.batchId?.endDate) && (
                      <div>
                        <span>Dates</span>
                        <strong>
                          {formatDate(nextBooking.batchId.startDate) || 'Date unavailable'}
                          {nextBooking.batchId.endDate
                            ? ` — ${formatDate(nextBooking.batchId.endDate)}`
                            : ''}
                        </strong>
                      </div>
                    )}
                  </div>
                  <div className="participant-adventure-actions">
                    {nextBooking.status === 'Confirmed' && (
                      <button
                        className="btn participant-primary-action"
                        onClick={() => handleFetchQRForBooking(nextBooking._id)}
                      >
                        <QrCode size={17} aria-hidden="true" /> View booking QR
                      </button>
                    )}
                    {nextBooking.status === 'Inquiry' && (
                      <Link
                        to="/dashboard/participant/medical"
                        className="btn participant-primary-action"
                      >
                        <HeartPulse size={17} aria-hidden="true" /> Submit medical profile
                      </Link>
                    )}
                    <Link to="/dashboard/participant/bookings" className="btn btn-secondary">
                      View in My Bookings
                    </Link>
                  </div>
                </div>
              </article>
            ) : (
              <div className="participant-adventure-empty">
                <span className="participant-empty-icon">
                  <Mountain size={25} aria-hidden="true" />
                </span>
                <div>
                  <h3>Your next adventure is waiting.</h3>
                  <p>Explore available treks and choose an upcoming batch that suits your schedule.</p>
                </div>
                <Link className="btn" to="/dashboard/participant/explore">
                  Explore treks
                </Link>
              </div>
            )}
          </section>

          {/* 3. Compact Journey Summary */}
          <section className="participant-summary-grid" aria-label="Your booking summary">
            <article className="participant-summary-card">
              <span className="participant-summary-icon">
                <Compass size={19} aria-hidden="true" />
              </span>
              <div>
                <span>Upcoming</span>
                <strong>{loadingBookings ? '—' : upcomingBookings.length}</strong>
              </div>
            </article>
            <article className="participant-summary-card">
              <span className="participant-summary-icon">
                <CheckCircle2 size={19} aria-hidden="true" />
              </span>
              <div>
                <span>Confirmed</span>
                <strong>{loadingBookings ? '—' : confirmedBookings}</strong>
              </div>
            </article>
            <article className="participant-summary-card">
              <span className="participant-summary-icon">
                <Clock size={19} aria-hidden="true" />
              </span>
              <div>
                <span>Active</span>
                <strong>{loadingBookings ? '—' : upcomingActiveBookings.length}</strong>
              </div>
            </article>
            <article className="participant-summary-card">
              <span className="participant-summary-icon">
                <CalendarDays size={19} aria-hidden="true" />
              </span>
              <div>
                <span>Past</span>
                <strong>{loadingBookings ? '—' : pastBookings.length}</strong>
              </div>
            </article>
          </section>

          {/* 4. Upcoming Adventures (Compact List) */}
          <section
            className="participant-panel participant-bookings-panel"
            aria-labelledby="upcoming-adventures-title"
          >
            <div className="participant-section-heading">
              <div>
                <p className="participant-eyebrow">Your plans</p>
                <h2 id="upcoming-adventures-title">Upcoming Adventures</h2>
              </div>
              <div className="participant-heading-actions">
                {!loadingBookings && upcomingActiveBookings.length > 0 && (
                  <span className="participant-section-count">
                    {upcomingActiveBookings.length}
                  </span>
                )}
                <Link to="/dashboard/participant/bookings" className="participant-text-link">
                  All Bookings ({myBookings.length}) <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>

            {loadingBookings ? (
              <p className="participant-muted-message" role="status">
                Loading your bookings…
              </p>
            ) : bookingsError ? (
              <p className="alert alert-error">{bookingsError}</p>
            ) : upcomingActiveBookings.length > 0 ? (
              <div className="participant-booking-list">
                {upcomingActiveBookings.map((booking) => (
                  <article className="participant-booking-card" key={booking._id}>
                    <div className="participant-booking-heading">
                      <div>
                        <h3>{booking.tripId?.name || 'Trek'}</h3>
                        <p>{booking.batchId?.batchName || 'Batch details unavailable'}</p>
                      </div>
                      <span
                        className={`participant-status-badge participant-status-${booking.status.toLowerCase()}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    {(booking.batchId?.startDate || booking.batchId?.endDate) && (
                      <p className="participant-booking-dates">
                        <CalendarDays size={15} aria-hidden="true" />
                        {formatDate(booking.batchId.startDate) || 'Date unavailable'}
                        {booking.batchId.endDate
                          ? ` — ${formatDate(booking.batchId.endDate)}`
                          : ''}
                      </p>
                    )}
                    <div className="participant-booking-actions">
                      {booking.status === 'Inquiry' && (
                        <Link to="/dashboard/participant/medical" className="btn btn-sm">
                          Submit Medical
                        </Link>
                      )}
                      {booking.status === 'Confirmed' && (
                        <button
                          onClick={() => handleFetchQRForBooking(booking._id)}
                          className="btn btn-sm"
                        >
                          <QrCode size={15} aria-hidden="true" /> Get QR Code
                        </button>
                      )}
                      {['Inquiry', 'PendingMedicalReview', 'MedicallyApproved', 'Confirmed'].includes(
                        booking.status
                      ) && (
                        <button
                          onClick={() =>
                            handleInitiateCancel(booking._id, booking.tripId?.name)
                          }
                          className="btn btn-sm btn-danger"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="participant-inline-empty">
                <p>You have no upcoming or active adventures.</p>
                <Link to="/dashboard/participant/explore">
                  Browse available treks <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            )}
          </section>

          {/* 5. Trek Updates & 6. Notifications (2-Column Overview Grid) */}
          <div className="participant-overview-grid">
            {/* Trek Updates Panel */}
            <section
              className="participant-panel participant-updates-panel"
              aria-labelledby="trek-updates-title"
            >
              <div className="participant-section-heading">
                <div>
                  <p className="participant-eyebrow">From your trek team</p>
                  <h2 id="trek-updates-title">Trek Updates</h2>
                </div>
                <Activity size={19} aria-hidden="true" className="participant-heading-icon" />
              </div>
              {loadingBookings || loadingTrekUpdates ? (
                <p className="participant-muted-message" role="status">
                  Checking for trek updates…
                </p>
              ) : trekUpdatesError ? (
                <p className="participant-muted-message">{trekUpdatesError}</p>
              ) : displayableUpdates.length > 0 ? (
                <ol className="participant-update-list">
                  {displayableUpdates.map((update, index) => (
                    <li
                      className={index === 0 ? 'participant-update-latest' : undefined}
                      key={update._id || `${update.batchId}-${update.timestamp || index}`}
                    >
                      <span className="participant-update-dot" aria-hidden="true" />
                      <div>
                        <div className="participant-update-context">
                          {update.tripName && <span>{update.tripName}</span>}
                          {update.batchName && <span>{update.batchName}</span>}
                          {index === 0 && (
                            <span className="participant-update-latest-label">Latest update</span>
                          )}
                        </div>
                        <p>{update.milestone}</p>
                        {update.timestamp &&
                          !Number.isNaN(new Date(update.timestamp).getTime()) && (
                            <time dateTime={update.timestamp}>
                              {new Date(update.timestamp).toLocaleString()}
                            </time>
                          )}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="participant-inline-empty">
                  <p>No trek updates yet.</p>
                </div>
              )}
            </section>

            {/* Notifications & Alerts Panel */}
            <section
              className="participant-panel participant-notifications-panel"
              aria-labelledby="participant-notifications-title"
            >
              <div className="participant-section-heading">
                <div>
                  <p className="participant-eyebrow">Stay informed</p>
                  <h2 id="participant-notifications-title">Notifications</h2>
                </div>
                <div className="participant-notification-heading-meta">
                  <Bell size={18} aria-hidden="true" className="participant-heading-icon" />
                  {unreadNotificationCount > 0 && (
                    <span className="participant-unread-count">
                      {unreadNotificationCount} unread
                    </span>
                  )}
                </div>
              </div>
              {loadingNotifications ? (
                <p className="participant-muted-message" role="status">
                  Loading notifications…
                </p>
              ) : notificationsError ? (
                <p className="participant-muted-message" role="alert">
                  {notificationsError}
                </p>
              ) : notifications.length === 0 ? (
                <div className="participant-notifications-empty">You're all caught up.</div>
              ) : (
                <ul className="participant-notification-list">
                  {notifications.slice(0, 5).map((notification) => (
                    <li
                      className={`participant-notification-item${
                        notification.isRead ? '' : ' is-unread'
                      }`}
                      key={notification._id}
                    >
                      <span className="participant-notification-indicator" aria-hidden="true" />
                      <div className="participant-notification-content">
                        <div className="participant-notification-title-row">
                          <strong>{notification.relatedType || 'Notification'}</strong>
                          <span
                            className={`participant-notification-state${
                              notification.isRead ? '' : ' unread'
                            }`}
                          >
                            {notification.isRead ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        <p>{notification.message}</p>
                        {notification.createdAt &&
                          !Number.isNaN(new Date(notification.createdAt).getTime()) && (
                            <time dateTime={notification.createdAt}>
                              {new Date(notification.createdAt).toLocaleString()}
                            </time>
                          )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* 7. Participant Quick Actions / Status Cards */}
          <section
            className="participant-quick-actions-section"
            aria-labelledby="quick-actions-title"
          >
            <div className="participant-section-heading">
              <div>
                <p className="participant-eyebrow">Participant Hub</p>
                <h2 id="quick-actions-title">Quick Actions &amp; Status</h2>
              </div>
            </div>

            <div className="participant-quick-actions-grid">
              {/* Medical Card */}
              <article className="participant-status-card">
                <div className="participant-status-card__header">
                  <span className="participant-status-card__icon" aria-hidden="true">
                    <HeartPulse size={20} />
                  </span>
                  <span className={`participant-status-card__badge ${medicalBadgeClass}`}>
                    {medicalStatusLabel}
                  </span>
                </div>
                <h3>Medical Profile</h3>
                <p>
                  Share medical history, allergies, and emergency contacts required for trek safety verification.
                </p>
                <Link to="/dashboard/participant/medical" className="participant-status-card__action">
                  View Medical Profile <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>

              {/* Feedback Card */}
              <article className="participant-status-card">
                <div className="participant-status-card__header">
                  <span className="participant-status-card__icon" aria-hidden="true">
                    <Star size={20} />
                  </span>
                  <span className="participant-status-card__badge participant-status-card__badge--available">
                    {feedbackStatusLabel}
                  </span>
                </div>
                <h3>Trek Feedback</h3>
                <p>
                  Rate your trek leaders, trail safety, and food quality to help improve future expeditions.
                </p>
                <Link to="/dashboard/participant/feedback" className="participant-status-card__action">
                  Leave Feedback <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>

              {/* Group Bookings Card */}
              <article className="participant-status-card">
                <div className="participant-status-card__header">
                  <span className="participant-status-card__icon" aria-hidden="true">
                    <Users size={20} />
                  </span>
                  <span className="participant-status-card__badge participant-status-card__badge--neutral">
                    {openGroups.length > 0
                      ? `${openGroups.length} open ${openGroups.length === 1 ? 'group' : 'groups'}`
                      : 'Plan Together'}
                  </span>
                </div>
                <h3>Group Bookings</h3>
                <p>
                  Create or join private group codes to coordinate trek bookings together with friends.
                </p>
                <Link to="/dashboard/participant/groups" className="participant-status-card__action">
                  Manage Group Bookings <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>

              {/* My Bookings Card */}
              <article className="participant-status-card">
                <div className="participant-status-card__header">
                  <span className="participant-status-card__icon" aria-hidden="true">
                    <CalendarDays size={20} />
                  </span>
                  <span className="participant-status-card__badge participant-status-card__badge--neutral">
                    {myBookings.length} {myBookings.length === 1 ? 'booking' : 'bookings'}
                  </span>
                </div>
                <h3>My Bookings</h3>
                <p>
                  View your complete booking history, check-in QR codes, and current reservation statuses.
                </p>
                <Link to="/dashboard/participant/bookings" className="participant-status-card__action">
                  View Bookings <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>
            </div>
          </section>

          {/* 8. Discover More Trips Preview */}
          <section
            className="participant-panel participant-trips-panel"
            id="available-trips"
            aria-labelledby="discover-trips-title"
          >
            <div className="participant-section-heading">
              <div>
                <p className="participant-eyebrow">Find your next trail</p>
                <h2 id="discover-trips-title">Discover More Trips</h2>
              </div>
              <Link to="/dashboard/participant/explore" className="participant-text-link">
                Explore All Trips ({trips.length}) <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            {previewTrips.length > 0 ? (
              <>
                <div className="participant-trip-grid">
                  {previewTrips.map((trip) => {
                    const tripBatches = batchesByTrip[trip._id] || [];
                    const isBatchBooked = tripBatches.some((b) => bookedBatchIds.has(b._id));
                    return (
                      <ParticipantTripCard
                        key={trip._id}
                        trip={trip}
                        batches={tripBatches}
                        onBook={handleBookBatch}
                        isBooked={isBatchBooked}
                      />
                    );
                  })}
                </div>
                {trips.length > 3 && (
                  <div className="participant-trips-footer">
                    <Link
                      to="/dashboard/participant/explore"
                      className="btn btn-secondary participant-trips-more-btn"
                    >
                      View All {trips.length} Available Treks <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="participant-inline-empty">
                <p>No public trips available at this time.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Booking QR Code Modal */}
      {qrImage && (
        <div
          className="participant-modal-backdrop"
          role="presentation"
          onClick={() => setQrImage('')}
        >
          <section
            className="participant-qr-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="participant-qr-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="participant-modal-close"
              type="button"
              aria-label="Close QR code"
              onClick={() => setQrImage('')}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <span className="participant-qr-modal-icon">
              <QrCode size={22} aria-hidden="true" />
            </span>
            <h2 id="participant-qr-modal-title">Your booking QR code</h2>
            <p>Keep this ready for your trek check-in.</p>
            <img src={qrImage} alt="Booking QR Code" />
          </section>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingBooking && (
        <CancelBookingModal
          isOpen={Boolean(cancellingBooking)}
          tripName={cancellingBooking.tripName}
          isProcessing={isCancelling}
          onConfirm={() => void handleConfirmCancel()}
          onClose={() => {
            if (!isCancelling) setCancellingBooking(null);
          }}
        />
      )}
    </div>
  );
}