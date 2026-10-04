import { useEffect, useState, useMemo, useCallback } from 'react';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  CalendarDays,
  Filter,
  MapPin,
  MessageSquare,
  Mountain,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Star,
  User,
  UserCheck,
  Utensils
} from 'lucide-react';
import { getOrgFeedback, getOrgFeedbackStats } from '../../services/feedbackService';
import { getMyOrgTrips } from '../../services/tripService';
import { getMyOrgBatches } from '../../services/batchService';
import type {
  OrgFeedbackItem,
  OrgFeedbackStats,
  PublicTrip,
  BatchSummary
} from '../../types';
import './FeedbackPage.css';

function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function FeedbackPage() {
  // Data states
  const [feedbacks, setFeedbacks] = useState<OrgFeedbackItem[]>([]);
  const [stats, setStats] = useState<OrgFeedbackStats | null>(null);
  const [trips, setTrips] = useState<PublicTrip[]>([]);
  const [batches, setBatches] = useState<BatchSummary[]>([]);

  // Query / Filter states
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Pagination meta from server
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Status states
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 1. Fetch Organization Trips and Batches for Filter Dropdowns
  useEffect(() => {
    let isMounted = true;

    async function loadFilterOptions() {
      try {
        const [tripsRes, batchesRes] = await Promise.all([
          getMyOrgTrips(),
          getMyOrgBatches()
        ]);
        if (isMounted) {
          setTrips(tripsRes.data.trips || []);
          setBatches(batchesRes.data.batches || []);
        }
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
    }

    void loadFilterOptions();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Stats
  const fetchStatsData = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await getOrgFeedbackStats();
      if (res.data.success && res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to load feedback stats', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 3. Fetch Feedback List
  const fetchListData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoadingList(true);
    }
    setError('');

    try {
      const params: {
        tripId?: string;
        batchId?: string;
        ratingOverall?: number;
        page: number;
        limit: number;
      } = {
        page,
        limit
      };

      if (selectedTripId) params.tripId = selectedTripId;
      if (selectedBatchId) params.batchId = selectedBatchId;
      if (selectedRating) params.ratingOverall = Number(selectedRating);

      const res = await getOrgFeedback(params);
      if (res.data.success) {
        setFeedbacks(res.data.feedbacks || []);
        setTotalRecords(res.data.total ?? 0);
      }
    } catch (err) {
      console.error('Failed to load feedback list', err);
      const msg = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message || 'Unable to retrieve participant feedback'
        : 'Unable to retrieve participant feedback';
      setError(msg);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [page, limit, selectedTripId, selectedBatchId, selectedRating]);

  // Load stats once on mount
  useEffect(() => {
    void fetchStatsData();
  }, [fetchStatsData]);

  // Load feedback list whenever filters or page change
  useEffect(() => {
    void fetchListData();
  }, [fetchListData]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStatsData(), fetchListData(true)]);
  };

  // Filter change handlers
  const handleTripChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTripId(e.target.value);
    setPage(1);
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBatchId(e.target.value);
    setPage(1);
  };

  const handleRatingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRating(e.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSelectedTripId('');
    setSelectedBatchId('');
    setSelectedRating('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(selectedTripId || selectedBatchId || selectedRating);

  // Available batches filtered by selected trip (if applicable)
  const filteredBatchOptions = useMemo(() => {
    if (!selectedTripId) return batches;
    return batches.filter((b) => {
      const tripRef = (b as unknown as { tripId?: string | { _id?: string } })?.tripId;
      if (!tripRef) return true;
      const tripIdStr = typeof tripRef === 'string' ? tripRef : tripRef._id;
      return tripIdStr === selectedTripId;
    });
  }, [batches, selectedTripId]);

  // Pagination calculation
  const totalPages = Math.ceil(totalRecords / limit) || 1;
  const startItem = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalRecords);

  // Rating distribution calculations
  const totalReviewsCount = stats?.totalReviews ?? 0;
  const ratingDistribution = stats?.ratingDistribution ?? { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  return (
    <section className="org-admin-feedback-page">
      {/* 1. Header */}
      <div className="org-feedback-header-row">
        <header className="org-admin-route-heading">
          <p className="org-admin-route-eyebrow">FEEDBACK</p>
          <h1>Participant Experiences</h1>
          <p>
            Review ratings, evaluations, and comments submitted by participants from completed organization treks.
          </p>
        </header>

        <div className="org-feedback-actions">
          <button
            type="button"
            className={`btn btn-secondary org-feedback-refresh-btn ${refreshing ? 'is-refreshing' : ''}`}
            onClick={() => void handleRefresh()}
            disabled={loadingList || loadingStats || refreshing}
            aria-label="Refresh feedback data"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>{refreshing ? 'Refreshing…' : 'Refresh Feedback'}</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="org-feedback-alert org-feedback-alert--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div className="org-feedback-alert-content">
            <p className="org-feedback-alert-title">Unable to Load Feedback</p>
            <p className="org-feedback-alert-message">{error}</p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary org-feedback-retry-btn"
            onClick={() => void handleRefresh()}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Key Metrics & Rating Distribution Section */}
      <section className="org-feedback-insights-section" aria-label="Feedback Insights and Rating Summary">
        {/* KPI Grid (5 metrics) */}
        <div className="org-feedback-kpi-grid">
          {/* Card 1: Total Reviews */}
          <div className="org-feedback-kpi-card">
            <div className="org-feedback-kpi-header">
              <span className="org-feedback-kpi-label">Total Reviews</span>
              <div className="org-feedback-kpi-icon-wrap org-feedback-kpi-icon-wrap--primary">
                <MessageSquare size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="org-feedback-kpi-body">
              {loadingStats ? (
                <div className="org-feedback-skeleton org-feedback-skeleton-text" />
              ) : (
                <span className="org-feedback-kpi-value">{stats?.totalReviews ?? 0}</span>
              )}
              <span className="org-feedback-kpi-subtext">Verified trek submissions</span>
            </div>
          </div>

          {/* Card 2: Average Overall Rating */}
          <div className="org-feedback-kpi-card org-feedback-kpi-card--highlight">
            <div className="org-feedback-kpi-header">
              <span className="org-feedback-kpi-label">Average Overall</span>
              <div className="org-feedback-kpi-icon-wrap org-feedback-kpi-icon-wrap--amber">
                <Star size={18} fill="currentColor" aria-hidden="true" />
              </div>
            </div>
            <div className="org-feedback-kpi-body">
              {loadingStats ? (
                <div className="org-feedback-skeleton org-feedback-skeleton-text" />
              ) : (
                <div className="org-feedback-score-display">
                  <span className="org-feedback-kpi-value">
                    {stats?.avgOverall != null ? stats.avgOverall.toFixed(2) : '—'}
                  </span>
                  {stats?.avgOverall != null && <span className="org-feedback-score-max">/ 5.0</span>}
                </div>
              )}
              <span className="org-feedback-kpi-subtext">
                {stats?.avgOverall != null ? 'Cumulative satisfaction' : 'No reviews recorded yet'}
              </span>
            </div>
          </div>

          {/* Card 3: Guide Rating */}
          <div className="org-feedback-kpi-card">
            <div className="org-feedback-kpi-header">
              <span className="org-feedback-kpi-label">Guide & Leadership</span>
              <div className="org-feedback-kpi-icon-wrap org-feedback-kpi-icon-wrap--green">
                <UserCheck size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="org-feedback-kpi-body">
              {loadingStats ? (
                <div className="org-feedback-skeleton org-feedback-skeleton-text" />
              ) : (
                <div className="org-feedback-score-display">
                  <span className="org-feedback-kpi-value">
                    {stats?.avgGuide != null ? stats.avgGuide.toFixed(2) : '—'}
                  </span>
                  {stats?.avgGuide != null && <span className="org-feedback-score-max">/ 5.0</span>}
                </div>
              )}
              <span className="org-feedback-kpi-subtext">Field leadership & guidance</span>
            </div>
          </div>

          {/* Card 4: Food Rating */}
          <div className="org-feedback-kpi-card">
            <div className="org-feedback-kpi-header">
              <span className="org-feedback-kpi-label">Expedition Food</span>
              <div className="org-feedback-kpi-icon-wrap org-feedback-kpi-icon-wrap--teal">
                <Utensils size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="org-feedback-kpi-body">
              {loadingStats ? (
                <div className="org-feedback-skeleton org-feedback-skeleton-text" />
              ) : (
                <div className="org-feedback-score-display">
                  <span className="org-feedback-kpi-value">
                    {stats?.avgFood != null ? stats.avgFood.toFixed(2) : '—'}
                  </span>
                  {stats?.avgFood != null && <span className="org-feedback-score-max">/ 5.0</span>}
                </div>
              )}
              <span className="org-feedback-kpi-subtext">Camp meals & nourishment</span>
            </div>
          </div>

          {/* Card 5: Safety Rating */}
          <div className="org-feedback-kpi-card">
            <div className="org-feedback-kpi-header">
              <span className="org-feedback-kpi-label">Safety & Altitude Care</span>
              <div className="org-feedback-kpi-icon-wrap org-feedback-kpi-icon-wrap--indigo">
                <ShieldCheck size={18} aria-hidden="true" />
              </div>
            </div>
            <div className="org-feedback-kpi-body">
              {loadingStats ? (
                <div className="org-feedback-skeleton org-feedback-skeleton-text" />
              ) : (
                <div className="org-feedback-score-display">
                  <span className="org-feedback-kpi-value">
                    {stats?.avgSafety != null ? stats.avgSafety.toFixed(2) : '—'}
                  </span>
                  {stats?.avgSafety != null && <span className="org-feedback-score-max">/ 5.0</span>}
                </div>
              )}
              <span className="org-feedback-kpi-subtext">Altitude protocols & care</span>
            </div>
          </div>
        </div>

        {/* Rating Breakdown & Distribution Visual Card */}
        <div className="org-feedback-distribution-card">
          <div className="org-feedback-distribution-header">
            <div>
              <h2 className="org-feedback-distribution-title">Rating Distribution</h2>
              <p className="org-feedback-distribution-desc">
                Breakdown of participant satisfaction across all 5-star rating levels.
              </p>
            </div>
            {stats?.avgOverall != null && (
              <div className="org-feedback-overall-badge">
                <Star size={16} fill="currentColor" aria-hidden="true" />
                <span>{stats.avgOverall.toFixed(2)} Overall</span>
              </div>
            )}
          </div>

          <div className="org-feedback-distribution-bars">
            {[5, 4, 3, 2, 1].map((starNum) => {
              const count = ratingDistribution[String(starNum)] ?? 0;
              const percent = totalReviewsCount > 0 ? (count / totalReviewsCount) * 100 : 0;

              return (
                <div key={starNum} className="org-feedback-distribution-row">
                  <div className="org-feedback-distribution-star-label">
                    <span>{starNum}</span>
                    <Star size={13} fill="currentColor" className="org-feedback-star-tiny" aria-hidden="true" />
                  </div>

                  <div
                    className="org-feedback-distribution-track"
                    role="progressbar"
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={totalReviewsCount || 1}
                    aria-label={`${starNum} star reviews: ${count} of ${totalReviewsCount}`}
                  >
                    <div
                      className={`org-feedback-distribution-fill org-feedback-distribution-fill--${starNum}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="org-feedback-distribution-count">
                    <span className="org-feedback-distribution-count-num">{count}</span>
                    <span className="org-feedback-distribution-count-percent">
                      ({totalReviewsCount > 0 ? `${Math.round(percent)}%` : '0%'})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Filters Toolbar */}
      <section className="org-feedback-filters-bar" aria-label="Feedback Filters">
        <div className="org-feedback-filters-heading">
          <div className="org-feedback-filters-title-wrap">
            <Filter size={16} aria-hidden="true" />
            <span>Filter Reviews</span>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="org-feedback-reset-btn"
              onClick={handleResetFilters}
              aria-label="Reset all filters"
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="org-feedback-filters-grid">
          {/* Trip Selector */}
          <div className="org-feedback-filter-group">
            <label htmlFor="filter-trip" className="org-feedback-filter-label">
              Trip
            </label>
            <select
              id="filter-trip"
              className="org-feedback-select"
              value={selectedTripId}
              onChange={handleTripChange}
            >
              <option value="">All Organization Trips</option>
              {trips.map((trip) => (
                <option key={trip._id} value={trip._id}>
                  {trip.name} {trip.location ? `(${trip.location})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Selector */}
          <div className="org-feedback-filter-group">
            <label htmlFor="filter-batch" className="org-feedback-filter-label">
              Batch / Departure
            </label>
            <select
              id="filter-batch"
              className="org-feedback-select"
              value={selectedBatchId}
              onChange={handleBatchChange}
            >
              <option value="">All Batches</option>
              {filteredBatchOptions.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.batchName} {batch.status ? `[${batch.status}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Overall Rating Selector */}
          <div className="org-feedback-filter-group">
            <label htmlFor="filter-rating" className="org-feedback-filter-label">
              Overall Rating
            </label>
            <select
              id="filter-rating"
              className="org-feedback-select"
              value={selectedRating}
              onChange={handleRatingChange}
            >
              <option value="">All Ratings (1 – 5 Stars)</option>
              <option value="5">5 Stars (Exceptional)</option>
              <option value="4">4 Stars (Very Good)</option>
              <option value="3">3 Stars (Good)</option>
              <option value="2">2 Stars (Fair)</option>
              <option value="1">1 Star (Poor)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 4. Feedback Review Cards List */}
      <section className="org-feedback-list-section" aria-label="Participant Review List">
        {/* Results Count Meta */}
        <div className="org-feedback-list-meta">
          <h2 className="org-feedback-list-title">
            <span>Reviews</span>
            {!loadingList && (
              <span className="org-feedback-count-badge">
                {totalRecords} {totalRecords === 1 ? 'review' : 'reviews'}
              </span>
            )}
          </h2>

          {!loadingList && totalRecords > 0 && (
            <p className="org-feedback-showing-text">
              Showing {startItem} – {endItem} of {totalRecords} reviews
            </p>
          )}
        </div>

        {/* Loading Skeletons */}
        {loadingList ? (
          <div className="org-feedback-cards-grid" role="status" aria-label="Loading feedback reviews">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="org-feedback-card org-feedback-card--skeleton">
                <div className="org-feedback-skeleton org-feedback-skeleton-title" />
                <div className="org-feedback-skeleton org-feedback-skeleton-line" />
                <div className="org-feedback-skeleton org-feedback-skeleton-block" />
              </div>
            ))}
          </div>
        ) : totalReviewsCount === 0 && !hasActiveFilters ? (
          /* Empty Organization State (Zero reviews ever submitted) */
          <div className="org-feedback-empty-state">
            <div className="org-feedback-empty-icon-wrap">
              <Mountain size={42} aria-hidden="true" />
            </div>
            <h3 className="org-feedback-empty-title">No Participant Feedback Yet</h3>
            <p className="org-feedback-empty-desc">
              Feedback submitted by participants after their trek batches are marked as completed will automatically appear here.
            </p>
          </div>
        ) : feedbacks.length === 0 ? (
          /* Empty Filtered State (Filters returned 0 results) */
          <div className="org-feedback-empty-state">
            <div className="org-feedback-empty-icon-wrap">
              <Filter size={36} aria-hidden="true" />
            </div>
            <h3 className="org-feedback-empty-title">No Reviews Match Your Filters</h3>
            <p className="org-feedback-empty-desc">
              We couldn't find any feedback records matching your selected trip, batch, or rating criteria.
            </p>
            <button
              type="button"
              className="btn btn-secondary btn-sm org-feedback-empty-reset-btn"
              onClick={handleResetFilters}
            >
              Clear Active Filters
            </button>
          </div>
        ) : (
          /* Review Cards List */
          <div className="org-feedback-cards-grid">
            {feedbacks.map((fb) => {
              const tripName = fb.tripId?.name || 'Trek Journey';
              const location = fb.tripId?.location;
              const batchName = fb.batchId?.batchName || 'Departure Batch';
              const participantName = fb.participantId?.fullName || 'Verified Participant';

              return (
                <article key={fb._id} className="org-feedback-card">
                  {/* Card Header: Participant & Date */}
                  <div className="org-feedback-card-header">
                    <div className="org-feedback-card-author">
                      <div className="org-feedback-avatar" aria-hidden="true">
                        <User size={16} />
                      </div>
                      <div className="org-feedback-author-meta">
                        <span className="org-feedback-author-name">{participantName}</span>
                        <span className="org-feedback-submission-date">
                          Submitted {formatDate(fb.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Overall Score Badge */}
                    <div className="org-feedback-overall-score-pill">
                      <Star size={14} fill="currentColor" aria-hidden="true" />
                      <span className="org-feedback-score-digit">{fb.ratingOverall}.0</span>
                    </div>
                  </div>

                  {/* Trek & Batch Context */}
                  <div className="org-feedback-trek-context">
                    <div className="org-feedback-context-item" title={tripName}>
                      <Mountain size={14} className="org-feedback-context-icon" aria-hidden="true" />
                      <span className="org-feedback-context-text org-feedback-context-text--bold">
                        {tripName}
                      </span>
                    </div>

                    {location && (
                      <div className="org-feedback-context-item" title={location}>
                        <MapPin size={13} className="org-feedback-context-icon" aria-hidden="true" />
                        <span className="org-feedback-context-text">{location}</span>
                      </div>
                    )}

                    <div className="org-feedback-context-item" title={batchName}>
                      <CalendarDays size={13} className="org-feedback-context-icon" aria-hidden="true" />
                      <span className="org-feedback-context-text">{batchName}</span>
                    </div>
                  </div>

                  {/* Detailed Category Ratings Chips */}
                  <div className="org-feedback-ratings-row">
                    <div className="org-feedback-rating-badge" title="Guide & Leadership">
                      <UserCheck size={13} className="org-feedback-badge-icon" aria-hidden="true" />
                      <span className="org-feedback-badge-label">Guide</span>
                      <span className="org-feedback-badge-val">{fb.ratingGuide}★</span>
                    </div>

                    <div className="org-feedback-rating-badge" title="Expedition Food">
                      <Utensils size={13} className="org-feedback-badge-icon" aria-hidden="true" />
                      <span className="org-feedback-badge-label">Food</span>
                      <span className="org-feedback-badge-val">{fb.ratingFood}★</span>
                    </div>

                    <div className="org-feedback-rating-badge" title="Safety & Altitude Care">
                      <ShieldCheck size={13} className="org-feedback-badge-icon" aria-hidden="true" />
                      <span className="org-feedback-badge-label">Safety</span>
                      <span className="org-feedback-badge-val">{fb.ratingSafety}★</span>
                    </div>
                  </div>

                  {/* Participant Comment */}
                  <div className="org-feedback-comment-container">
                    {fb.comments && fb.comments.trim().length > 0 ? (
                      <blockquote className="org-feedback-comment-quote">
                        “{fb.comments.trim()}”
                      </blockquote>
                    ) : (
                      <p className="org-feedback-no-comment">
                        Participant provided ratings without written remarks.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* 5. Pagination Controls */}
        {!loadingList && totalPages > 1 && (
          <nav className="org-feedback-pagination" aria-label="Feedback pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm org-feedback-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous Page"
            >
              Previous
            </button>

            <span className="org-feedback-page-indicator">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm org-feedback-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next Page"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </section>
  );
}
