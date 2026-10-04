import { useEffect, useState, useMemo } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  RefreshCw,
  Stethoscope,
  UserCheck,
  Users
} from 'lucide-react';
import { getOrgStats, getBatchComplianceReport } from '../../services/analyticsService';
import { getMyOrgBatches } from '../../services/batchService';
import type { BatchSummary } from '../../types';
import './AnalyticsPage.css';

type OrganizationStats = {
  totalTrips?: number;
  totalBatches?: number;
  totalBookings?: number;
  confirmedBookings?: number;
};

type AnalyticsBatch = BatchSummary & {
  tripId?: string | { name?: string } | null;
  maxCapacity?: number;
};

type BatchCompliance = {
  batch: AnalyticsBatch;
  attendancePercent: number | null;
  medicalCompliancePercent: number | null;
  unavailable: boolean;
};

function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate && !endDate) return null;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const validStart = start && !Number.isNaN(start.getTime());
  const validEnd = end && !Number.isNaN(end.getTime());

  if (validStart && validEnd) {
    return `${start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })} – ${end.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })}`;
  }
  if (validStart) {
    return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (validEnd) {
    return end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return null;
}

function formatPercent(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : `${Math.round(value)}%`;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [batches, setBatches] = useState<AnalyticsBatch[]>([]);
  const [compliance, setCompliance] = useState<BatchCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const [statsRes, batchesRes] = await Promise.all([
        getOrgStats(),
        getMyOrgBatches()
      ]);

      const loadedStats = statsRes.data.stats ?? null;
      const loadedBatches: AnalyticsBatch[] = batchesRes.data.batches || [];

      setStats(loadedStats);
      setBatches(loadedBatches);

      // Fetch compliance reports for all batches
      const complianceResults = await Promise.all(
        loadedBatches.map(async (batch): Promise<BatchCompliance> => {
          try {
            const report = await getBatchComplianceReport(batch._id);
            return {
              batch,
              attendancePercent: report.data.attendancePercent ?? null,
              medicalCompliancePercent: report.data.medicalCompliancePercent ?? null,
              unavailable: false
            };
          } catch (err) {
            console.error('Failed to load compliance report for batch', batch._id, err);
            return {
              batch,
              attendancePercent: null,
              medicalCompliancePercent: null,
              unavailable: true
            };
          }
        })
      );

      setCompliance(complianceResults);
    } catch (err: unknown) {
      console.error(err);
      setError(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Unable to load analytics data.'
          : 'Unable to load analytics data.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Operational calculations directly from real backend records
  const batchStats = useMemo(() => {
    const total = batches.length;
    const open = batches.filter((b) => b.status === 'Open').length;
    const full = batches.filter((b) => b.status === 'Full').length;
    const active = open + full;
    const completed = batches.filter((b) => b.status === 'Completed').length;
    const cancelled = batches.filter((b) => b.status?.trim() === 'Cancelled').length;

    const openPercent = total > 0 ? (open / total) * 100 : 0;
    const fullPercent = total > 0 ? (full / total) * 100 : 0;
    const completedPercent = total > 0 ? (completed / total) * 100 : 0;
    const cancelledPercent = total > 0 ? (cancelled / total) * 100 : 0;

    return {
      total,
      open,
      full,
      active,
      completed,
      cancelled,
      openPercent,
      fullPercent,
      completedPercent,
      cancelledPercent
    };
  }, [batches]);

  const bookingStats = useMemo(() => {
    const total = stats?.totalBookings ?? 0;
    const confirmed = stats?.confirmedBookings ?? 0;
    const unconfirmed = Math.max(0, total - confirmed);
    const confirmedRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    const unconfirmedRate = total > 0 ? 100 - confirmedRate : 0;

    return {
      total,
      confirmed,
      unconfirmed,
      confirmedRate,
      unconfirmedRate
    };
  }, [stats]);

  const capacityStats = useMemo(() => {
    const totalCapacity = batches.reduce((sum, b) => sum + (b.maxCapacity || 0), 0);
    const confirmed = stats?.confirmedBookings ?? 0;
    const remaining = Math.max(0, totalCapacity - confirmed);
    const utilizationRate =
      totalCapacity > 0 ? Math.min(100, Math.round((confirmed / totalCapacity) * 100)) : 0;

    return {
      totalCapacity,
      confirmed,
      remaining,
      utilizationRate
    };
  }, [batches, stats]);

  // Operational health metrics derived from genuine records
  const healthMetrics = useMemo(() => {
    const validAttendance = compliance
      .filter((c) => !c.unavailable && c.attendancePercent != null)
      .map((c) => c.attendancePercent as number);

    const avgAttendance =
      validAttendance.length > 0
        ? Math.round(validAttendance.reduce((a, b) => a + b, 0) / validAttendance.length)
        : null;

    const validMedical = compliance
      .filter((c) => !c.unavailable && c.medicalCompliancePercent != null)
      .map((c) => c.medicalCompliancePercent as number);

    const avgMedical =
      validMedical.length > 0
        ? Math.round(validMedical.reduce((a, b) => a + b, 0) / validMedical.length)
        : null;

    return {
      avgAttendance,
      avgMedical
    };
  }, [compliance]);

  return (
    <section className="org-admin-analytics-page">
      {/* 1. Page Header */}
      <div className="org-admin-analytics-header-row">
        <header className="org-admin-route-heading">
          <p className="org-admin-route-eyebrow">Insights</p>
          <h1>Analytics</h1>
          <p>Understand your organization's trekking operations and performance.</p>
        </header>

        <div className="org-admin-analytics-actions">
          <button
            type="button"
            className={`btn btn-secondary org-admin-analytics-refresh-btn ${refreshing ? 'is-refreshing' : ''}`}
            onClick={() => void fetchData(true)}
            disabled={loading || refreshing}
            aria-label="Refresh analytics data"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>{refreshing ? 'Refreshing…' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Error Alert with Retry */}
      {error && (
        <div
          className="org-admin-route-error"
          role="alert"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
        >
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void fetchData()}>
            Retry
          </button>
        </div>
      )}

      {/* 2. KPI Command Center */}
      {loading ? (
        <section className="org-admin-analytics-kpi-grid" aria-label="Loading analytics overview">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="org-admin-analytics-kpi-card org-admin-analytics-kpi-card--skeleton">
              <div className="skeleton-box skeleton-kpi-label" />
              <div className="skeleton-box skeleton-kpi-value" />
              <div className="skeleton-box skeleton-kpi-sub" />
            </div>
          ))}
        </section>
      ) : (
        <section className="org-admin-analytics-kpi-grid" aria-label="Organization KPI Overview">
          <div className="org-admin-analytics-kpi-card">
            <span className="org-admin-analytics-kpi-label">Total Trips</span>
            <div className="org-admin-analytics-kpi-value-row">
              <strong className="org-admin-analytics-kpi-value">{stats?.totalTrips ?? 0}</strong>
              <Compass size={18} className="org-admin-analytics-kpi-icon icon-trips" aria-hidden="true" />
            </div>
            <span className="org-admin-analytics-kpi-sub">Registered trekking itineraries</span>
          </div>

          <div className="org-admin-analytics-kpi-card">
            <span className="org-admin-analytics-kpi-label">Total Batches</span>
            <div className="org-admin-analytics-kpi-value-row">
              <strong className="org-admin-analytics-kpi-value">{stats?.totalBatches ?? 0}</strong>
              <CalendarDays size={18} className="org-admin-analytics-kpi-icon icon-batches" aria-hidden="true" />
            </div>
            <span className="org-admin-analytics-kpi-sub">Scheduled departure operations</span>
          </div>

          <div className="org-admin-analytics-kpi-card">
            <span className="org-admin-analytics-kpi-label">Total Bookings</span>
            <div className="org-admin-analytics-kpi-value-row">
              <strong className="org-admin-analytics-kpi-value">{stats?.totalBookings ?? 0}</strong>
              <Users size={18} className="org-admin-analytics-kpi-icon icon-bookings" aria-hidden="true" />
            </div>
            <span className="org-admin-analytics-kpi-sub">Registered participant inquiries</span>
          </div>

          <div className="org-admin-analytics-kpi-card">
            <span className="org-admin-analytics-kpi-label">Confirmed Bookings</span>
            <div className="org-admin-analytics-kpi-value-row">
              <strong className="org-admin-analytics-kpi-value">{stats?.confirmedBookings ?? 0}</strong>
              <CheckCircle2 size={18} className="org-admin-analytics-kpi-icon icon-confirmed" aria-hidden="true" />
            </div>
            <span className="org-admin-analytics-kpi-sub">Verified &amp; confirmed expedition spots</span>
          </div>
        </section>
      )}

      {/* 3 & 4. Dual Operational Intelligence Panels */}
      {loading ? (
        <div className="org-admin-analytics-dual-grid">
          <div className="skeleton-box skeleton-panel" />
          <div className="skeleton-box skeleton-panel" />
        </div>
      ) : (
        <div className="org-admin-analytics-dual-grid">
          {/* Section 5: Batch Operations */}
          <article className="org-admin-analytics-panel-card" aria-labelledby="batch-ops-title">
            <div className="org-admin-analytics-panel-header">
              <div className="org-admin-analytics-panel-title-wrap">
                <span className="org-admin-route-eyebrow">Operations</span>
                <h2 id="batch-ops-title" className="org-admin-analytics-panel-title">
                  Batch Operations
                </h2>
              </div>
              <span className="org-admin-compliance-count">{batchStats.total}</span>
            </div>
            <p className="org-admin-analytics-panel-desc">
              Real status distribution across scheduled departure batches.
            </p>

            {batchStats.total === 0 ? (
              <p className="org-admin-route-message">No departures scheduled yet.</p>
            ) : (
              <>
                {/* Visual Segmented Distribution Bar */}
                <div
                  className="org-admin-analytics-segmented-bar"
                  role="progressbar"
                  aria-label="Batch status distribution"
                >
                  {batchStats.open > 0 && (
                    <div
                      className="org-admin-analytics-segment seg-open"
                      style={{ width: `${batchStats.openPercent}%` }}
                      title={`Open: ${batchStats.open}`}
                    />
                  )}
                  {batchStats.full > 0 && (
                    <div
                      className="org-admin-analytics-segment seg-full"
                      style={{ width: `${batchStats.fullPercent}%` }}
                      title={`Full: ${batchStats.full}`}
                    />
                  )}
                  {batchStats.completed > 0 && (
                    <div
                      className="org-admin-analytics-segment seg-completed"
                      style={{ width: `${batchStats.completedPercent}%` }}
                      title={`Completed: ${batchStats.completed}`}
                    />
                  )}
                  {batchStats.cancelled > 0 && (
                    <div
                      className="org-admin-analytics-segment seg-cancelled"
                      style={{ width: `${batchStats.cancelledPercent}%` }}
                      title={`Cancelled: ${batchStats.cancelled}`}
                    />
                  )}
                </div>

                {/* Status Breakdown Legend & Counts */}
                <div className="org-admin-analytics-breakdown-grid">
                  <div className="org-admin-analytics-breakdown-card">
                    <div className="org-admin-analytics-breakdown-top">
                      <span className="org-admin-analytics-dot dot-open" />
                      <span>Open</span>
                    </div>
                    <strong className="org-admin-analytics-breakdown-val">{batchStats.open}</strong>
                    <span className="org-admin-analytics-breakdown-sub">{Math.round(batchStats.openPercent)}%</span>
                  </div>

                  <div className="org-admin-analytics-breakdown-card">
                    <div className="org-admin-analytics-breakdown-top">
                      <span className="org-admin-analytics-dot dot-full" />
                      <span>Full</span>
                    </div>
                    <strong className="org-admin-analytics-breakdown-val">{batchStats.full}</strong>
                    <span className="org-admin-analytics-breakdown-sub">{Math.round(batchStats.fullPercent)}%</span>
                  </div>

                  <div className="org-admin-analytics-breakdown-card">
                    <div className="org-admin-analytics-breakdown-top">
                      <span className="org-admin-analytics-dot dot-completed" />
                      <span>Completed</span>
                    </div>
                    <strong className="org-admin-analytics-breakdown-val">{batchStats.completed}</strong>
                    <span className="org-admin-analytics-breakdown-sub">{Math.round(batchStats.completedPercent)}%</span>
                  </div>

                  <div className="org-admin-analytics-breakdown-card">
                    <div className="org-admin-analytics-breakdown-top">
                      <span className="org-admin-analytics-dot dot-cancelled" />
                      <span>Cancelled</span>
                    </div>
                    <strong className="org-admin-analytics-breakdown-val">{batchStats.cancelled}</strong>
                    <span className="org-admin-analytics-breakdown-sub">{Math.round(batchStats.cancelledPercent)}%</span>
                  </div>
                </div>
              </>
            )}
          </article>

          {/* Section 4: Booking Insights */}
          <article className="org-admin-analytics-panel-card" aria-labelledby="booking-insights-title">
            <div className="org-admin-analytics-panel-header">
              <div className="org-admin-analytics-panel-title-wrap">
                <span className="org-admin-route-eyebrow">Organization</span>
                <h2 id="booking-insights-title" className="org-admin-analytics-panel-title">
                  Booking Overview
                </h2>
              </div>
              <span className="org-admin-compliance-count">{bookingStats.total}</span>
            </div>
            <p className="org-admin-analytics-panel-desc">
              Confirmed participant reservations compared to pending bookings.
            </p>

            {bookingStats.total === 0 ? (
              <p className="org-admin-route-message">No bookings recorded yet.</p>
            ) : (
              <>
                {/* Segmented Booking Bar */}
                <div
                  className="org-admin-analytics-segmented-bar"
                  role="progressbar"
                  aria-label="Booking status distribution"
                >
                  <div
                    className="org-admin-analytics-segment seg-confirmed"
                    style={{ width: `${bookingStats.confirmedRate}%` }}
                    title={`Confirmed: ${bookingStats.confirmed}`}
                  />
                  <div
                    className="org-admin-analytics-segment seg-pending"
                    style={{ width: `${bookingStats.unconfirmedRate}%` }}
                    title={`Pending / Other: ${bookingStats.unconfirmed}`}
                  />
                </div>

                {/* Booking Breakdown Cards */}
                <div className="org-admin-analytics-breakdown-grid">
                  <div className="org-admin-analytics-breakdown-card">
                    <div className="org-admin-analytics-breakdown-top">
                      <span className="org-admin-analytics-dot dot-confirmed" />
                      <span>Confirmed</span>
                    </div>
                    <strong className="org-admin-analytics-breakdown-val">{bookingStats.confirmed}</strong>
                    <span className="org-admin-analytics-breakdown-sub">{bookingStats.confirmedRate}% of total</span>
                  </div>

                  <div className="org-admin-analytics-breakdown-card">
                    <div className="org-admin-analytics-breakdown-top">
                      <span className="org-admin-analytics-dot dot-pending" />
                      <span>Pending Confirmation</span>
                    </div>
                    <strong className="org-admin-analytics-breakdown-val">{bookingStats.unconfirmed}</strong>
                    <span className="org-admin-analytics-breakdown-sub">{bookingStats.unconfirmedRate}% of total</span>
                  </div>
                </div>
              </>
            )}
          </article>
        </div>
      )}

      {/* 6 & 7. Capacity Insights & Operational Health Row */}
      {!loading && (
        <div className="org-admin-analytics-dual-grid">
          {/* Section 6: Capacity / Participation Insights */}
          {capacityStats.totalCapacity > 0 ? (
            <article className="org-admin-analytics-panel-card" aria-labelledby="capacity-insights-title">
              <div className="org-admin-analytics-panel-header">
                <div className="org-admin-analytics-panel-title-wrap">
                  <span className="org-admin-route-eyebrow">Participation</span>
                  <h2 id="capacity-insights-title" className="org-admin-analytics-panel-title">
                    Capacity &amp; Allocation
                  </h2>
                </div>
                <span className="org-admin-compliance-count">{capacityStats.utilizationRate}%</span>
              </div>
              <p className="org-admin-analytics-panel-desc">
                Total departure slots configured across all batches versus confirmed reservations.
              </p>

              <div className="org-admin-analytics-capacity-row">
                <div className="org-admin-capacity-stat">
                  <span className="org-admin-capacity-stat__label">Total Capacity</span>
                  <strong className="org-admin-capacity-stat__val">{capacityStats.totalCapacity}</strong>
                </div>
                <div className="org-admin-capacity-stat">
                  <span className="org-admin-capacity-stat__label">Confirmed Slots</span>
                  <strong className="org-admin-capacity-stat__val val-accent">{capacityStats.confirmed}</strong>
                </div>
                <div className="org-admin-capacity-stat">
                  <span className="org-admin-capacity-stat__label">Remaining Slots</span>
                  <strong className="org-admin-capacity-stat__val">{capacityStats.remaining}</strong>
                </div>
              </div>

              {/* Progress utilization bar */}
              <div
                className="org-admin-analytics-segmented-bar"
                role="progressbar"
                aria-label={`Capacity utilization: ${capacityStats.utilizationRate}%`}
              >
                <div
                  className="org-admin-analytics-segment seg-confirmed"
                  style={{ width: `${capacityStats.utilizationRate}%` }}
                />
              </div>
            </article>
          ) : null}

          {/* Section 7: Operational Health */}
          <article className="org-admin-analytics-panel-card" aria-labelledby="operational-health-title">
            <div className="org-admin-analytics-panel-header">
              <div className="org-admin-analytics-panel-title-wrap">
                <span className="org-admin-route-eyebrow">Readiness</span>
                <h2 id="operational-health-title" className="org-admin-analytics-panel-title">
                  Operational Health
                </h2>
              </div>
            </div>
            <p className="org-admin-analytics-panel-desc">
              Current operational readiness and clearance indicators across field departments.
            </p>

            <div className="org-admin-health-grid">
              <div className="org-admin-health-card">
                <div className="org-admin-health-card__info">
                  <span className="org-admin-health-card__label">Active Departures</span>
                  <strong className="org-admin-health-card__val">{batchStats.active} Batches</strong>
                  <span className="org-admin-health-card__sub">In field or accepting bookings</span>
                </div>
                <span className="org-admin-health-badge health-good">Healthy</span>
              </div>

              <div className="org-admin-health-card">
                <div className="org-admin-health-card__info">
                  <span className="org-admin-health-card__label">Booking Confirmation</span>
                  <strong className="org-admin-health-card__val">{bookingStats.confirmedRate}% Confirmed</strong>
                  <span className="org-admin-health-card__sub">{bookingStats.unconfirmed} pending inquiry</span>
                </div>
                <span
                  className={`org-admin-health-badge ${
                    bookingStats.confirmedRate >= 75 ? 'health-good' : 'health-review'
                  }`}
                >
                  {bookingStats.confirmedRate >= 75 ? 'Healthy' : 'Needs Review'}
                </span>
              </div>

              <div className="org-admin-health-card">
                <div className="org-admin-health-card__info">
                  <span className="org-admin-health-card__label">Avg Field Attendance</span>
                  <strong className="org-admin-health-card__val">
                    {healthMetrics.avgAttendance != null ? `${healthMetrics.avgAttendance}%` : '—'}
                  </strong>
                  <span className="org-admin-health-card__sub">Across reported departures</span>
                </div>
                <span
                  className={`org-admin-health-badge ${
                    healthMetrics.avgAttendance == null || healthMetrics.avgAttendance >= 80
                      ? 'health-good'
                      : 'health-review'
                  }`}
                >
                  {healthMetrics.avgAttendance == null || healthMetrics.avgAttendance >= 80
                    ? 'Healthy'
                    : 'Needs Review'}
                </span>
              </div>

              <div className="org-admin-health-card">
                <div className="org-admin-health-card__info">
                  <span className="org-admin-health-card__label">Medical Clearance</span>
                  <strong className="org-admin-health-card__val">
                    {healthMetrics.avgMedical != null ? `${healthMetrics.avgMedical}%` : '—'}
                  </strong>
                  <span className="org-admin-health-card__sub">Approved reviews ratio</span>
                </div>
                <span
                  className={`org-admin-health-badge ${
                    healthMetrics.avgMedical == null || healthMetrics.avgMedical >= 80
                      ? 'health-good'
                      : 'health-attention'
                  }`}
                >
                  {healthMetrics.avgMedical == null || healthMetrics.avgMedical >= 80
                    ? 'Healthy'
                    : 'Attention Required'}
                </span>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* 5. Field Batch Compliance Tracking */}
      <section className="org-admin-compliance-section" aria-labelledby="batch-compliance-title">
        <div className="org-admin-compliance-header">
          <div>
            <div className="org-admin-compliance-title-wrap">
              <Activity size={18} className="org-admin-analytics-kpi-icon" aria-hidden="true" />
              <h2 id="batch-compliance-title" className="org-admin-compliance-title">
                Batch Compliance Tracking
              </h2>
              <span className="org-admin-compliance-count">{compliance.length}</span>
            </div>
            <p className="org-admin-compliance-desc">
              Field attendance and wilderness medical clearance records per departure batch.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="org-admin-compliance-grid" aria-label="Loading batch compliance">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="org-admin-compliance-card org-admin-analytics-kpi-card--skeleton" aria-hidden="true">
                <div className="skeleton-box skeleton-kpi-label" />
                <div className="skeleton-box skeleton-kpi-value" />
                <div className="skeleton-box skeleton-kpi-sub" />
              </div>
            ))}
          </div>
        ) : compliance.length === 0 ? (
          <div className="org-admin-analytics-empty">
            <Activity size={32} aria-hidden="true" />
            <h3>No batches found</h3>
            <p>Schedule departure batches to begin tracking field attendance and medical review clearance.</p>
          </div>
        ) : (
          <div className="org-admin-compliance-grid">
            {compliance.map(({ batch, attendancePercent, medicalCompliancePercent, unavailable }) => {
              const tripName = typeof batch.tripId === 'object' && batch.tripId ? batch.tripId.name : null;
              const dateRange = formatDateRange(batch.startDate, batch.endDate);
              const statusClean = (batch.status || 'Open').trim().toLowerCase();

              return (
                <article className="org-admin-compliance-card" key={batch._id}>
                  <div>
                    <div className="org-admin-compliance-card__header">
                      <div className="org-admin-compliance-batch-info">
                        <h3 className="org-admin-compliance-batch-name">{batch.batchName || 'Batch'}</h3>
                        {tripName && <p className="org-admin-compliance-trip-name">{tripName}</p>}
                        {dateRange && <span className="org-admin-compliance-dates">{dateRange}</span>}
                      </div>
                      <span className={`org-admin-compliance-status-badge status-badge-${statusClean}`}>
                        {batch.status || 'Open'}
                      </span>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      {unavailable ? (
                        <p className="org-admin-compliance-unavailable">Compliance data not yet recorded</p>
                      ) : (
                        <div className="org-admin-compliance-metrics-box">
                          <div className="org-admin-compliance-item">
                            <div className="org-admin-compliance-item__top">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <UserCheck size={12} aria-hidden="true" />
                                <span>Attendance</span>
                              </span>
                              <strong>{formatPercent(attendancePercent)}</strong>
                            </div>
                            <progress
                              className="org-admin-compliance-progress-bar"
                              value={attendancePercent ?? 0}
                              max={100}
                              aria-label={`Attendance: ${formatPercent(attendancePercent)}`}
                            />
                          </div>

                          <div className="org-admin-compliance-item">
                            <div className="org-admin-compliance-item__top">
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Stethoscope size={12} aria-hidden="true" />
                                <span>Medical Clearance</span>
                              </span>
                              <strong>{formatPercent(medicalCompliancePercent)}</strong>
                            </div>
                            <progress
                              className="org-admin-compliance-progress-bar progress-medical"
                              value={medicalCompliancePercent ?? 0}
                              max={100}
                              aria-label={`Medical Clearance: ${formatPercent(medicalCompliancePercent)}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="org-admin-compliance-card__footer">
                    <Link
                      className="org-admin-compliance-view-link"
                      to={`/dashboard/org-admin/batches/${batch._id}`}
                      aria-label={`View batch departure ${batch.batchName}`}
                    >
                      <span>Manage Batch</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
