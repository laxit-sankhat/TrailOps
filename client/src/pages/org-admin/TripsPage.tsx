import { useEffect, useState, useCallback, useMemo } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, MapPin, Mountain } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createTrip, getTripsByOrg } from '../../services/tripService';
import { getMyOrgBatches } from '../../services/batchService';
import type { BatchSummary } from '../../types';
import './TripsPage.css';

type TripImage = { url: string; publicId: string };
type OrgTrip = {
  _id: string;
  name: string;
  location?: string;
  description?: string;
  difficultyLevel?: string;
  durationInHours?: number;
  durationDays?: number;
  basePrice?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  images?: TripImage[];
  imageUrl?: string | null;
};

type OrgBatch = BatchSummary & {
  tripId?: string | { _id: string; name?: string };
  maxCapacity?: number;
};

type FieldErrors = Record<string, string>;

function formatDateRange(startDate?: string | Date, endDate?: string | Date): string {
  if (!startDate && !endDate) return '';
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const isValidStart = start && !Number.isNaN(start.getTime());
  const isValidEnd = end && !Number.isNaN(end.getTime());

  if (isValidStart && isValidEnd) {
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} — ${endStr}`;
  }
  if (isValidStart) return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (isValidEnd) return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return '';
}

export default function TripsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const organizationId = user?.organizationId;

  const [trips, setTrips] = useState<OrgTrip[]>([]);
  const [batches, setBatches] = useState<OrgBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    location: '',
    description: '',
    difficultyLevel: 'Easy',
    durationDays: 1,
    startDate: '',
    endDate: '',
    basePrice: 0
  });
  const [formMessage, setFormMessage] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [tripValidationErrors, setTripValidationErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (location.hash === '#create-trip') {
      setShowCreateForm(true);
    }
  }, [location.hash]);

  const loadData = useCallback(async () => {
    if (!organizationId) {
      setError('Organization information is unavailable for this account.');
      setLoading(false);
      return;
    }

    try {
      const [tripsRes, batchesRes] = await Promise.all([
        getTripsByOrg(organizationId),
        getMyOrgBatches().catch(() => ({ data: { batches: [] } }))
      ]);

      setTrips(tripsRes.data.trips || []);
      setBatches(batchesRes.data?.batches || []);
      setError('');
    } catch (err: unknown) {
      console.error(err);
      setError(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Unable to load trips.'
          : 'Unable to load trips.'
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  // Compute batch breakdown per trip from real batch data
  const batchStatsByTrip = useMemo(() => {
    const map = new Map<string, { total: number; active: number; completed: number; summary: string }>();

    for (const trip of trips) {
      const tripBatches = batches.filter((b) => {
        const refId = typeof b.tripId === 'object' && b.tripId !== null ? b.tripId._id : b.tripId;
        return refId === trip._id;
      });

      const total = tripBatches.length;
      const active = tripBatches.filter((b) => b.status !== 'Completed' && b.status?.trim() !== 'Cancelled').length;
      const completed = tripBatches.filter((b) => b.status === 'Completed').length;

      let summary = '0 Batches';
      if (total > 0) {
        if (active > 0 && completed > 0) {
          summary = `${active} Active · ${completed} Done`;
        } else if (active > 0) {
          summary = `${active} Active ${active === 1 ? 'Batch' : 'Batches'}`;
        } else if (completed > 0) {
          summary = `${completed} Completed`;
        } else {
          summary = `${total} ${total === 1 ? 'Batch' : 'Batches'}`;
        }
      }

      map.set(trip._id, { total, active, completed, summary });
    }

    return map;
  }, [trips, batches]);

  // Meaningful status grouping based on actual backend status
  const activeTrips = useMemo(() => {
    return trips.filter((t) => t.status !== 'Inactive');
  }, [trips]);

  const inactiveTrips = useMemo(() => {
    return trips.filter((t) => t.status === 'Inactive');
  }, [trips]);

  const validateTripField = (field: string, formElement: HTMLFormElement) => {
    const values = new FormData(formElement);
    const value = String(values.get(field) || '');
    if (['name', 'location', 'durationDays', 'startDate', 'endDate', 'basePrice'].includes(field) && !value.trim()) {
      return 'This field is required.';
    }
    if (field === 'durationDays' && (!Number.isFinite(Number(value)) || Number(value) < 1)) {
      return 'Duration must be at least 1 day.';
    }
    if (field === 'basePrice' && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      return 'Price cannot be negative.';
    }
    if (field === 'endDate' && value && String(values.get('startDate') || '') && value <= String(values.get('startDate'))) {
      return 'End date must be after the start date.';
    }
    return '';
  };

  const validateTripForm = (formElement: HTMLFormElement) => {
    const fields = ['name', 'location', 'durationDays', 'startDate', 'endDate', 'basePrice'];
    return Object.fromEntries(fields.map((field) => [field, validateTripField(field, formElement)]));
  };

  const handleTripBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const field = e.currentTarget.name;
    const formElement = e.currentTarget.form;
    if (!formElement) return;
    const err = validateTripField(field, formElement);
    setTripValidationErrors((current) => ({ ...current, [field]: err }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validateTripForm(e.currentTarget);
    setTripValidationErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setFormSubmitting(true);
    setFormMessage('');
    try {
      await createTrip(form);
      setFormMessage('Trip created successfully');
      setForm({
        name: '',
        location: '',
        description: '',
        difficultyLevel: 'Easy',
        durationDays: 1,
        startDate: '',
        endDate: '',
        basePrice: 0
      });
      await loadData();
      setShowCreateForm(false);
    } catch (err: unknown) {
      setFormMessage(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Something went wrong while creating the trip'
          : 'Something went wrong while creating the trip'
      );
    } finally {
      setFormSubmitting(false);
    }
  };

  const renderTripCard = (trip: OrgTrip) => {
    const primaryImage = (trip.images && trip.images[0]?.url) || trip.imageUrl || null;
    const statusLabel = trip.status || 'Active';
    const statusClass = statusLabel.toLowerCase().trim().replace(/\s+/g, '-');
    const batchInfo = batchStatsByTrip.get(trip._id)?.summary || '0 Batches';
    const duration = trip.durationDays != null
      ? `${trip.durationDays} ${trip.durationDays === 1 ? 'Day' : 'Days'}`
      : trip.durationInHours != null
        ? `${trip.durationInHours} ${trip.durationInHours === 1 ? 'Hour' : 'Hours'}`
        : null;
    const scheduleRange = (trip.startDate || trip.endDate)
      ? formatDateRange(trip.startDate, trip.endDate)
      : null;

    return (
      <article
        className="org-admin-trip-card"
        key={trip._id}
        onClick={() => navigate(`/dashboard/org-admin/trips/${trip._id}`)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/dashboard/org-admin/trips/${trip._id}`);
          }
        }}
        aria-label={`View details for ${trip.name}`}
      >
        {/* 1. Large Trip Image with Status & Difficulty Badges */}
        <div className="org-admin-trip-card__media">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={`${trip.name} trip`}
              className="org-admin-trip-card__image"
              loading="lazy"
            />
          ) : (
            <div className="org-admin-trip-card__fallback">
              <Mountain size={36} aria-hidden="true" />
              <span>{trip.name || 'TrailOps Trek'}</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="org-admin-trip-card__status-wrapper">
            <span className={`org-admin-trip-card__status-pill status-${statusClass}`}>
              {statusLabel}
            </span>
          </div>

          {/* Difficulty Badge */}
          {trip.difficultyLevel && (
            <div className="org-admin-trip-card__difficulty-wrapper">
              <span className={`org-admin-trip-card__difficulty-pill difficulty-${trip.difficultyLevel.toLowerCase()}`}>
                {trip.difficultyLevel}
              </span>
            </div>
          )}
        </div>

        {/* 2. Card Content Body */}
        <div className="org-admin-trip-card__content">
          {/* Trip Identity Eyebrow */}
          <div className="org-admin-trip-card__eyebrow">
            <Mountain size={13} aria-hidden="true" />
            <span>Destination Route</span>
          </div>

          {/* Title */}
          <h3 className="org-admin-trip-card__title">{trip.name}</h3>

          {/* Metadata Row: Location, Duration & Real Schedule */}
          <div className="org-admin-trip-card__meta-row">
            {trip.location && (
              <span className="org-admin-trip-card__meta-item">
                <MapPin size={13} aria-hidden="true" />
                <span>{trip.location}</span>
              </span>
            )}
            {duration && (
              <span className="org-admin-trip-card__meta-item">
                <Clock size={13} aria-hidden="true" />
                <span>{duration}</span>
              </span>
            )}
            {scheduleRange && (
              <span className="org-admin-trip-card__meta-item">
                <CalendarDays size={13} aria-hidden="true" />
                <span>{scheduleRange}</span>
              </span>
            )}
          </div>

          {/* Description */}
          {trip.description && (
            <p className="org-admin-trip-card__description">{trip.description}</p>
          )}

          {/* Price & Batch Connection */}
          <div className="org-admin-trip-card__stats-row">
            <div className="org-admin-trip-card__price-box">
              <span className="org-admin-trip-card__price-label">Base Price</span>
              <strong className="org-admin-trip-card__price-value">
                {typeof trip.basePrice === 'number'
                  ? `$${trip.basePrice.toLocaleString()}`
                  : '—'}
              </strong>
            </div>

            <div className="org-admin-trip-card__batch-box">
              <span className="org-admin-trip-card__batch-label">Departures</span>
              <span className="org-admin-trip-card__batch-val">
                <CalendarDays size={13} aria-hidden="true" />
                <span>{batchInfo}</span>
              </span>
            </div>
          </div>

          {/* Management CTA */}
          <div className="org-admin-trip-card__footer">
            <Link
              to={`/dashboard/org-admin/trips/${trip._id}`}
              className="org-admin-trip-card__cta-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Manage Trip</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="org-admin-trips-page">
      <header className="org-admin-route-heading">
        <p className="org-admin-route-eyebrow">Operations</p>
        <h1>Trips</h1>
        <p>Manage trekking destinations and trip programs.</p>
      </header>

      <div className="org-admin-route-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          {showCreateForm ? 'Close Form' : '+ Create Trip'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card org-admin-page-form-card" id="create-trip" style={{ marginBottom: '1.75rem' }}>
          <h2>Create New Trip</h2>
          <form onSubmit={handleCreateSubmit} noValidate>
            <div className="form-group">
              <label>Trip Name</label>
              <input
                name="name"
                value={form.name}
                placeholder="Trip Name"
                onChange={handleChange}
                onBlur={handleTripBlur}
                aria-invalid={Boolean(tripValidationErrors.name)}
                required
              />
              {tripValidationErrors.name && <p className="field-error">{tripValidationErrors.name}</p>}
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                name="location"
                value={form.location}
                placeholder="Location (e.g. Manali, Himachal Pradesh)"
                onChange={handleChange}
                onBlur={handleTripBlur}
                aria-invalid={Boolean(tripValidationErrors.location)}
                required
              />
              {tripValidationErrors.location && <p className="field-error">{tripValidationErrors.location}</p>}
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                name="description"
                value={form.description}
                placeholder="Overview description of this trek"
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Difficulty Level</label>
              <select name="difficultyLevel" value={form.difficultyLevel} onChange={handleChange}>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Difficult">Difficult</option>
              </select>
            </div>
            <div className="form-group">
              <label>Duration (days)</label>
              <input
                name="durationDays"
                type="number"
                value={form.durationDays}
                placeholder="Duration (days)"
                onChange={handleChange}
                onBlur={handleTripBlur}
                aria-invalid={Boolean(tripValidationErrors.durationDays)}
                required
              />
              {tripValidationErrors.durationDays && <p className="field-error">{tripValidationErrors.durationDays}</p>}
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
                onBlur={handleTripBlur}
                aria-invalid={Boolean(tripValidationErrors.startDate)}
                required
              />
              {tripValidationErrors.startDate && <p className="field-error">{tripValidationErrors.startDate}</p>}
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
                onBlur={handleTripBlur}
                aria-invalid={Boolean(tripValidationErrors.endDate)}
                required
              />
              {tripValidationErrors.endDate && <p className="field-error">{tripValidationErrors.endDate}</p>}
            </div>
            <div className="form-group">
              <label>Base Price ($)</label>
              <input
                name="basePrice"
                type="number"
                value={form.basePrice}
                placeholder="Base Price"
                onChange={handleChange}
                onBlur={handleTripBlur}
                aria-invalid={Boolean(tripValidationErrors.basePrice)}
                required
              />
              {tripValidationErrors.basePrice && <p className="field-error">{tripValidationErrors.basePrice}</p>}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
                {formSubmitting ? 'Creating...' : 'Create Trip'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
          {formMessage && (
            <p className={formMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'} style={{ marginTop: '1rem' }}>
              {formMessage}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="org-admin-route-error" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadData()}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="org-admin-trips-loading-grid" aria-label="Loading trips">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="org-admin-trip-card org-admin-trip-card--skeleton" aria-hidden="true">
              <div className="skeleton-box skeleton-media" />
              <div className="org-admin-trip-card__content">
                <div className="skeleton-box skeleton-eyebrow" />
                <div className="skeleton-box skeleton-title" />
                <div className="skeleton-box skeleton-meta" />
                <div className="skeleton-box skeleton-desc" />
                <div className="skeleton-box skeleton-stats" />
                <div className="skeleton-box skeleton-btn" />
              </div>
            </div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="org-admin-trips-empty-card">
          <Mountain size={42} aria-hidden="true" />
          <h3>No trips yet</h3>
          <p>Create your first trip itinerary to begin scheduling departures and field teams.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + Create Trip
          </button>
        </div>
      ) : (
        <div className="org-admin-trips-sections">
          {/* Primary Section: Available Trips */}
          <section className="org-admin-trips-section" aria-labelledby="available-trips-heading">
            <div className="org-admin-trips-section-header">
              <div className="org-admin-trips-section-title-wrap">
                <h2 id="available-trips-heading" className="org-admin-trips-section-title">
                  Available Trips
                </h2>
                <span className="org-admin-trips-section-count">{activeTrips.length}</span>
              </div>
              <p className="org-admin-trips-section-desc">
                Active trekking destinations and expedition programs.
              </p>
            </div>

            <div className="org-admin-trips-grid">
              {activeTrips.map(renderTripCard)}
            </div>
          </section>

          {/* Optional Inactive Trips section — only rendered if actual inactive trips exist */}
          {inactiveTrips.length > 0 && (
            <section className="org-admin-trips-section" aria-labelledby="inactive-trips-heading">
              <div className="org-admin-trips-section-header">
                <div className="org-admin-trips-section-title-wrap">
                  <h2 id="inactive-trips-heading" className="org-admin-trips-section-title">
                    Inactive Trips
                  </h2>
                  <span className="org-admin-trips-section-count">{inactiveTrips.length}</span>
                </div>
                <p className="org-admin-trips-section-desc">
                  Archived or paused expedition routes.
                </p>
              </div>

              <div className="org-admin-trips-grid">
                {inactiveTrips.map(renderTripCard)}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
