import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Info,
  LoaderCircle,
  Mountain,
  RefreshCw,
  Send,
  Sparkles,
  Ticket,
  Users,
  X
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getAllPublicTrips, getBatchesForTrip } from '../../services/tripService';
import {
  createBookingGroup,
  getMyOpenGroups,
  joinBookingGroup,
  submitBookingGroup
} from '../../services/bookingGroupService';
import { getMyBookings } from '../../services/bookingService';
import type { BatchSummary } from '../../types';
import './ParticipantGroupsPage.css';

type ParticipantTrip = {
  _id: string;
  name: string;
  location?: string;
};

type ParticipantOpenGroup = {
  _id: string;
  groupCode: string;
  status: string;
  initiatorId?: string;
  createdAt?: string;
  batchId?: {
    _id?: string;
    batchName?: string;
  } | null;
};

type JoinedGroupBooking = {
  _id: string;
  groupId: string;
  status: string;
  tripId?: { _id?: string; name?: string } | null;
  batchId?: {
    _id?: string;
    batchName?: string;
    startDate?: string;
    endDate?: string;
  } | null;
};

type PublicTripsResponse = {
  trips?: ParticipantTrip[];
};

type BatchesResponse = {
  batches?: BatchSummary[];
};

type FilterTab = 'all' | 'created' | 'joined' | 'open';

function getApiErrorMessage(error: unknown, fallback: string): string {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : fallback;
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ParticipantGroupsPage() {
  // Data states
  const [trips, setTrips] = useState<ParticipantTrip[]>([]);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [openGroups, setOpenGroups] = useState<ParticipantOpenGroup[]>([]);
  const [joinedBookings, setJoinedBookings] = useState<JoinedGroupBooking[]>([]);

  // Loading & error states
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [pageError, setPageError] = useState('');
  const [batchError, setBatchError] = useState('');

  // Modals & form states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [groupToSubmit, setGroupToSubmit] = useState<ParticipantOpenGroup | null>(null);

  const [selectedTripId, setSelectedTripId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Notifications & Busy actions
  const [busyAction, setBusyAction] = useState<string>('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertTone, setAlertTone] = useState<'success' | 'error' | 'info'>('info');
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [recentlyCreatedCode, setRecentlyCreatedCode] = useState<string>('');

  // Active filter tab
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  // Fetch all group-related data
  const fetchData = useCallback(async () => {
    setLoadingGroups(true);
    setPageError('');
    try {
      const [tripsRes, openGroupsRes, bookingsRes] = await Promise.all([
        getAllPublicTrips().catch((err) => {
          console.warn('Trips fetch failed:', err);
          return { data: { trips: [] } };
        }),
        getMyOpenGroups(),
        getMyBookings().catch((err) => {
          console.warn('Bookings fetch failed:', err);
          return { data: { bookings: [] } };
        })
      ]);

      const tripsData = tripsRes.data as PublicTripsResponse;
      setTrips(tripsData.trips || []);

      const groups = (openGroupsRes.data.groups || []) as ParticipantOpenGroup[];
      setOpenGroups(groups);

      const allBookings = (bookingsRes.data.bookings || []) as JoinedGroupBooking[];
      // Filter bookings that have a groupId
      const groupBookings = allBookings.filter((b) => Boolean(b.groupId));
      setJoinedBookings(groupBookings);
    } catch (err: unknown) {
      console.error('Error fetching group data:', err);
      setPageError(getApiErrorMessage(err, 'Unable to load your group bookings. Please check your connection.'));
    } finally {
      setLoadingGroups(false);
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Handle escape key for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!busyAction) {
          setIsCreateModalOpen(false);
          setIsJoinModalOpen(false);
          setGroupToSubmit(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [busyAction]);

  // Load batches when a trip is selected in create modal
  const handleTripChange = async (tripId: string) => {
    setSelectedTripId(tripId);
    setSelectedBatchId('');
    setBatches([]);
    setBatchError('');
    if (!tripId) return;

    setLoadingBatches(true);
    try {
      const response = await getBatchesForTrip(tripId);
      const data = response.data as BatchesResponse;
      setBatches(data.batches || []);
    } catch (err: unknown) {
      console.error(err);
      setBatchError(getApiErrorMessage(err, 'Unable to load departures for this trek.'));
    } finally {
      setLoadingBatches(false);
    }
  };

  // Copy code helper
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode((current) => (current === code ? '' : current));
      }, 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Create Group submission
  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBatchId) return;

    setBusyAction('create');
    setAlertMessage('');
    try {
      const response = await createBookingGroup(selectedBatchId);
      const createdCode = response.data.group.groupCode as string;
      setRecentlyCreatedCode(createdCode);
      setAlertMessage(`Group created successfully! Share invite code ${createdCode} with your trekking party.`);
      setAlertTone('success');
      setIsCreateModalOpen(false);
      setSelectedTripId('');
      setSelectedBatchId('');
      setBatches([]);
      await fetchData();
    } catch (err: unknown) {
      setAlertMessage(getApiErrorMessage(err, 'Unable to create the booking group.'));
      setAlertTone('error');
    } finally {
      setBusyAction('');
    }
  };

  // Join Group submission
  const handleJoinGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.trim().toUpperCase();
    if (!cleanCode) return;

    setBusyAction('join');
    setAlertMessage('');
    try {
      const response = await joinBookingGroup(cleanCode);
      const bookingStatus = response.data.booking?.status || 'Draft';
      setAlertMessage(`Joined group successfully! Your group reservation is saved as: ${bookingStatus}.`);
      setAlertTone('success');
      setIsJoinModalOpen(false);
      setJoinCodeInput('');
      await fetchData();
    } catch (err: unknown) {
      setAlertMessage(getApiErrorMessage(err, 'Unable to join the group. Check the invite code and try again.'));
      setAlertTone('error');
    } finally {
      setBusyAction('');
    }
  };

  // Submit Group (Atomic admission)
  const handleConfirmSubmitGroup = async () => {
    if (!groupToSubmit) return;

    setBusyAction('submit');
    setAlertMessage('');
    try {
      const response = await submitBookingGroup(groupToSubmit._id);
      const groupSize = response.data.groupSize || 1;
      const resultMessage = response.data.message || 'Group submitted successfully.';
      setAlertMessage(`${resultMessage} (${groupSize} participant${groupSize > 1 ? 's' : ''} processed together).`);
      setAlertTone('success');
      setGroupToSubmit(null);
      await fetchData();
    } catch (err: unknown) {
      setAlertMessage(getApiErrorMessage(err, 'Unable to submit group booking.'));
      setAlertTone('error');
    } finally {
      setBusyAction('');
    }
  };

  // Compute joined groups where user is a member (not initiator of an open group)
  const memberGroupBookings = useMemo(() => {
    const openGroupIds = new Set(openGroups.map((g) => g._id));
    return joinedBookings.filter((b) => !openGroupIds.has(b.groupId));
  }, [joinedBookings, openGroups]);

  // Overview metrics (strictly calculated from loaded real data)
  const metrics = useMemo(() => {
    const createdCount = openGroups.length;
    const joinedCount = memberGroupBookings.length;
    const totalGroups = createdCount + joinedCount;
    const readyToSubmitCount = openGroups.filter((g) => g.status === 'Open').length;
    return {
      total: totalGroups,
      created: createdCount,
      joined: joinedCount,
      readyToSubmit: readyToSubmitCount
    };
  }, [openGroups, memberGroupBookings]);

  // Filter tabs counts
  const tabCounts = useMemo(() => {
    return {
      all: openGroups.length + memberGroupBookings.length,
      created: openGroups.length,
      joined: memberGroupBookings.length,
      open: openGroups.filter((g) => g.status === 'Open').length
    };
  }, [openGroups, memberGroupBookings]);

  return (
    <div className="participant-groups-page">
      <Navbar />

      <main className="participant-groups-main">
        <div className="participant-groups-container">
          {/* 1. Page Header */}
          <header className="participant-groups-header">
            <div className="participant-groups-header-content">
              <p className="participant-groups-eyebrow">GROUP BOOKINGS</p>
              <h1 className="participant-groups-title">Group Bookings</h1>
              <p className="participant-groups-subtitle">
                Plan your trek together and manage your group reservation.
              </p>
            </div>
            <div className="participant-groups-header-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setJoinCodeInput('');
                  setIsJoinModalOpen(true);
                }}
              >
                <Ticket size={16} aria-hidden="true" />
                <span>Join with Code</span>
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSelectedTripId('');
                  setSelectedBatchId('');
                  setBatches([]);
                  setIsCreateModalOpen(true);
                }}
              >
                <Users size={16} aria-hidden="true" />
                <span>Create Group</span>
              </button>
            </div>
          </header>

          {/* Alert Message Banner */}
          {alertMessage && (
            <div
              className={`participant-groups-alert participant-groups-alert--${alertTone}`}
              role={alertTone === 'error' ? 'alert' : 'status'}
            >
              {alertTone === 'error' ? (
                <AlertCircle size={18} aria-hidden="true" />
              ) : alertTone === 'success' ? (
                <CheckCircle2 size={18} aria-hidden="true" />
              ) : (
                <Info size={18} aria-hidden="true" />
              )}
              <span className="participant-groups-alert-text">{alertMessage}</span>
              <button
                type="button"
                className="participant-groups-alert-close"
                aria-label="Dismiss notification"
                onClick={() => setAlertMessage('')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Recently Created Share Code Callout */}
          {recentlyCreatedCode && (
            <div className="participant-groups-share-callout">
              <div className="participant-groups-share-icon">
                <Sparkles size={22} aria-hidden="true" />
              </div>
              <div className="participant-groups-share-info">
                <h4>Your Group Invite Code is Ready!</h4>
                <p>Share this code with fellow participants joining your trek. Once everyone joins, submit the group together.</p>
                <div className="participant-groups-share-bar">
                  <span className="participant-groups-code-display">{recentlyCreatedCode}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary participant-groups-copy-btn"
                    onClick={() => void handleCopyCode(recentlyCreatedCode)}
                  >
                    {copiedCode === recentlyCreatedCode ? (
                      <>
                        <Check size={14} aria-hidden="true" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} aria-hidden="true" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="participant-groups-share-dismiss"
                aria-label="Dismiss share prompt"
                onClick={() => setRecentlyCreatedCode('')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* 2. Group Booking Overview KPIs */}
          <section className="participant-groups-kpi-grid" aria-label="Group bookings overview">
            <article className="participant-groups-kpi-card">
              <div className="participant-groups-kpi-icon-wrap participant-groups-kpi-icon-wrap--primary">
                <Users size={20} aria-hidden="true" />
              </div>
              <div className="participant-groups-kpi-data">
                <span className="participant-groups-kpi-label">My Groups</span>
                <span className="participant-groups-kpi-value">{metrics.total}</span>
              </div>
            </article>

            <article className="participant-groups-kpi-card">
              <div className="participant-groups-kpi-icon-wrap participant-groups-kpi-icon-wrap--accent">
                <Sparkles size={20} aria-hidden="true" />
              </div>
              <div className="participant-groups-kpi-data">
                <span className="participant-groups-kpi-label">Created by Me</span>
                <span className="participant-groups-kpi-value">{metrics.created}</span>
              </div>
            </article>

            <article className="participant-groups-kpi-card">
              <div className="participant-groups-kpi-icon-wrap participant-groups-kpi-icon-wrap--neutral">
                <Ticket size={20} aria-hidden="true" />
              </div>
              <div className="participant-groups-kpi-data">
                <span className="participant-groups-kpi-label">Joined as Member</span>
                <span className="participant-groups-kpi-value">{metrics.joined}</span>
              </div>
            </article>

            <article className="participant-groups-kpi-card">
              <div className="participant-groups-kpi-icon-wrap participant-groups-kpi-icon-wrap--warning">
                <Send size={20} aria-hidden="true" />
              </div>
              <div className="participant-groups-kpi-data">
                <span className="participant-groups-kpi-label">Ready to Submit</span>
                <span className="participant-groups-kpi-value">{metrics.readyToSubmit}</span>
              </div>
            </article>
          </section>

          {/* 3. Group Booking Workflow Stepper Banner */}
          <section className="participant-groups-workflow-card" aria-label="Group booking process workflow">
            <div className="participant-groups-workflow-header">
              <div className="participant-groups-workflow-title">
                <Info size={16} aria-hidden="true" />
                <span>How Group Bookings Work in TrailOps</span>
              </div>
              <span className="participant-groups-workflow-rule">Atomic All-or-Nothing Admission</span>
            </div>

            <div className="participant-groups-steps-grid">
              <div className="participant-groups-step">
                <div className="participant-groups-step-num">1</div>
                <div className="participant-groups-step-body">
                  <strong>Create Group</strong>
                  <span>Pick destination & departure batch to initiate party.</span>
                </div>
              </div>

              <div className="participant-groups-step">
                <div className="participant-groups-step-num">2</div>
                <div className="participant-groups-step-body">
                  <strong>Share Code</strong>
                  <span>Invite trek companions with your unique 8-character code.</span>
                </div>
              </div>

              <div className="participant-groups-step">
                <div className="participant-groups-step-num">3</div>
                <div className="participant-groups-step-body">
                  <strong>Members Join</strong>
                  <span>Participants enter code to link their draft reservation.</span>
                </div>
              </div>

              <div className="participant-groups-step">
                <div className="participant-groups-step-num">4</div>
                <div className="participant-groups-step-body">
                  <strong>Initiator Submits</strong>
                  <span>Group evaluates batch capacity atomically. Admitted or waitlisted together.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Main Content Area */}
          {loadingInitial ? (
            /* Loading Skeletons */
            <div className="participant-groups-skeletons" aria-busy="true" aria-label="Loading groups">
              {[1, 2].map((n) => (
                <div key={n} className="participant-group-skeleton-card">
                  <div className="participant-skeleton-bar participant-skeleton-bar--sm" />
                  <div className="participant-skeleton-bar participant-skeleton-bar--lg" />
                  <div className="participant-skeleton-bar participant-skeleton-bar--md" />
                </div>
              ))}
            </div>
          ) : pageError ? (
            /* Error State with Retry */
            <div className="participant-groups-error-card" role="alert">
              <AlertCircle size={28} className="participant-groups-error-icon" aria-hidden="true" />
              <div className="participant-groups-error-content">
                <h3>Failed to load group reservations</h3>
                <p>{pageError}</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void fetchData()}
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Try Again</span>
              </button>
            </div>
          ) : metrics.total === 0 ? (
            /* 14. Empty State */
            <div className="participant-groups-empty-hero">
              <div className="participant-groups-empty-icon-wrap">
                <Users size={36} aria-hidden="true" />
              </div>
              <h2>No group bookings yet</h2>
              <p>
                Create a group for your next expedition or enter a shared invite code from an organizer to trek together.
              </p>
              <div className="participant-groups-empty-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Users size={16} aria-hidden="true" />
                  <span>Create Group</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsJoinModalOpen(true)}
                >
                  <Ticket size={16} aria-hidden="true" />
                  <span>Join with Code</span>
                </button>
              </div>
            </div>
          ) : (
            /* Groups List & Filter Area */
            <section className="participant-groups-list-section" aria-label="Group bookings list">
              {/* Filter Tabs & Refresh */}
              <div className="participant-groups-filters-bar">
                <div className="participant-groups-filter-tabs" role="tablist" aria-label="Filter groups">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'all'}
                    className={`participant-filter-tab ${activeFilter === 'all' ? 'participant-filter-tab--active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    <span>All Groups</span>
                    <span className="participant-filter-count">{tabCounts.all}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'created'}
                    className={`participant-filter-tab ${activeFilter === 'created' ? 'participant-filter-tab--active' : ''}`}
                    onClick={() => setActiveFilter('created')}
                  >
                    <span>Created by Me</span>
                    <span className="participant-filter-count">{tabCounts.created}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'joined'}
                    className={`participant-filter-tab ${activeFilter === 'joined' ? 'participant-filter-tab--active' : ''}`}
                    onClick={() => setActiveFilter('joined')}
                  >
                    <span>Joined as Member</span>
                    <span className="participant-filter-count">{tabCounts.joined}</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === 'open'}
                    className={`participant-filter-tab ${activeFilter === 'open' ? 'participant-filter-tab--active' : ''}`}
                    onClick={() => setActiveFilter('open')}
                  >
                    <span>Open for Submission</span>
                    <span className="participant-filter-count">{tabCounts.open}</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-secondary participant-groups-refresh-btn"
                  onClick={() => void fetchData()}
                  disabled={loadingGroups}
                  aria-label="Refresh group bookings"
                >
                  {loadingGroups ? (
                    <LoaderCircle size={14} className="participant-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw size={14} aria-hidden="true" />
                  )}
                  <span>Refresh</span>
                </button>
              </div>

              {/* Group Cards Stack */}
              <div className="participant-groups-stack">
                {/* 1. Initiator's Open Groups */}
                {(activeFilter === 'all' || activeFilter === 'created' || activeFilter === 'open') &&
                  openGroups.map((group) => {
                    // Match related booking if available
                    const relatedBooking = joinedBookings.find((b) => b.groupId === group._id);
                    const trekName = relatedBooking?.tripId?.name || 'Trek Expedition';
                    const batchName = group.batchId?.batchName || relatedBooking?.batchId?.batchName || 'Departure Batch';
                    const isBusyThis = busyAction === group._id;

                    return (
                      <article key={group._id} className="participant-group-workflow-card">
                        <div className="participant-group-card-header">
                          <div className="participant-group-role-badge participant-group-role-badge--initiator">
                            <Sparkles size={13} aria-hidden="true" />
                            <span>Group Initiator</span>
                          </div>
                          <div className="participant-group-status-badge participant-group-status-badge--open">
                            <Clock size={13} aria-hidden="true" />
                            <span>Status: {group.status} (Collecting Members)</span>
                          </div>
                        </div>

                        <div className="participant-group-card-body">
                          <div className="participant-group-info-col">
                            <div className="participant-group-trek-title-wrap">
                              <Mountain size={18} className="participant-group-trek-icon" aria-hidden="true" />
                              <h3 className="participant-group-trek-title">{trekName}</h3>
                            </div>
                            <p className="participant-group-batch-title">{batchName}</p>

                            {/* Share Code Box */}
                            <div className="participant-group-code-card">
                              <div className="participant-group-code-meta">
                                <span className="participant-group-code-label">INVITE CODE</span>
                                <span className="participant-group-code-value">{group.groupCode}</span>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-secondary participant-group-card-copy-btn"
                                onClick={() => void handleCopyCode(group.groupCode)}
                              >
                                {copiedCode === group.groupCode ? (
                                  <>
                                    <Check size={14} aria-hidden="true" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={14} aria-hidden="true" />
                                    <span>Copy Code</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <span className="participant-group-code-hint">
                              Share this invite code with companions joining your trek reservation.
                            </span>
                          </div>

                          {/* Next Action Box */}
                          <div className="participant-group-action-col">
                            <div className="participant-group-action-box">
                              <div className="participant-group-action-prompt">
                                <strong>Ready to finalize your party?</strong>
                                <p>
                                  Submit once all companions have entered the code. TrailOps will atomically verify remaining seats for everyone.
                                </p>
                              </div>
                              <button
                                type="button"
                                className="btn btn-primary participant-group-submit-btn"
                                disabled={busyAction !== ''}
                                onClick={() => setGroupToSubmit(group)}
                              >
                                <Send size={15} aria-hidden="true" />
                                <span>{isBusyThis ? 'Submitting…' : 'Submit Group Booking'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                {/* 2. Joined Member Groups (User is Member, Not Initiator) */}
                {(activeFilter === 'all' || activeFilter === 'joined') &&
                  memberGroupBookings.map((booking) => {
                    const isDraft = booking.status === 'Draft';
                    const trekName = booking.tripId?.name || 'Trek Expedition';
                    const batchName = booking.batchId?.batchName || 'Departure Batch';

                    return (
                      <article key={booking._id} className="participant-group-workflow-card participant-group-workflow-card--member">
                        <div className="participant-group-card-header">
                          <div className="participant-group-role-badge participant-group-role-badge--member">
                            <Users size={13} aria-hidden="true" />
                            <span>Group Member</span>
                          </div>
                          <div
                            className={`participant-group-status-badge ${
                              isDraft
                                ? 'participant-group-status-badge--pending'
                                : booking.status === 'Confirmed'
                                  ? 'participant-group-status-badge--success'
                                  : booking.status === 'Waitlisted'
                                    ? 'participant-group-status-badge--neutral'
                                    : 'participant-group-status-badge--info'
                            }`}
                          >
                            {isDraft ? (
                              <>
                                <Clock size={13} aria-hidden="true" />
                                <span>Draft (Awaiting Initiator Submission)</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={13} aria-hidden="true" />
                                <span>Group Status: {booking.status}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="participant-group-card-body">
                          <div className="participant-group-info-col">
                            <div className="participant-group-trek-title-wrap">
                              <Mountain size={18} className="participant-group-trek-icon" aria-hidden="true" />
                              <h3 className="participant-group-trek-title">{trekName}</h3>
                            </div>
                            <p className="participant-group-batch-title">{batchName}</p>

                            {(booking.batchId?.startDate || booking.batchId?.endDate) && (
                              <div className="participant-group-dates-line">
                                <CalendarDays size={14} aria-hidden="true" />
                                <span>
                                  {formatDate(booking.batchId.startDate) || 'Dates TBA'}
                                  {booking.batchId.endDate ? ` — ${formatDate(booking.batchId.endDate)}` : ''}
                                </span>
                              </div>
                            )}

                            <div className="participant-group-member-notice">
                              <Info size={14} aria-hidden="true" />
                              <span>
                                {isDraft
                                  ? 'You are joined as a participant. Your group organizer will submit all reservations atomically.'
                                  : 'Your reservation was processed as part of your group booking.'}
                              </span>
                            </div>
                          </div>

                          <div className="participant-group-action-col">
                            <div className="participant-group-action-box participant-group-action-box--member">
                              <span className="participant-group-member-status-label">Personal Reservation</span>
                              <strong>Status: {booking.status}</strong>
                              <Link to="/dashboard/participant/bookings" className="btn btn-secondary btn-sm">
                                View in My Bookings &rarr;
                              </Link>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                {/* Filter Empty Result */}
                {((activeFilter === 'created' && openGroups.length === 0) ||
                  (activeFilter === 'joined' && memberGroupBookings.length === 0) ||
                  (activeFilter === 'open' && openGroups.filter((g) => g.status === 'Open').length === 0)) && (
                  <div className="participant-groups-filter-empty">
                    <AlertCircle size={24} aria-hidden="true" />
                    <h4>No groups in this filter</h4>
                    <p>None of your group bookings match the selected view.</p>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveFilter('all')}
                    >
                      Show All Groups
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* 4. Create Group Modal */}
      {isCreateModalOpen && (
        <div
          className="participant-groups-backdrop"
          role="presentation"
          onClick={() => {
            if (!busyAction) setIsCreateModalOpen(false);
          }}
        >
          <section
            className="participant-groups-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-group-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="participant-groups-modal-close"
              aria-label="Close dialog"
              disabled={busyAction !== ''}
              onClick={() => setIsCreateModalOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="participant-groups-modal-header">
              <div className="participant-groups-modal-icon">
                <Users size={22} aria-hidden="true" />
              </div>
              <h2 id="create-group-modal-title">Create a Group Booking</h2>
              <p>You will become the group initiator. A unique shareable invite code will be created for your group.</p>
            </div>

            <form onSubmit={(e) => void handleCreateGroup(e)} className="participant-groups-form">
              <div className="form-group">
                <label htmlFor="modal-group-trip">Trek Destination</label>
                <select
                  id="modal-group-trip"
                  value={selectedTripId}
                  onChange={(e) => void handleTripChange(e.target.value)}
                  required
                  disabled={busyAction !== '' || trips.length === 0}
                >
                  <option value="">Select a Trek</option>
                  {trips.map((trip) => (
                    <option key={trip._id} value={trip._id}>
                      {trip.name}{trip.location ? ` (${trip.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modal-group-batch">Departure Batch</label>
                <select
                  id="modal-group-batch"
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  required
                  disabled={!selectedTripId || loadingBatches || batches.length === 0 || busyAction !== ''}
                >
                  <option value="">
                    {!selectedTripId
                      ? 'Select a trek first'
                      : loadingBatches
                        ? 'Loading departures…'
                        : batchError
                          ? 'Departures unavailable'
                          : batches.length === 0
                            ? 'No departures scheduled'
                            : 'Select a Departure Batch'}
                  </option>
                  {batches.map((batch) => (
                    <option key={batch._id} value={batch._id}>
                      {batch.batchName}
                      {batch.startDate ? ` (${formatDate(batch.startDate)})` : ''}
                    </option>
                  ))}
                </select>
                {batchError && <p className="participant-groups-field-error">{batchError}</p>}
              </div>

              <div className="participant-groups-modal-info-box">
                <Sparkles size={16} aria-hidden="true" />
                <span>
                  After creating the group, you will receive an invite code to share with your friends. Your spot is held in draft until you submit the group.
                </span>
              </div>

              <div className="participant-groups-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busyAction !== ''}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!selectedBatchId || busyAction !== ''}
                >
                  {busyAction === 'create' ? 'Creating Group…' : 'Create Group'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 6. Join Group Modal */}
      {isJoinModalOpen && (
        <div
          className="participant-groups-backdrop"
          role="presentation"
          onClick={() => {
            if (!busyAction) setIsJoinModalOpen(false);
          }}
        >
          <section
            className="participant-groups-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-group-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="participant-groups-modal-close"
              aria-label="Close dialog"
              disabled={busyAction !== ''}
              onClick={() => setIsJoinModalOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="participant-groups-modal-header">
              <div className="participant-groups-modal-icon participant-groups-modal-icon--join">
                <Ticket size={22} aria-hidden="true" />
              </div>
              <h2 id="join-group-modal-title">Join a Group Booking</h2>
              <p>Enter the 8-character invite code provided by your group organizer to join their party.</p>
            </div>

            <form onSubmit={(e) => void handleJoinGroup(e)} className="participant-groups-form">
              <div className="form-group">
                <label htmlFor="modal-join-code">Group Invite Code</label>
                <input
                  id="modal-join-code"
                  type="text"
                  className="participant-groups-code-input"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 8A4C2E9F"
                  maxLength={12}
                  required
                  autoFocus
                  disabled={busyAction !== ''}
                />
              </div>

              <div className="participant-groups-modal-info-box">
                <Info size={16} aria-hidden="true" />
                <span>
                  Joining adds your reservation to the group roster. The group organizer will submit the party together when everyone is ready.
                </span>
              </div>

              <div className="participant-groups-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busyAction !== ''}
                  onClick={() => setIsJoinModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!joinCodeInput.trim() || busyAction !== ''}
                >
                  {busyAction === 'join' ? 'Joining Group…' : 'Join Group'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* 10. Submit Group Confirmation Modal (Atomic Admission) */}
      {groupToSubmit && (
        <div
          className="participant-groups-backdrop"
          role="presentation"
          onClick={() => {
            if (!busyAction) setGroupToSubmit(null);
          }}
        >
          <section
            className="participant-groups-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-group-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="participant-groups-modal-close"
              aria-label="Close dialog"
              disabled={busyAction !== ''}
              onClick={() => setGroupToSubmit(null)}
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="participant-groups-modal-header">
              <div className="participant-groups-modal-icon participant-groups-modal-icon--warning">
                <Send size={22} aria-hidden="true" />
              </div>
              <h2 id="submit-group-modal-title">Submit Group Booking?</h2>
              <p>
                Departure: <strong>{groupToSubmit.batchId?.batchName || 'Selected Batch'}</strong>
              </p>
            </div>

            <div className="participant-groups-submit-notice">
              <div className="participant-groups-submit-notice-heading">
                <AlertCircle size={18} aria-hidden="true" />
                <strong>Atomic Admission Policy</strong>
              </div>
              <p>
                TrailOps evaluates remaining batch capacity for your entire party. If sufficient capacity exists, all members enter the review pipeline together. If not, the entire group is waitlisted together.
              </p>
              <p className="participant-groups-submit-notice-sub">
                Please confirm that all your friends have entered invite code <strong>{groupToSubmit.groupCode}</strong> before submitting. New members cannot be added after submission.
              </p>
            </div>

            <div className="participant-groups-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busyAction !== ''}
                onClick={() => setGroupToSubmit(null)}
              >
                Keep Open
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busyAction !== ''}
                onClick={() => void handleConfirmSubmitGroup()}
              >
                {busyAction === 'submit' ? 'Submitting Group…' : 'Submit Group Booking'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
