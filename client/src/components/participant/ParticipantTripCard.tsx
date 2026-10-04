import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock, MapPin, Mountain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PublicTrip, TripBatch } from '../../types';
import './ParticipantTripCard.css';

export interface ParticipantTripCardProps {
  trip: PublicTrip;
  batches?: TripBatch[];
  selectedBatchId?: string;
  onSelectBatch?: (batchId: string) => void;
  onBook?: (batchId: string) => void | Promise<void>;
  isBooked?: boolean;
  ctaText?: string;
  isActionLoading?: boolean;
  onCtaClick?: (batchId: string) => void;
  to?: string;
  onCardClick?: () => void;
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ParticipantTripCard({
  trip,
  batches = [],
  selectedBatchId: controlledBatchId,
  onSelectBatch,
  onBook,
  isBooked = false,
  ctaText = 'Book This Trek',
  isActionLoading = false,
  onCtaClick,
  to,
  onCardClick
}: ParticipantTripCardProps) {
  const navigate = useNavigate();

  // 1. IMAGE CAROUSEL LOGIC
  const imageList = useMemo(() => {
    const list: string[] = [];
    if (trip.images && trip.images.length > 0) {
      trip.images.forEach((img) => {
        if (img?.url && !list.includes(img.url)) {
          list.push(img.url);
        }
      });
    }
    if (trip.imageUrl && !list.includes(trip.imageUrl)) {
      list.push(trip.imageUrl);
    }
    return list;
  }, [trip.images, trip.imageUrl]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Reset active image index safely if trip changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [trip._id]);

  // Auto-rotate every 3.5 seconds when multiple images exist and card is not hovered
  useEffect(() => {
    if (imageList.length <= 1 || isHovered) return;

    const timer = setInterval(() => {
      setActiveImageIndex((prevIndex) => (prevIndex + 1) % imageList.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [imageList.length, isHovered]);

  // 2. BATCH DATA LOGIC (Real data only, filtered for upcoming & active)
  const upcomingBatches = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return batches
      .filter((batch) => {
        if (!batch.startDate) return false;
        const status = (batch.status || '').trim().toLowerCase();
        if (status === 'completed' || status === 'cancelled') return false;

        const start = new Date(batch.startDate);
        const end = batch.endDate ? new Date(batch.endDate) : null;
        if (end && end < today) return false;
        if (!end && start < today) return false;
        return true;
      })
      .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());
  }, [batches]);

  // Internal batch selection state (controlled or uncontrolled)
  const [internalBatchId, setInternalBatchId] = useState<string>('');

  const currentBatchId = controlledBatchId !== undefined ? controlledBatchId : internalBatchId;

  // Set default selection to the first upcoming batch
  useEffect(() => {
    if (upcomingBatches.length > 0) {
      const match = upcomingBatches.find((b) => b._id === currentBatchId);
      if (!match) {
        const firstId = upcomingBatches[0]._id;
        setInternalBatchId(firstId);
        onSelectBatch?.(firstId);
      }
    } else {
      setInternalBatchId('');
    }
  }, [upcomingBatches, currentBatchId, onSelectBatch]);

  const handleBatchSelect = (batchId: string) => {
    setInternalBatchId(batchId);
    onSelectBatch?.(batchId);
  };

  const selectedBatch = upcomingBatches.find((b) => b._id === currentBatchId) || upcomingBatches[0];

  const selectedBatchDate = selectedBatch?.startDate ? new Date(selectedBatch.startDate) : null;
  const isSelectedDateValid = Boolean(selectedBatchDate && !Number.isNaN(selectedBatchDate.getTime()));
  const selectedDay = isSelectedDateValid && selectedBatchDate
    ? String(selectedBatchDate.getDate()).padStart(2, '0')
    : null;
  const selectedMonth = isSelectedDateValid && selectedBatchDate
    ? selectedBatchDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()
    : null;

  const handleCta = () => {
    const targetBatchId = selectedBatch?._id || '';
    if (onCtaClick) {
      onCtaClick(targetBatchId);
    } else if (onBook) {
      void onBook(targetBatchId);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't trigger card navigation if clicking child interactive controls
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('[role="radio"]') ||
      target.closest('[role="tab"]') ||
      target.closest('.participant-trip-card__dots') ||
      target.closest('.participant-trip-card__batch-selector')
    ) {
      return;
    }

    if (onCardClick) {
      onCardClick();
    } else if (to) {
      navigate(to);
    } else {
      handleCta();
    }
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="radio"]') ||
        target.closest('[role="tab"]') ||
        target.closest('.participant-trip-card__dots') ||
        target.closest('.participant-trip-card__batch-selector')
      ) {
        return;
      }
      e.preventDefault();
      if (onCardClick) {
        onCardClick();
      } else if (to) {
        navigate(to);
      } else {
        handleCta();
      }
    }
  };

  return (
    <article
      className="participant-trip-card"
      role={to ? 'link' : 'button'}
      tabIndex={0}
      aria-label={`View details for ${trip.name}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. IMAGE CAROUSEL SECTION */}
      <div className="participant-trip-card__media">
        {imageList.length > 0 ? (
          <div className="participant-trip-card__carousel">
            {imageList.map((url, index) => (
              <img
                key={url}
                src={url}
                alt={`${trip.name} photo ${index + 1}`}
                className={`participant-trip-card__image ${index === activeImageIndex ? 'is-active' : ''}`}
                loading="lazy"
              />
            ))}
          </div>
        ) : (
          <div className="participant-trip-card__fallback" role="img" aria-label={`${trip.name} trek`}>
            <Mountain size={44} className="participant-trip-card__fallback-icon" aria-hidden="true" />
            <span>TrailOps Trek</span>
          </div>
        )}

        {/* 3. DIFFICULTY INDICATOR (Only if provided by API) */}
        {trip.difficultyLevel && (
          <div className="participant-trip-card__badge-wrapper">
            <span
              className={`participant-trip-card__difficulty participant-trip-card__difficulty--${trip.difficultyLevel.toLowerCase()}`}
            >
              {trip.difficultyLevel}
            </span>
          </div>
        )}

        {/* PROMINENT DATE CIRCLE (Visually integrated with / overlapping the trip image) */}
        {selectedDay && selectedMonth && (
          <div
            className="participant-trip-card__date-badge"
            aria-label={`Departure date: ${selectedDay} ${selectedMonth}`}
          >
            <span className="participant-trip-card__date-badge-day">{selectedDay}</span>
            <span className="participant-trip-card__date-badge-month">{selectedMonth}</span>
          </div>
        )}

        {/* Image Indicator Dots (Only if multiple real images exist) */}
        {imageList.length > 1 && (
          <div className="participant-trip-card__dots" role="tablist" aria-label="Trip images">
            {imageList.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={index === activeImageIndex}
                aria-label={`View photo ${index + 1} of ${imageList.length}`}
                className={`participant-trip-card__dot ${index === activeImageIndex ? 'is-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex(index);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* CARD CONTENT */}
      <div className="participant-trip-card__content">
        {/* 2. TRIP METADATA (Duration & Location) */}
        {(trip.durationInHours != null || trip.location) && (
          <div className="participant-trip-card__meta-row">
            {trip.durationInHours != null && (
              <span className="participant-trip-card__meta-item">
                <Clock size={14} aria-hidden="true" />
                <span>{trip.durationInHours} {trip.durationInHours === 1 ? 'hour' : 'hours'}</span>
              </span>
            )}
            {trip.location && (
              <span className="participant-trip-card__meta-item">
                <MapPin size={14} aria-hidden="true" />
                <span>{trip.location}</span>
              </span>
            )}
          </div>
        )}

        {/* Title and Short Description */}
        <div className="participant-trip-card__info">
          <h3 className="participant-trip-card__title">{trip.name}</h3>
          {trip.description && (
            <p className="participant-trip-card__description">{trip.description}</p>
          )}
        </div>

        {/* 5. BATCH DATE CIRCLES / SELECTOR */}
        <div className="participant-trip-card__batches-section">
          {upcomingBatches.length > 1 ? (
            <>
              <div className="participant-trip-card__batches-header">
                <span className="participant-trip-card__batches-label">Upcoming Dates</span>
                {selectedBatch?.batchName && (
                  <span className="participant-trip-card__batch-selected-name" title={selectedBatch.batchName}>
                    {selectedBatch.batchName}
                  </span>
                )}
              </div>
              <div
                className="participant-trip-card__batch-selector"
                role="radiogroup"
                aria-label="Upcoming batch start dates"
              >
                {upcomingBatches.map((batch) => {
                  const startDate = new Date(batch.startDate!);
                  const dayNumber = String(startDate.getDate()).padStart(2, '0');
                  const monthShort = startDate.toLocaleDateString(undefined, { month: 'short' });
                  const isSelected = batch._id === selectedBatch?._id;

                  return (
                    <button
                      key={batch._id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${batch.batchName || 'Batch'} starting ${formatDate(batch.startDate)}`}
                      className={`participant-trip-card__batch-btn ${isSelected ? 'is-selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBatchSelect(batch._id);
                      }}
                    >
                      <span className="participant-trip-card__batch-day">{dayNumber}</span>
                      <span className="participant-trip-card__batch-month">{monthShort}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : upcomingBatches.length === 1 ? (
            <div className="participant-trip-card__single-batch-wrap">
              <div
                className="participant-trip-card__batch-btn is-selected participant-trip-card__batch-btn--single"
                aria-hidden="true"
              >
                <span className="participant-trip-card__batch-day">
                  {String(new Date(upcomingBatches[0].startDate!).getDate()).padStart(2, '0')}
                </span>
                <span className="participant-trip-card__batch-month">
                  {new Date(upcomingBatches[0].startDate!).toLocaleDateString(undefined, { month: 'short' })}
                </span>
              </div>
              <div className="participant-trip-card__single-batch-text">
                <span className="participant-trip-card__single-batch-date">
                  {formatDate(upcomingBatches[0].startDate)}
                  {upcomingBatches[0].endDate ? ` — ${formatDate(upcomingBatches[0].endDate)}` : ''}
                </span>
                <span className="participant-trip-card__single-batch-name">
                  {upcomingBatches[0].batchName}
                </span>
              </div>
            </div>
          ) : (
            <div className="participant-trip-card__no-batches">
              <CalendarDays size={15} aria-hidden="true" />
              <span>No upcoming batches scheduled</span>
            </div>
          )}
        </div>

        {/* 4. PRICE & 6. CTA FOOTER */}
        <div className="participant-trip-card__footer">
          {trip.basePrice != null && trip.basePrice > 0 ? (
            <div className="participant-trip-card__price-box">
              <span className="participant-trip-card__price-label">Starting from</span>
              <span className="participant-trip-card__price-amount">
                ${trip.basePrice.toLocaleString()}
              </span>
            </div>
          ) : (
            <div />
          )}

          <div className="participant-trip-card__actions">
            {isBooked ? (
              <button
                type="button"
                className="participant-trip-card__cta participant-trip-card__cta--booked"
                disabled
                onClick={(e) => e.stopPropagation()}
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                <span>Already Booked</span>
              </button>
            ) : (
              <button
                type="button"
                className="participant-trip-card__cta"
                disabled={upcomingBatches.length === 0 || isActionLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCta();
                }}
              >
                <span>{isActionLoading ? 'Booking…' : upcomingBatches.length === 0 ? 'No Batches' : ctaText}</span>
                {upcomingBatches.length > 0 && !isActionLoading && (
                  <ArrowRight size={14} aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
