import { useState, useEffect, useCallback, useMemo } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTripsByOrg } from '../services/tripService';
import { getMyOrgBatches } from '../services/batchService';
import { getMyOrgStaff } from '../services/staffService';
import { getMyOrgGear } from '../services/gearService';
import { getOrgStats } from '../services/analyticsService';
import type { BatchSummary, GearItemSummary, OrganizationStaffSummary } from '../types';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Compass,
  MapPin,
  Mountain,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  Wrench
} from 'lucide-react';
import './OrgAdminDashboard.css';

type OrgTrip = {
  _id: string;
  name: string;
  location?: string;
  status?: string;
  difficultyLevel?: string;
  durationInHours?: number;
  durationDays?: number;
  basePrice?: number;
  imageUrl?: string;
  images?: { url: string; publicId: string }[];
};

type OrgBatch = BatchSummary & {
  tripId?: string | { _id: string; name?: string };
  maxCapacity?: number;
};

type OrgGearItem = GearItemSummary & {
  condition?: string;
};

type OrgStats = {
  totalTrips?: number;
  totalBatches?: number;
  totalBookings?: number;
  confirmedBookings?: number;
};

export default function OrgAdminDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState<OrgStats | null>(null);
  const [trips, setTrips] = useState<OrgTrip[]>([]);
  const [batches, setBatches] = useState<OrgBatch[]>([]);
  const [staffMembers, setStaffMembers] = useState<OrganizationStaffSummary[]>([]);
  const [gearItems, setGearItems] = useState<OrgGearItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (!user?.organizationId) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const [statsRes, tripsRes, batchesRes, staffRes, gearRes] = await Promise.all([
        getOrgStats().catch((e) => {
          console.error('Failed to load stats', e);
          return { data: { stats: null } };
        }),
        getTripsByOrg(user.organizationId).catch((e) => {
          console.error('Failed to load trips', e);
          return { data: { trips: [] } };
        }),
        getMyOrgBatches().catch((e) => {
          console.error('Failed to load batches', e);
          return { data: { batches: [] } };
        }),
        getMyOrgStaff().catch((e) => {
          console.error('Failed to load staff', e);
          return { data: { staff: [] } };
        }),
        getMyOrgGear().catch((e) => {
          console.error('Failed to load gear', e);
          return { data: { gearItems: [] } };
        })
      ]);

      setStats(statsRes.data?.stats ?? null);
      setTrips(tripsRes.data?.trips ?? []);
      setBatches(batchesRes.data?.batches ?? []);
      setStaffMembers(staffRes.data?.staff ?? []);
      setGearItems(gearRes.data?.gearItems ?? []);
    } catch (err: unknown) {
      console.error('Error fetching dashboard data:', err);
      if (isAxiosError<{ message?: string }>(err)) {
        setError(err.response?.data?.message || 'Failed to load organization dashboard data.');
      } else {
        setError('An unexpected error occurred while loading dashboard data.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  // Dynamic greeting based on current time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Trips mapped by ID for fast lookup
  const tripsMap = useMemo(() => {
    const map = new Map<string, OrgTrip>();
    for (const trip of trips) {
      map.set(trip._id, trip);
    }
    return map;
  }, [trips]);

  // Upcoming operations (filter out completed / cancelled, sort by start date ascending)
  const upcomingBatches = useMemo(() => {
    return batches
      .filter((batch) => batch.status !== 'Completed' && batch.status !== 'Cancelled')
      .sort((a, b) => {
        const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return timeA - timeB;
      });
  }, [batches]);

  // Operational Overview calculations from REAL data
  const operationalMetrics = useMemo(() => {
    const totalBatchesCount = batches.length;
    const activeBatchesCount = batches.filter(
      (b) => b.status === 'Open' || b.status === 'Active' || b.status === 'In-Progress'
    ).length;
    const completedBatchesCount = batches.filter((b) => b.status === 'Completed').length;
    const activeStaffCount = staffMembers.filter(
      (m) => (m.role || m.userId?.role) !== 'OrgAdmin'
    ).length;
    const totalGearItemsCount = gearItems.length;
    const totalGearUnits = gearItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

    return {
      totalBatchesCount,
      activeBatchesCount,
      completedBatchesCount,
      activeStaffCount,
      totalGearItemsCount,
      totalGearUnits,
      catalogTripsCount: trips.length
    };
  }, [batches, staffMembers, gearItems, trips]);

  // Needs Attention items derived ONLY from real data
  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      level: 'warning' | 'urgent';
      link: string;
      actionLabel: string;
    }> = [];

    const now = Date.now();
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60 * 1000;

    // 1. Batches starting within 7 days that are still Open
    for (const batch of batches) {
      if (batch.status === 'Open' && batch.startDate) {
        const startTime = new Date(batch.startDate).getTime();
        if (startTime >= now && startTime <= sevenDaysFromNow) {
          items.push({
            id: `batch-${batch._id}`,
            title: `Departure Soon: ${batch.batchName || 'Upcoming Batch'}`,
            description: `Scheduled to depart on ${new Date(batch.startDate).toLocaleDateString()}. Check staffing and roster status.`,
            level: 'warning',
            link: `/dashboard/org-admin/batches/${batch._id}`,
            actionLabel: 'View Batch'
          });
        }
      }
    }

    // 2. Gear items in Poor or Damaged condition
    for (const gear of gearItems) {
      const cond = gear.condition?.toLowerCase();
      if (cond && (cond.includes('poor') || cond.includes('damage') || cond.includes('repair'))) {
        items.push({
          id: `gear-${gear._id}`,
          title: `Gear Maintenance: ${gear.name}`,
          description: `Condition reported as "${gear.condition}". Requires inspection before next expedition.`,
          level: 'urgent',
          link: `/dashboard/org-admin/gear/${gear._id}`,
          actionLabel: 'Inspect Gear'
        });
      }
    }

    return items;
  }, [batches, gearItems]);

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return 'Dates to be announced';
    const s = startDate ? new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    const e = endDate ? new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
    if (s && e) return `${s} – ${e}`;
    return s || e || 'Dates to be announced';
  };

  const getTripImage = (trip?: OrgTrip) => {
    if (!trip) return null;
    if (trip.images && trip.images.length > 0 && trip.images[0].url) {
      return trip.images[0].url;
    }
    if (trip.imageUrl) {
      return trip.imageUrl;
    }
    return null;
  };

  return (
    <div className="org-admin-dashboard-root">
      {/* ==================================================
          A. Welcome / Organization Header
         ================================================== */}
      <header className="org-admin-hero">
        <div className="org-admin-hero-content">
          <div className="org-admin-hero-eyebrow">
            <span className="org-admin-hero-pulse" aria-hidden="true" />
            <span>Operations Command Center</span>
          </div>
          <h1 className="org-admin-hero-title">
            {greeting}, {user?.fullName ? user.fullName : 'Operations Leader'} 👋
          </h1>
          <p className="org-admin-hero-subtitle">
            Here's what's happening across your organization.
          </p>
        </div>

        <div className="org-admin-hero-actions">
          <button
            type="button"
            className="btn btn-secondary org-admin-refresh-button"
            onClick={() => void fetchDashboardData(true)}
            disabled={refreshing || loading}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              size={15}
              className={refreshing ? 'org-admin-spin' : ''}
              aria-hidden="true"
            />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </header>

      {error && (
        <div className="org-admin-alert-banner" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div className="org-admin-alert-text">
            <strong>Unable to refresh all metrics:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => void fetchDashboardData()}
          >
            Retry
          </button>
        </div>
      )}

      {/* ==================================================
          B. KPI Summary (4 Cards)
         ================================================== */}
      <section className="org-admin-section" aria-label="Organization Key Performance Indicators">
        <div className="org-admin-kpi-grid">
          {/* 1. Trips */}
          <article className="org-admin-kpi-card">
            <div className="org-admin-kpi-header">
              <span className="org-admin-kpi-icon kpi-icon-trips" aria-hidden="true">
                <Compass size={20} />
              </span>
              <span className="org-admin-kpi-badge">Catalog</span>
            </div>
            <span className="org-admin-kpi-label">Total Trips</span>
            <div className="org-admin-kpi-number-wrap">
              {loading ? (
                <div className="org-admin-kpi-skeleton" />
              ) : (
                <strong className="org-admin-kpi-value">{stats?.totalTrips ?? 0}</strong>
              )}
            </div>
            <p className="org-admin-kpi-context">Active &amp; published expedition itineraries</p>
          </article>

          {/* 2. Batches */}
          <article className="org-admin-kpi-card">
            <div className="org-admin-kpi-header">
              <span className="org-admin-kpi-icon kpi-icon-batches" aria-hidden="true">
                <CalendarDays size={20} />
              </span>
              <span className="org-admin-kpi-badge">Schedules</span>
            </div>
            <span className="org-admin-kpi-label">Total Batches</span>
            <div className="org-admin-kpi-number-wrap">
              {loading ? (
                <div className="org-admin-kpi-skeleton" />
              ) : (
                <strong className="org-admin-kpi-value">{stats?.totalBatches ?? 0}</strong>
              )}
            </div>
            <p className="org-admin-kpi-context">Scheduled departures across all treks</p>
          </article>

          {/* 3. Total Bookings */}
          <article className="org-admin-kpi-card">
            <div className="org-admin-kpi-header">
              <span className="org-admin-kpi-icon kpi-icon-bookings" aria-hidden="true">
                <Users size={20} />
              </span>
              <span className="org-admin-kpi-badge">Demand</span>
            </div>
            <span className="org-admin-kpi-label">Total Bookings</span>
            <div className="org-admin-kpi-number-wrap">
              {loading ? (
                <div className="org-admin-kpi-skeleton" />
              ) : (
                <strong className="org-admin-kpi-value">{stats?.totalBookings ?? 0}</strong>
              )}
            </div>
            <p className="org-admin-kpi-context">All-time participant registrations</p>
          </article>

          {/* 4. Confirmed Bookings */}
          <article className="org-admin-kpi-card">
            <div className="org-admin-kpi-header">
              <span className="org-admin-kpi-icon kpi-icon-confirmed" aria-hidden="true">
                <CheckCircle2 size={20} />
              </span>
              <span className="org-admin-kpi-badge kpi-badge-success">Secured</span>
            </div>
            <span className="org-admin-kpi-label">Confirmed Bookings</span>
            <div className="org-admin-kpi-number-wrap">
              {loading ? (
                <div className="org-admin-kpi-skeleton" />
              ) : (
                <strong className="org-admin-kpi-value">{stats?.confirmedBookings ?? 0}</strong>
              )}
            </div>
            <p className="org-admin-kpi-context">Completed &amp; verified reservations</p>
          </article>
        </div>
      </section>

      {/* ==================================================
          MAIN 2-COLUMN COMMAND GRID
          Left: Upcoming Operations
          Right: Quick Actions & Operational Overview
         ================================================== */}
      <div className="org-admin-main-grid">
        {/* Left Column: Upcoming Operations */}
        <div className="org-admin-column-primary">
          <section className="org-admin-section" aria-labelledby="upcoming-operations-heading">
            <div className="org-admin-section-header">
              <div>
                <span className="org-admin-section-eyebrow">Active Schedules</span>
                <h2 id="upcoming-operations-heading" className="org-admin-section-title">
                  Upcoming Operations
                </h2>
              </div>
              <Link className="org-admin-text-link" to="/dashboard/org-admin/batches">
                <span>All Batches</span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </div>

            {loading ? (
              <div className="org-admin-cards-loading">
                <div className="org-admin-card-skeleton" />
                <div className="org-admin-card-skeleton" />
              </div>
            ) : upcomingBatches.length === 0 ? (
              <div className="org-admin-empty-state-box">
                <div className="org-admin-empty-icon" aria-hidden="true">
                  <CalendarDays size={28} />
                </div>
                <h3>No upcoming operations</h3>
                <p>Create a batch to start scheduling your next trek.</p>
                <Link className="btn btn-primary" to="/dashboard/org-admin/batches">
                  Create Batch →
                </Link>
              </div>
            ) : (
              <div className="org-admin-operations-list">
                {upcomingBatches.map((batch) => {
                  const relatedTripId = typeof batch.tripId === 'object' && batch.tripId !== null
                    ? (batch.tripId as { _id: string })._id
                    : (batch.tripId as string);
                  const trip = relatedTripId ? tripsMap.get(relatedTripId) : undefined;
                  const tripImage = getTripImage(trip);
                  const statusNormalized = (batch.status || 'Scheduled').toLowerCase().replace(/\s+/g, '-');

                  return (
                    <article className="org-admin-operation-card" key={batch._id}>
                      <div className="org-admin-operation-media">
                        {tripImage ? (
                          <img
                            src={tripImage}
                            alt={trip?.name ? `${trip.name} trek` : 'Trek preview'}
                            className="org-admin-operation-thumb"
                            loading="lazy"
                          />
                        ) : (
                          <div className="org-admin-operation-thumb-fallback">
                            <Mountain size={24} aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      <div className="org-admin-operation-body">
                        <div className="org-admin-operation-top-line">
                          <span className={`org-admin-status-pill status-${statusNormalized}`}>
                            {batch.status || 'Scheduled'}
                          </span>
                          {trip?.difficultyLevel && (
                            <span className="org-admin-difficulty-tag">
                              {trip.difficultyLevel}
                            </span>
                          )}
                        </div>

                        <h3 className="org-admin-operation-name">
                          {batch.batchName || 'Upcoming Expedition Batch'}
                        </h3>

                        {trip?.name && (
                          <p className="org-admin-operation-trip-name">
                            <Mountain size={14} aria-hidden="true" />
                            <span>{trip.name}</span>
                          </p>
                        )}

                        <div className="org-admin-operation-meta">
                          <span className="org-admin-meta-item">
                            <CalendarDays size={14} aria-hidden="true" />
                            <span>{formatDateRange(batch.startDate, batch.endDate)}</span>
                          </span>

                          {trip?.location && (
                            <span className="org-admin-meta-item">
                              <MapPin size={14} aria-hidden="true" />
                              <span>{trip.location}</span>
                            </span>
                          )}

                          {batch.maxCapacity != null && (
                            <span className="org-admin-meta-item">
                              <Users size={14} aria-hidden="true" />
                              <span>{batch.maxCapacity} Max Capacity</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="org-admin-operation-action">
                        <Link
                          to={`/dashboard/org-admin/batches/${batch._id}`}
                          className="org-admin-view-btn"
                          aria-label={`View details for ${batch.batchName || 'batch'}`}
                        >
                          <span>View Details</span>
                          <ArrowRight size={16} aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* ==================================================
              G. Needs Attention (ONLY IF REAL DATA CONDITIONS EXIST)
             ================================================== */}
          <section className="org-admin-section" aria-labelledby="needs-attention-heading" style={{ marginTop: '2rem' }}>
            <div className="org-admin-section-header">
              <div>
                <span className="org-admin-section-eyebrow">Operational Readiness</span>
                <h2 id="needs-attention-heading" className="org-admin-section-title">
                  System Health &amp; Attention
                </h2>
              </div>
            </div>

            {attentionItems.length > 0 ? (
              <div className="org-admin-attention-list">
                {attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className={`org-admin-attention-card attention-${item.level}`}
                  >
                    <div className="org-admin-attention-icon-wrap" aria-hidden="true">
                      {item.level === 'urgent' ? (
                        <Wrench size={18} />
                      ) : (
                        <AlertTriangle size={18} />
                      )}
                    </div>
                    <div className="org-admin-attention-content">
                      <h4 className="org-admin-attention-title">{item.title}</h4>
                      <p className="org-admin-attention-desc">{item.description}</p>
                    </div>
                    <Link to={item.link} className="btn btn-sm btn-outline org-admin-attention-cta">
                      {item.actionLabel} →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="org-admin-health-good">
                <ShieldCheck size={20} className="org-admin-health-icon" aria-hidden="true" />
                <div>
                  <strong>All Systems Operational</strong>
                  <p>All scheduled departures and gear allocations are in good standing.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Quick Actions & Operational Overview */}
        <div className="org-admin-column-secondary">
          {/* ==================================================
              D. Quick Actions Panel
             ================================================== */}
          <section className="org-admin-card org-admin-quick-panel" aria-labelledby="quick-actions-heading">
            <div className="org-admin-panel-header">
              <span className="org-admin-section-eyebrow">Quick Navigation</span>
              <h2 id="quick-actions-heading" className="org-admin-panel-title">
                Quick Actions
              </h2>
            </div>

            <div className="org-admin-quick-grid">
              <Link to="/dashboard/org-admin/trips" className="org-admin-quick-btn quick-btn-primary">
                <span className="org-admin-quick-icon"><Plus size={16} /></span>
                <div className="org-admin-quick-text">
                  <strong>Create Trip</strong>
                  <span>Manage routes &amp; itineraries</span>
                </div>
              </Link>

              <Link to="/dashboard/org-admin/batches" className="org-admin-quick-btn">
                <span className="org-admin-quick-icon"><CalendarDays size={16} /></span>
                <div className="org-admin-quick-text">
                  <strong>Create Batch</strong>
                  <span>Schedule dates &amp; assign staff</span>
                </div>
              </Link>

              <Link to="/dashboard/org-admin/staff" className="org-admin-quick-btn">
                <span className="org-admin-quick-icon"><Users size={16} /></span>
                <div className="org-admin-quick-text">
                  <strong>Manage Staff</strong>
                  <span>Leaders, medics &amp; volunteers</span>
                </div>
              </Link>

              <Link to="/dashboard/org-admin/gear" className="org-admin-quick-btn">
                <span className="org-admin-quick-icon"><Package size={16} /></span>
                <div className="org-admin-quick-text">
                  <strong>Manage Gear</strong>
                  <span>Inventory &amp; equipment status</span>
                </div>
              </Link>

              <Link to="/dashboard/org-admin/organization" className="org-admin-quick-btn">
                <span className="org-admin-quick-icon"><Building2 size={16} /></span>
                <div className="org-admin-quick-text">
                  <strong>Organization</strong>
                  <span>Profile &amp; administrator details</span>
                </div>
              </Link>
            </div>
          </section>

          {/* ==================================================
              E. Operational Overview
             ================================================== */}
          <section className="org-admin-card org-admin-overview-panel" aria-labelledby="overview-heading">
            <div className="org-admin-panel-header">
              <span className="org-admin-section-eyebrow">Resource Pulse</span>
              <h2 id="overview-heading" className="org-admin-panel-title">
                Operational Overview
              </h2>
            </div>

            <div className="org-admin-overview-grid">
              <div className="org-admin-metric-pill">
                <span className="metric-pill-label">Active Batches</span>
                <strong className="metric-pill-value">{operationalMetrics.activeBatchesCount}</strong>
              </div>

              <div className="org-admin-metric-pill">
                <span className="metric-pill-label">Completed Batches</span>
                <strong className="metric-pill-value">{operationalMetrics.completedBatchesCount}</strong>
              </div>

              <div className="org-admin-metric-pill">
                <span className="metric-pill-label">Staff Team Size</span>
                <strong className="metric-pill-value">{operationalMetrics.activeStaffCount}</strong>
              </div>

              <div className="org-admin-metric-pill">
                <span className="metric-pill-label">Gear Item Types</span>
                <strong className="metric-pill-value">{operationalMetrics.totalGearItemsCount}</strong>
              </div>

              <div className="org-admin-metric-pill">
                <span className="metric-pill-label">Total Equipment Units</span>
                <strong className="metric-pill-value">{operationalMetrics.totalGearUnits}</strong>
              </div>

              <div className="org-admin-metric-pill">
                <span className="metric-pill-label">Trip Itineraries</span>
                <strong className="metric-pill-value">{operationalMetrics.catalogTripsCount}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ==================================================
          H. Analytics Preview / Link
         ================================================== */}
      <section className="org-admin-analytics-preview-banner" aria-labelledby="analytics-preview-heading">
        <div className="org-admin-analytics-preview-info">
          <div className="org-admin-analytics-icon-wrap" aria-hidden="true">
            <BarChart3 size={24} />
          </div>
          <div>
            <span className="org-admin-section-eyebrow">Enterprise Intelligence</span>
            <h2 id="analytics-preview-heading" className="org-admin-analytics-preview-title">
              Organization Insights &amp; Compliance
            </h2>
            <p className="org-admin-analytics-preview-text">
              View detailed booking reports, medical clearance compliance, and attendance tracking across all batches.
            </p>
          </div>
        </div>

        <div className="org-admin-analytics-preview-stats">
          <div className="org-admin-preview-stat-box">
            <span className="preview-stat-label">Confirmed Ratio</span>
            <strong className="preview-stat-value">
              {stats?.totalBookings && stats.totalBookings > 0
                ? `${Math.round(((stats.confirmedBookings || 0) / stats.totalBookings) * 100)}%`
                : '—'}
            </strong>
          </div>
          <div className="org-admin-preview-stat-box">
            <span className="preview-stat-label">Total Operations</span>
            <strong className="preview-stat-value">{stats?.totalBatches ?? 0}</strong>
          </div>
          <Link to="/dashboard/org-admin/analytics" className="btn btn-primary org-admin-analytics-cta">
            <span>View Full Analytics</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}