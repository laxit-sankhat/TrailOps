import { useEffect, useState, useCallback, useMemo } from 'react';
import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Mountain,
  Plus,
  Tag,
  Trash2,
  Upload,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyOrgBatches } from '../../services/batchService';
import { getTripById, uploadTripImage, removeTripImage } from '../../services/tripService';
import type { BatchSummary } from '../../types';
import './TripDetailsPage.css';

type TripImage = { url: string; publicId: string };
type TripDetails = {
  _id: string;
  name: string;
  location?: string;
  description?: string;
  difficultyLevel?: string;
  durationInHours?: number;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
  basePrice?: number;
  status?: string;
  images?: TripImage[];
  imageUrl?: string | null;
};

type TripBatch = BatchSummary & {
  tripId?: string | { _id: string };
  maxCapacity?: number;
};

function getRelatedTripId(tripId: TripBatch['tripId']) {
  return typeof tripId === 'object' && tripId !== null ? tripId._id : tripId;
}

function formatDateRange(startDate?: string | Date, endDate?: string | Date): string {
  if (!startDate && !endDate) return 'Dates unassigned';
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const isValidStart = start && !Number.isNaN(start.getTime());
  const isValidEnd = end && !Number.isNaN(end.getTime());

  if (isValidStart && isValidEnd) {
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} — ${endStr}`;
  }
  if (isValidStart) return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (isValidEnd) return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return 'Dates unassigned';
}

function calculateDuration(startDate?: string | Date, endDate?: string | Date): string | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '1 Day';
  return `${diffDays} Days`;
}

export default function TripDetailsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [batches, setBatches] = useState<TripBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageMessage, setImageMessage] = useState('');

  const fetchTripDetails = useCallback(async () => {
    if (!tripId || !user?.organizationId) {
      setError('Trip or organization information is unavailable.');
      setLoading(false);
      return;
    }

    try {
      const [tripResponse, batchResponse] = await Promise.all([
        getTripById(tripId),
        getMyOrgBatches()
      ]);

      const selectedTrip: TripDetails = tripResponse.data.trip;
      if (!selectedTrip) {
        setTrip(null);
        setBatches([]);
        setError('Trip not found in your organization.');
        return;
      }

      const organizationBatches: TripBatch[] = batchResponse.data.batches || [];
      setTrip(selectedTrip);
      setBatches(organizationBatches.filter((batch) => getRelatedTripId(batch.tripId) === tripId));
      setError('');
    } catch (err) {
      console.error(err);
      setError(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Unable to load trip details.'
          : 'Unable to load trip details.'
      );
    } finally {
      setLoading(false);
    }
  }, [tripId, user?.organizationId]);

  useEffect(() => {
    setLoading(true);
    void fetchTripDetails();
  }, [fetchTripDetails]);

  // Operational metrics computed strictly from existing real data
  const activeBatches = useMemo(() => {
    return batches.filter((b) => b.status !== 'Completed' && b.status?.trim() !== 'Cancelled');
  }, [batches]);

  const completedBatches = useMemo(() => {
    return batches.filter((b) => b.status === 'Completed');
  }, [batches]);

  const totalCapacity = useMemo(() => {
    return batches.reduce((acc, b) => acc + (b.maxCapacity || 0), 0);
  }, [batches]);

  const handleUploadImage = async () => {
    if (!tripId || !selectedFile) return;
    setUploading(true);
    setImageMessage('');
    try {
      await uploadTripImage(tripId, selectedFile);
      setImageMessage('Image uploaded successfully.');
      setSelectedFile(null);
      await fetchTripDetails();
    } catch (err) {
      setImageMessage(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Unable to upload image.'
          : 'Unable to upload image.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async (publicId: string) => {
    if (!tripId) return;
    if (!window.confirm('Are you sure you want to remove this image from the gallery?')) return;
    setImageMessage('');
    try {
      await removeTripImage(tripId, publicId);
      setImageMessage('Image removed successfully.');
      await fetchTripDetails();
    } catch (err) {
      setImageMessage(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Unable to remove image.'
          : 'Unable to remove image.'
      );
    }
  };

  if (loading) {
    return (
      <div className="org-admin-trip-details-page">
        <div className="skeleton-box skeleton-breadcrumb" />
        <div className="skeleton-box skeleton-hero" />
        <div className="org-admin-trip-kpi-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton-box skeleton-kpi" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <section className="org-admin-trip-details-page">
        <Link className="org-admin-trip-breadcrumb-back" to="/dashboard/org-admin/trips">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Trips</span>
        </Link>
        <div className="org-admin-route-error" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span>{error || 'Trip not found.'}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void fetchTripDetails()}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  const images = trip.images || [];
  const startImage = images[0]?.url || trip.imageUrl;
  const statusLabel = trip.status || 'Active';
  const statusClass = statusLabel.toLowerCase().trim().replace(/\s+/g, '-');
  const difficultyClass = trip.difficultyLevel ? trip.difficultyLevel.toLowerCase().trim() : '';

  const durationText = trip.durationDays != null
    ? `${trip.durationDays} ${trip.durationDays === 1 ? 'Day' : 'Days'}`
    : trip.durationInHours != null
      ? `${trip.durationInHours} ${trip.durationInHours === 1 ? 'Hour' : 'Hours'}`
      : null;

  const tripSchedule = (trip.startDate || trip.endDate)
    ? formatDateRange(trip.startDate, trip.endDate)
    : null;

  return (
    <div className="org-admin-trip-details-page">
      {/* 1. Breadcrumbs */}
      <nav className="org-admin-trip-breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard/org-admin/trips" className="org-admin-trip-breadcrumb-back">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Trips</span>
        </Link>
        <span className="org-admin-trip-breadcrumb-sep">/</span>
        <span className="org-admin-trip-breadcrumb-current">{trip.name}</span>
      </nav>

      {/* 2. Destination Command Center Hero */}
      <header className="org-admin-trip-hero">
        <div className="org-admin-trip-hero__inner">
          <div className="org-admin-trip-hero__content">
            {/* Destination Eyebrow */}
            <div className="org-admin-trip-hero__eyebrow">
              <Mountain size={13} aria-hidden="true" />
              <span>Expedition Destination</span>
              {trip.location && (
                <span className="org-admin-trip-hero__location">
                  <MapPin size={12} aria-hidden="true" />
                  <span>{trip.location}</span>
                </span>
              )}
            </div>

            {/* Title & Status Row */}
            <div className="org-admin-trip-hero__title-row">
              <h1 className="org-admin-trip-hero__title">{trip.name}</h1>
              <div className="org-admin-trip-hero__badge-group">
                <span className={`org-admin-trip-pill status-${statusClass}`}>
                  {statusLabel}
                </span>
                {trip.difficultyLevel && (
                  <span className={`org-admin-trip-pill difficulty-${difficultyClass}`}>
                    {trip.difficultyLevel}
                  </span>
                )}
              </div>
            </div>

            {/* Key Metadata Row */}
            <div className="org-admin-trip-hero__meta">
              {durationText && (
                <div className="org-admin-trip-hero__meta-item">
                  <Clock size={15} aria-hidden="true" />
                  <span>{durationText}</span>
                </div>
              )}
              {trip.basePrice != null && (
                <div className="org-admin-trip-hero__meta-item">
                  <Tag size={15} aria-hidden="true" />
                  <span>Base Price: <strong>${trip.basePrice.toLocaleString()}</strong></span>
                </div>
              )}
              {tripSchedule && (
                <div className="org-admin-trip-hero__meta-item">
                  <CalendarDays size={15} aria-hidden="true" />
                  <span>{tripSchedule}</span>
                </div>
              )}
            </div>

            {/* Concise Description */}
            {trip.description && (
              <p className="org-admin-trip-hero__desc">{trip.description}</p>
            )}

            {/* Action Bar */}
            <div className="org-admin-trip-hero__actions">
              <Link
                to={`/dashboard/org-admin/batches#create-batch`}
                className="btn btn-primary"
              >
                <Plus size={15} aria-hidden="true" />
                <span>Schedule Departure</span>
              </Link>
              <Link
                to="/dashboard/org-admin/batches"
                className="btn btn-secondary"
              >
                <span>View All Batches</span>
              </Link>
            </div>
          </div>

          {/* Visual Trip Backdrop */}
          {startImage && (
            <div className="org-admin-trip-hero__visual" aria-hidden="true">
              <img src={startImage} alt="" className="org-admin-trip-hero__visual-img" />
              <div className="org-admin-trip-hero__visual-overlay" />
            </div>
          )}
        </div>
      </header>

      {/* 3. Operational KPI Command Center */}
      <section className="org-admin-trip-kpi-grid" aria-label="Trip Operational Metrics">
        <div className="org-admin-trip-kpi-card">
          <span className="org-admin-trip-kpi-label">Total Departures</span>
          <div className="org-admin-trip-kpi-value-row">
            <strong className="org-admin-trip-kpi-value">{batches.length}</strong>
            <CalendarDays size={18} className="org-admin-trip-kpi-icon" aria-hidden="true" />
          </div>
          <span className="org-admin-trip-kpi-sub">Scheduled batch operations</span>
        </div>

        <div className="org-admin-trip-kpi-card">
          <span className="org-admin-trip-kpi-label">Active Departures</span>
          <div className="org-admin-trip-kpi-value-row">
            <strong className="org-admin-trip-kpi-value">{activeBatches.length}</strong>
            <Compass size={18} className="org-admin-trip-kpi-icon" aria-hidden="true" />
          </div>
          <span className="org-admin-trip-kpi-sub">Upcoming &amp; in-progress treks</span>
        </div>

        <div className="org-admin-trip-kpi-card">
          <span className="org-admin-trip-kpi-label">Completed Batches</span>
          <div className="org-admin-trip-kpi-value-row">
            <strong className="org-admin-trip-kpi-value">{completedBatches.length}</strong>
            <CheckCircle2 size={18} className="org-admin-trip-kpi-icon icon-success" aria-hidden="true" />
          </div>
          <span className="org-admin-trip-kpi-sub">Concluded expeditions</span>
        </div>

        <div className="org-admin-trip-kpi-card">
          <span className="org-admin-trip-kpi-label">
            {totalCapacity > 0 ? 'Total Capacity' : 'Base Rate'}
          </span>
          <div className="org-admin-trip-kpi-value-row">
            <strong className="org-admin-trip-kpi-value">
              {totalCapacity > 0
                ? totalCapacity
                : typeof trip.basePrice === 'number'
                  ? `$${trip.basePrice.toLocaleString()}`
                  : '—'}
            </strong>
            {totalCapacity > 0 ? (
              <Users size={18} className="org-admin-trip-kpi-icon" aria-hidden="true" />
            ) : (
              <Tag size={18} className="org-admin-trip-kpi-icon" aria-hidden="true" />
            )}
          </div>
          <span className="org-admin-trip-kpi-sub">
            {totalCapacity > 0 ? 'Maximum seats across batches' : 'Starting rate per trekker'}
          </span>
        </div>
      </section>

      {/* 4. Trip Overview Details */}
      <section className="org-admin-trip-details-section org-admin-trip-overview-section">
        <div className="org-admin-trip-details-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Program Specifications</p>
            <h2>Trip Overview</h2>
            <p className="org-admin-trip-details-section-desc">Core route parameters and destination logistics.</p>
          </div>
        </div>

        <div className="org-admin-trip-specs-card">
          <div className="org-admin-trip-specs-grid">
            <div className="spec-item">
              <span className="spec-label">Location / Region</span>
              <strong className="spec-value">{trip.location || 'Location unassigned'}</strong>
            </div>

            <div className="spec-item">
              <span className="spec-label">Difficulty Rating</span>
              <strong className="spec-value">{trip.difficultyLevel || 'Unspecified'}</strong>
            </div>

            <div className="spec-item">
              <span className="spec-label">Trek Duration</span>
              <strong className="spec-value">{durationText || 'Duration unassigned'}</strong>
            </div>

            <div className="spec-item">
              <span className="spec-label">Standard Base Price</span>
              <strong className="spec-value">
                {typeof trip.basePrice === 'number' ? `$${trip.basePrice.toLocaleString()}` : 'Unpriced'}
              </strong>
            </div>

            {tripSchedule && (
              <div className="spec-item spec-item--wide">
                <span className="spec-label">Season / Target Window</span>
                <strong className="spec-value">{tripSchedule}</strong>
              </div>
            )}
          </div>

          {trip.description && (
            <div className="org-admin-trip-full-desc">
              <span className="spec-label">Route Summary</span>
              <p>{trip.description}</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. Upcoming & Active Batches Section */}
      <section className="org-admin-trip-details-section org-admin-trip-batches-section">
        <div className="org-admin-trip-details-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Operations</p>
            <h2>Upcoming Departures ({activeBatches.length})</h2>
            <p className="org-admin-trip-details-section-desc">Active departures and upcoming scheduled batches for this route.</p>
          </div>
          <Link
            to="/dashboard/org-admin/batches#create-batch"
            className="btn btn-sm btn-primary"
          >
            <Plus size={14} aria-hidden="true" />
            <span>+ Schedule Batch</span>
          </Link>
        </div>

        {activeBatches.length === 0 ? (
          <div className="org-admin-trip-empty-card">
            <CalendarDays size={32} aria-hidden="true" />
            <h3>No upcoming departures</h3>
            <p>Schedule a batch to begin accepting participant bookings and assigning field leaders.</p>
            <Link className="btn btn-sm btn-primary" to="/dashboard/org-admin/batches#create-batch">
              + Schedule Batch
            </Link>
          </div>
        ) : (
          <div className="org-admin-trip-batch-subgrid">
            {activeBatches.map((batch) => {
              const dateRange = formatDateRange(batch.startDate, batch.endDate);
              const duration = calculateDuration(batch.startDate, batch.endDate);
              const statusRaw = batch.status || 'Open';
              const statusPillClass = statusRaw.toLowerCase().trim().replace(/\s+/g, '-');

              return (
                <article className="org-admin-trip-batch-mini-card" key={batch._id}>
                  <div className="mini-card-header">
                    <h4>{batch.batchName || 'Unnamed Departure'}</h4>
                    <span className={`org-admin-trip-pill status-${statusPillClass}`}>
                      {statusRaw}
                    </span>
                  </div>

                  <div className="mini-card-meta">
                    <span className="mini-meta-item">
                      <CalendarDays size={13} aria-hidden="true" />
                      <span>{dateRange}</span>
                    </span>
                    {duration && (
                      <span className="mini-meta-item">
                        <Clock size={13} aria-hidden="true" />
                        <span>{duration}</span>
                      </span>
                    )}
                    {batch.maxCapacity != null && (
                      <span className="mini-meta-item">
                        <Users size={13} aria-hidden="true" />
                        <span>{batch.maxCapacity} Capacity</span>
                      </span>
                    )}
                  </div>

                  <div className="mini-card-footer">
                    <Link
                      to={`/dashboard/org-admin/batches/${batch._id}`}
                      className="org-admin-mini-cta"
                    >
                      <span>View Batch</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed Batches Section (Rendered when completed departures exist) */}
      {completedBatches.length > 0 && (
        <section className="org-admin-trip-details-section org-admin-trip-completed-section">
          <div className="org-admin-trip-details-section-heading">
            <div>
              <p className="org-admin-route-eyebrow">Archive</p>
              <h2>Completed Departures ({completedBatches.length})</h2>
              <p className="org-admin-trip-details-section-desc">Previously completed expedition operations for this route.</p>
            </div>
          </div>

          <div className="org-admin-trip-batch-subgrid">
            {completedBatches.map((batch) => {
              const dateRange = formatDateRange(batch.startDate, batch.endDate);
              const duration = calculateDuration(batch.startDate, batch.endDate);

              return (
                <article className="org-admin-trip-batch-mini-card org-admin-trip-batch-mini-card--completed" key={batch._id}>
                  <div className="mini-card-header">
                    <h4>{batch.batchName || 'Unnamed Departure'}</h4>
                    <span className="org-admin-trip-pill status-completed">Completed</span>
                  </div>

                  <div className="mini-card-meta">
                    <span className="mini-meta-item">
                      <CalendarDays size={13} aria-hidden="true" />
                      <span>{dateRange}</span>
                    </span>
                    {duration && (
                      <span className="mini-meta-item">
                        <Clock size={13} aria-hidden="true" />
                        <span>{duration}</span>
                      </span>
                    )}
                    {batch.maxCapacity != null && (
                      <span className="mini-meta-item">
                        <Users size={13} aria-hidden="true" />
                        <span>{batch.maxCapacity} Seats</span>
                      </span>
                    )}
                  </div>

                  <div className="mini-card-footer">
                    <Link
                      to={`/dashboard/org-admin/batches/${batch._id}`}
                      className="org-admin-mini-cta"
                    >
                      <span>View Batch</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. Trip Media & Gallery */}
      <section className="org-admin-trip-details-section org-admin-trip-details-media">
        <div className="org-admin-trip-details-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Visual Assets</p>
            <h2>Trip Media &amp; Gallery</h2>
            <p className="org-admin-trip-details-section-desc">Manage destination photographs and route showcase imagery.</p>
          </div>
        </div>

        {imageMessage && (
          <p
            className={imageMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}
            style={{ margin: 0 }}
          >
            {imageMessage}
          </p>
        )}

        <div className="org-admin-trip-gallery-grid">
          {images.map((image) => (
            <div className="org-admin-gallery-item" key={image.publicId}>
              <div className="gallery-img-wrap">
                <img src={image.url} alt={`${trip.name} gallery`} loading="lazy" />
              </div>
              <button
                type="button"
                className="gallery-remove-btn"
                title="Remove image"
                onClick={() => void handleRemoveImage(image.publicId)}
              >
                <Trash2 size={13} aria-hidden="true" />
                <span>Remove</span>
              </button>
            </div>
          ))}
          {!images.length && trip.imageUrl && (
            <div className="org-admin-gallery-item">
              <div className="gallery-img-wrap">
                <img src={trip.imageUrl} alt={`${trip.name} primary`} loading="lazy" />
              </div>
              <span className="org-admin-gallery-tag">Primary Image</span>
            </div>
          )}
          {!images.length && !trip.imageUrl && (
            <div className="org-admin-gallery-empty">
              <Mountain size={28} aria-hidden="true" />
              <p>No gallery images uploaded for this destination yet.</p>
            </div>
          )}
        </div>

        {/* Upload Control Card */}
        <div className="org-admin-trip-upload-box">
          <div className="upload-box-header">
            <Upload size={16} aria-hidden="true" />
            <label htmlFor="trip-image-upload" className="org-admin-upload-label">
              <strong>Upload New Image</strong>
            </label>
          </div>
          <div className="org-admin-upload-controls">
            <input
              id="trip-image-upload"
              type="file"
              accept="image/*"
              aria-label={`Choose image for ${trip.name}`}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!selectedFile || uploading}
              onClick={() => void handleUploadImage()}
            >
              {uploading ? 'Uploading…' : 'Upload Image'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
