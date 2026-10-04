import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { ArrowRight, Loader2, Mountain, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ParticipantTripCard from '../../components/participant/ParticipantTripCard';
import { getAllPublicTrips, getBatchesForTrip } from '../../services/tripService';
import { createBooking, getMyBookings } from '../../services/bookingService';
import type { PublicTrip, TripBatch, ParticipantBookingSummary } from '../../types';
import './ParticipantExploreTripsPage.css';

type ParticipantBooking = Omit<ParticipantBookingSummary, 'batchId'> & {
  batchId: { _id?: string } | null;
};

export default function ParticipantExploreTripsPage() {
  const [trips, setTrips] = useState<PublicTrip[]>([]);
  const [batchesByTrip, setBatchesByTrip] = useState<Record<string, TripBatch[]>>({});
  const [bookedBatchIds, setBookedBatchIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingMessage, setBookingMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [bookingBatchId, setBookingBatchId] = useState<string>('');

  // Real-data filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Moderate' | 'Difficult'>('All');

  // Load public trips, their batches, and current user's bookings
  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [tripsRes, bookingsRes] = await Promise.all([
        getAllPublicTrips(),
        getMyBookings()
      ]);

      const loadedTrips: PublicTrip[] = tripsRes.data.trips || [];
      setTrips(loadedTrips);

      const activeBookings: ParticipantBooking[] = bookingsRes.data.bookings || [];
      const activeIds = new Set<string>();
      activeBookings.forEach((b) => {
        if (b.batchId?._id && !['Cancelled', 'Rejected'].includes(b.status)) {
          activeIds.add(b.batchId._id);
        }
      });
      setBookedBatchIds(activeIds);

      // Fetch upcoming batches for each loaded trip using existing public batch API
      const batchEntries = await Promise.all(
        loadedTrips.map(async (trip) => {
          try {
            const batchRes = await getBatchesForTrip(trip._id);
            return [trip._id, (batchRes.data.batches || []) as TripBatch[]] as const;
          } catch {
            return [trip._id, [] as TripBatch[]] as const;
          }
        })
      );
      setBatchesByTrip(Object.fromEntries(batchEntries));
    } catch (err: unknown) {
      console.error(err);
      setError(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Unable to load explore trips.'
          : 'Unable to load explore trips.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Handle booking directly from card using existing createBooking flow
  const handleBookBatch = async (batchId: string) => {
    if (!batchId) return;
    setBookingBatchId(batchId);
    setBookingMessage(null);

    try {
      const response = await createBooking({ batchId });
      const status = response.data.booking?.status || 'Inquiry';
      setBookingMessage({
        text: `Booking created successfully with status: "${status}".`,
        type: 'success'
      });
      // Update local booked batches
      setBookedBatchIds((prev) => new Set([...prev, batchId]));
    } catch (err: unknown) {
      const msg = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message || 'Could not complete booking.'
        : 'Could not complete booking.';
      setBookingMessage({
        text: msg,
        type: 'error'
      });
    } finally {
      setBookingBatchId('');
    }
  };

  // Filter trips based ONLY on real trip properties
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      // Search query filter (matches trip name or location)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = trip.name.toLowerCase().includes(query);
        const matchesLocation = trip.location ? trip.location.toLowerCase().includes(query) : false;
        if (!matchesName && !matchesLocation) return false;
      }

      // Difficulty filter
      if (difficultyFilter !== 'All') {
        if (trip.difficultyLevel !== difficultyFilter) return false;
      }

      return true;
    });
  }, [trips, searchQuery, difficultyFilter]);

  return (
    <div className="participant-explore-page">
      <Navbar />
      <main className="participant-explore-main">
        <div className="participant-explore-container">
          {/* Header */}
          <header className="participant-explore-header">
            <p className="participant-explore-eyebrow">DISCOVER</p>
            <h1>Explore Treks</h1>
            <p className="participant-explore-subtitle">
              Find your next adventure.
            </p>
          </header>

          {/* Alert Message for Booking Action */}
          {bookingMessage && (
            <div
              className={`participant-explore-alert participant-explore-alert--${bookingMessage.type}`}
              role="status"
            >
              <span>{bookingMessage.text}</span>
              {bookingMessage.type === 'success' && (
                <Link to="/dashboard/participant/bookings">
                  View in My Bookings <ArrowRight size={14} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}

          {error && (
            <div className="participant-explore-alert participant-explore-alert--error" role="alert">
              <span>{error}</span>
            </div>
          )}

          {/* Real-data Filter Controls */}
          {!loading && trips.length > 0 && (
            <div className="participant-explore-filter-bar">
              <div className="participant-explore-search-box">
                <Search size={16} className="participant-explore-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search treks by name or location…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="participant-explore-search-input"
                  aria-label="Search treks"
                />
              </div>

              <div className="participant-explore-filter-group" role="group" aria-label="Filter by difficulty">
                {(['All', 'Easy', 'Moderate', 'Difficult'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    className={`participant-explore-filter-btn ${difficultyFilter === diff ? 'is-active' : ''}`}
                    onClick={() => setDifficultyFilter(diff)}
                  >
                    {diff}
                  </button>
                ))}
              </div>

              <span className="participant-explore-count">
                Showing {filteredTrips.length} {filteredTrips.length === 1 ? 'trek' : 'treks'}
              </span>
            </div>
          )}

          {/* Trips Grid */}
          {loading ? (
            <div className="participant-explore-loading" role="status">
              <span className="participant-explore-loading-icon">
                <Loader2 size={24} aria-hidden="true" />
              </span>
              <p>Discovering available adventures…</p>
            </div>
          ) : filteredTrips.length > 0 ? (
            <div className="participant-explore-grid">
              {filteredTrips.map((trip) => {
                const batches = batchesByTrip[trip._id] || [];
                return (
                  <ParticipantTripCard
                    key={trip._id}
                    trip={trip}
                    batches={batches}
                    onBook={handleBookBatch}
                    isActionLoading={bookingBatchId !== '' && batches.some((b) => b._id === bookingBatchId)}
                    isBooked={batches.some((b) => bookedBatchIds.has(b._id))}
                  />
                );
              })}
            </div>
          ) : (
            <div className="participant-explore-empty">
              <span className="participant-explore-empty-icon">
                <Mountain size={28} aria-hidden="true" />
              </span>
              <h3>No treks found</h3>
              <p>
                {searchQuery || difficultyFilter !== 'All'
                  ? 'Try adjusting your search criteria or difficulty filter.'
                  : 'There are currently no public trips available.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
