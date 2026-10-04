import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  Users,
  UserRound,
  AlertTriangle,
  PackageCheck,
  Mountain,
  MapPin,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Stethoscope,
  Award,
  ClipboardCheck,
  Plus,
  Trash2
} from 'lucide-react';
import { getAssignmentsForBatch, createBatchAssignment, removeBatchAssignment } from '../../services/batchAssignmentService';
import { getBatchById, completeBatch } from '../../services/batchService';
import { getParticipantsByBatch } from '../../services/bookingService';
import { getMyOrgAllocations } from '../../services/gearService';
import { getIncidentsForBatch, getSOSAlertsForBatch } from '../../services/sosService';
import { getTripById } from '../../services/tripService';
import { getMyOrgStaff } from '../../services/staffService';
import { useAuth } from '../../context/AuthContext';
import type { BatchSummary, OrganizationStaffSummary } from '../../types';
import './BatchDetailsPage.css';

type BatchDetails = BatchSummary & {
  tripId?: string | { _id: string; name?: string; location?: string };
  maxCapacity?: number;
};

type TripDetails = {
  _id: string;
  name: string;
  location?: string;
  images?: Array<string | { url: string; publicId?: string }>;
  imageUrl?: string | null;
  difficultyLevel?: string;
  durationDays?: number;
};

type BatchAssignment = {
  _id: string;
  roleInBatch: string;
  userId: { _id: string; fullName: string; email?: string } | null;
  supervisingTrekLeaderId?: string | { _id: string; fullName?: string };
};

type ParticipantBooking = {
  _id: string;
  status?: string;
  participantId?: {
    _id: string;
    fullName?: string;
    email?: string;
    mobileNumber?: string;
  } | null;
};

type GearAllocation = {
  _id: string;
  batchId: string | { _id: string };
  gearItemId?: { name?: string } | null;
  participantId?: { fullName?: string } | null;
  expectedReturnDate?: string;
};

type BatchIncident = {
  _id: string;
  description?: string;
  actionTaken?: string;
  volunteerNotes?: string;
};

type SOSAlert = {
  _id: string;
  emergencyType?: string;
  status?: string;
  createdAt?: string;
};

type BatchData<T> = {
  items: T[];
  error: string;
};

const emptyData = <T,>(): BatchData<T> => ({ items: [], error: '' });

function referenceId(reference: string | { _id: string } | undefined | null) {
  return typeof reference === 'object' && reference !== null ? reference._id : reference;
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatDateRange(startDate?: string, endDate?: string): string {
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

function calculateDuration(startDate?: string, endDate?: string): string | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return '1 Day';
  return `${diffDays} Days`;
}

function responseError(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : fallback;
}

function getPrimaryTripImage(trip?: TripDetails | null): string | null {
  if (!trip) return null;
  if (trip.images && trip.images.length > 0) {
    const first = trip.images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'url' in first) return first.url;
  }
  return trip.imageUrl || null;
}

export default function BatchDetailsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const { user } = useAuth();

  const [batch, setBatch] = useState<BatchDetails | null>(null);
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [assignments, setAssignments] = useState<BatchData<BatchAssignment>>(emptyData);
  const [participants, setParticipants] = useState<BatchData<ParticipantBooking>>(emptyData);
  const [gear, setGear] = useState<BatchData<GearAllocation>>(emptyData);
  const [incidents, setIncidents] = useState<BatchData<BatchIncident>>(emptyData);
  const [alerts, setAlerts] = useState<BatchData<SOSAlert>>(emptyData);

  // Field team assignment modal/drawer form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [staffMembers, setStaffMembers] = useState<OrganizationStaffSummary[]>([]);
  const [assignForm, setAssignForm] = useState({
    userId: '',
    roleInBatch: 'TrekLeader',
    supervisingTrekLeaderId: ''
  });
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignMessage, setAssignMessage] = useState('');

  useEffect(() => {
    let active = true;
    const loadBatch = async () => {
      if (!batchId || !user?.organizationId) {
        setError('Batch or organization information is unavailable.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const batchResponse = await getBatchById(batchId);
        if (!active) return;

        const selectedBatch: BatchDetails = batchResponse.data.batch;
        if (!selectedBatch) {
          setBatch(null);
          setError('Batch not found in your organization.');
          return;
        }
        setBatch(selectedBatch);

        const selectedTripId = referenceId(selectedBatch.tripId);
        if (selectedTripId) {
          try {
            const tripResponse = await getTripById(selectedTripId);
            if (active) {
              setTrip(tripResponse.data.trip || null);
            }
          } catch {
            if (active) setTrip(null);
          }
        }
      } catch (err) {
        console.error(err);
        if (active) setError(responseError(err, 'Unable to load batch details.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadBatch();
    return () => { active = false; };
  }, [batchId, user?.organizationId]);

  const loadAssignments = async () => {
    if (!batchId) return;
    try {
      const response = await getAssignmentsForBatch(batchId);
      setAssignments({ items: response.data.assignments || [], error: '' });
    } catch (err) {
      console.error(err);
      setAssignments({ items: [], error: responseError(err, 'Unable to load assigned staff.') });
    }
  };

  useEffect(() => {
    if (!batchId || !batch) return;
    let active = true;

    const loadSection = async <T,>(
      request: Promise<{ data: { [key: string]: T[] } }>,
      responseKey: string,
      setData: (data: BatchData<T>) => void,
      fallback: string
    ) => {
      try {
        const response = await request;
        if (active) {
          setData({
            items: (response.data[responseKey] as T[] | undefined) || [],
            error: ''
          });
        }
      } catch (err) {
        console.error(err);
        if (active) setData({ items: [], error: responseError(err, fallback) });
      }
    };

    void Promise.all([
      loadSection(getAssignmentsForBatch(batchId), 'assignments', setAssignments, 'Unable to load assigned staff.'),
      loadSection(getParticipantsByBatch(batchId), 'bookings', setParticipants, 'Unable to load participants.'),
      loadSection(getMyOrgAllocations(), 'allocations', setGear, 'Unable to load allocated gear.'),
      loadSection(getIncidentsForBatch(batchId), 'incidents', setIncidents, 'Unable to load incidents.'),
      loadSection(getSOSAlertsForBatch(batchId), 'alerts', setAlerts, 'Unable to load SOS alerts.')
    ]);

    return () => { active = false; };
  }, [batchId, batch]);

  // Load org staff members when assign form is opened
  useEffect(() => {
    if (showAssignForm && staffMembers.length === 0) {
      getMyOrgStaff()
        .then((res) => setStaffMembers(res.data.staff || []))
        .catch((err) => console.error('Failed to load staff list', err));
    }
  }, [showAssignForm, staffMembers.length]);

  const supervisorNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const assignment of assignments.items) {
      if (assignment.roleInBatch === 'TrekLeader' && assignment.userId) {
        names.set(assignment.userId._id, assignment.userId.fullName);
      }
    }
    return names;
  }, [assignments.items]);

  const batchGear = useMemo(
    () => gear.items.filter((allocation) => referenceId(allocation.batchId) === batchId),
    [batchId, gear.items]
  );

  const trekLeaders = useMemo(
    () => assignments.items.filter((a) => a.roleInBatch === 'TrekLeader'),
    [assignments.items]
  );

  const medicalOfficers = useMemo(
    () => assignments.items.filter((a) => a.roleInBatch === 'MedicalOfficer'),
    [assignments.items]
  );

  const volunteers = useMemo(
    () => assignments.items.filter((a) => a.roleInBatch === 'Volunteer'),
    [assignments.items]
  );

  const confirmedBookingsCount = useMemo(() => {
    return participants.items.filter((b) => b.status === 'Confirmed').length;
  }, [participants.items]);

  const occupancyPercent = useMemo(() => {
    if (!batch?.maxCapacity || batch.maxCapacity <= 0) return 0;
    return Math.min(100, Math.round((participants.items.length / batch.maxCapacity) * 100));
  }, [batch?.maxCapacity, participants.items.length]);

  const handleCompleteBatch = async () => {
    if (!batch || !batchId) return;
    if (!window.confirm('Are you sure you want to mark this batch as completed?')) return;
    setActionMessage('');
    try {
      await completeBatch(batchId);
      setBatch((prev) => (prev ? { ...prev, status: 'Completed' } : prev));
      setActionMessage('Batch marked as completed successfully');
    } catch (err: any) {
      setActionMessage(err.response?.data?.message || 'Failed to complete batch');
    }
  };

  const handleRoleChange = (newRole: string) => {
    const currentMember = staffMembers.find((m) => m.userId?._id === assignForm.userId);
    const currentRole = currentMember?.role || currentMember?.userId?.role;
    const isStillValid = currentRole === newRole;

    setAssignForm((prev) => ({
      ...prev,
      roleInBatch: newRole,
      userId: isStillValid ? prev.userId : '',
      supervisingTrekLeaderId: newRole === 'Volunteer' ? prev.supervisingTrekLeaderId : ''
    }));
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId || assignSubmitting) return;

    setAssignSubmitting(true);
    setAssignMessage('');
    try {
      const payload = {
        batchId,
        userId: assignForm.userId,
        roleInBatch: assignForm.roleInBatch,
        supervisingTrekLeaderId: assignForm.roleInBatch === 'Volunteer' ? assignForm.supervisingTrekLeaderId || undefined : undefined
      };
      await createBatchAssignment(payload);
      setAssignMessage('Staff assigned successfully');
      setAssignForm({ userId: '', roleInBatch: 'TrekLeader', supervisingTrekLeaderId: '' });
      await loadAssignments();
      setShowAssignForm(false);
    } catch (err: any) {
      setAssignMessage(err.response?.data?.message || 'Failed to assign staff member');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string, staffName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${staffName} from this batch?`)) return;
    try {
      await removeBatchAssignment(assignmentId);
      await loadAssignments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove staff assignment');
    }
  };

  if (loading) {
    return (
      <div className="org-admin-batch-details-loading">
        <p>Loading batch operations dashboard…</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <section className="batch-details-page">
        <Link className="org-admin-batch-details-back" to="/dashboard/org-admin/batches">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Back to Batches</span>
        </Link>
        <p className="org-admin-batch-details-error" role="alert">{error || 'Batch not found.'}</p>
      </section>
    );
  }

  const tripId = referenceId(batch.tripId);
  const tripName = trip?.name || (typeof batch.tripId === 'object' && batch.tripId?.name ? batch.tripId.name : null);
  const tripLocation = trip?.location || (typeof batch.tripId === 'object' && batch.tripId?.location ? batch.tripId.location : null);
  const tripImage = getPrimaryTripImage(trip);

  const dateRange = formatDateRange(batch.startDate, batch.endDate);
  const duration = calculateDuration(batch.startDate, batch.endDate);
  const statusRaw = batch.status || 'Open';
  const statusClass = statusRaw.toLowerCase().trim().replace(/\s+/g, '-');
  const canComplete = batch.status !== 'Completed' && batch.status?.trim() !== 'Cancelled';

  return (
    <div className="batch-details-page">
      {/* 1. Breadcrumb Navigation */}
      <nav className="org-admin-batch-breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard/org-admin/batches" className="org-admin-batch-breadcrumb-back">
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Batches</span>
        </Link>
        <span className="org-admin-batch-breadcrumb-sep">/</span>
        {tripId && tripName ? (
          <>
            <Link to={`/dashboard/org-admin/trips/${tripId}`} className="org-admin-batch-breadcrumb-link">
              {tripName}
            </Link>
            <span className="org-admin-batch-breadcrumb-sep">/</span>
          </>
        ) : null}
        <span className="org-admin-batch-breadcrumb-current">{batch.batchName || 'Batch Details'}</span>
      </nav>

      {actionMessage && (
        <div className="alert alert-success" style={{ margin: '0' }}>
          <CheckCircle2 size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 2. Batch Hero Header */}
      <header className="org-admin-batch-hero">
        <div className="org-admin-batch-hero__inner">
          <div className="org-admin-batch-hero__content">
            {/* Trip Context Eyebrow */}
            {tripName && (
              <div className="org-admin-batch-hero__eyebrow">
                <Mountain size={13} aria-hidden="true" />
                {tripId ? (
                  <Link to={`/dashboard/org-admin/trips/${tripId}`} className="org-admin-batch-hero__trip-link">
                    {tripName}
                  </Link>
                ) : (
                  <span>{tripName}</span>
                )}
                {tripLocation && (
                  <span className="org-admin-batch-hero__location">
                    <MapPin size={12} aria-hidden="true" />
                    <span>{tripLocation}</span>
                  </span>
                )}
              </div>
            )}

            <div className="org-admin-batch-hero__title-row">
              <h1 className="org-admin-batch-hero__title">{batch.batchName || 'Batch Departure'}</h1>
              <span className={`org-admin-batch-details-status status-${statusClass}`}>
                {statusRaw}
              </span>
            </div>

            {/* Key Metadata Row */}
            <div className="org-admin-batch-hero__meta">
              <div className="org-admin-batch-hero__meta-item">
                <CalendarDays size={15} aria-hidden="true" />
                <span>{dateRange}</span>
              </div>
              {duration && (
                <div className="org-admin-batch-hero__meta-item">
                  <Clock size={15} aria-hidden="true" />
                  <span>{duration}</span>
                </div>
              )}
              {batch.maxCapacity != null && (
                <div className="org-admin-batch-hero__meta-item">
                  <Users size={15} aria-hidden="true" />
                  <span>Capacity: {batch.maxCapacity}</span>
                </div>
              )}
            </div>

            {/* Hero Actions */}
            <div className="org-admin-batch-hero__actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAssignForm((prev) => !prev)}
              >
                <Plus size={15} aria-hidden="true" />
                <span>{showAssignForm ? 'Close Assignment' : 'Assign Staff'}</span>
              </button>

              {canComplete && (
                <button
                  type="button"
                  className="btn btn-outline-warning"
                  onClick={handleCompleteBatch}
                >
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>Mark Complete</span>
                </button>
              )}
            </div>
          </div>

          {/* Visual Trip Backdrop */}
          {tripImage && (
            <div className="org-admin-batch-hero__visual" aria-hidden="true">
              <img src={tripImage} alt="" className="org-admin-batch-hero__visual-img" />
              <div className="org-admin-batch-hero__visual-overlay" />
            </div>
          )}
        </div>
      </header>

      {/* 3. Operational Summary KPI Cards */}
      <section className="org-admin-batch-kpi-grid" aria-label="Operational KPI summary">
        <div className="org-admin-batch-kpi-card">
          <span className="org-admin-batch-kpi-label">Max Capacity</span>
          <div className="org-admin-batch-kpi-value-row">
            <strong className="org-admin-batch-kpi-value">{batch.maxCapacity ?? '—'}</strong>
            <Users size={18} className="org-admin-batch-kpi-icon" aria-hidden="true" />
          </div>
          <span className="org-admin-batch-kpi-sub">Total batch seats</span>
        </div>

        <div className="org-admin-batch-kpi-card">
          <span className="org-admin-batch-kpi-label">Registered Participants</span>
          <div className="org-admin-batch-kpi-value-row">
            <strong className="org-admin-batch-kpi-value">
              {participants.items.length}
              {batch.maxCapacity != null && <span className="kpi-denom"> / {batch.maxCapacity}</span>}
            </strong>
            <Users size={18} className="org-admin-batch-kpi-icon" aria-hidden="true" />
          </div>
          {batch.maxCapacity != null && (
            <div className="org-admin-batch-kpi-bar">
              <div className="org-admin-batch-kpi-bar-fill" style={{ width: `${occupancyPercent}%` }} />
            </div>
          )}
          <span className="org-admin-batch-kpi-sub">{occupancyPercent}% capacity filled</span>
        </div>

        <div className="org-admin-batch-kpi-card">
          <span className="org-admin-batch-kpi-label">Confirmed Bookings</span>
          <div className="org-admin-batch-kpi-value-row">
            <strong className="org-admin-batch-kpi-value">{confirmedBookingsCount}</strong>
            <CheckCircle2 size={18} className="org-admin-batch-kpi-icon icon-success" aria-hidden="true" />
          </div>
          <span className="org-admin-batch-kpi-sub">Fully confirmed trekkers</span>
        </div>

        <div className="org-admin-batch-kpi-card">
          <span className="org-admin-batch-kpi-label">Assigned Field Team</span>
          <div className="org-admin-batch-kpi-value-row">
            <strong className="org-admin-batch-kpi-value">{assignments.items.length}</strong>
            <UserRound size={18} className="org-admin-batch-kpi-icon" aria-hidden="true" />
          </div>
          <span className="org-admin-batch-kpi-sub">Leaders, Medics &amp; Volunteers</span>
        </div>

        <div className="org-admin-batch-kpi-card">
          <span className="org-admin-batch-kpi-label">Trek Duration</span>
          <div className="org-admin-batch-kpi-value-row">
            <strong className="org-admin-batch-kpi-value">{duration || '—'}</strong>
            <Clock size={18} className="org-admin-batch-kpi-icon" aria-hidden="true" />
          </div>
          <span className="org-admin-batch-kpi-sub">Scheduled itinerary</span>
        </div>
      </section>

      {/* 4. Assigned Field Team */}
      <section className="org-admin-batch-details-section org-admin-batch-team-section">
        <div className="org-admin-batch-details-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Operations Staff</p>
            <h2>Assigned Field Team ({assignments.items.length})</h2>
            <p className="org-admin-batch-details-section-desc">Leaders, medics, and volunteers assigned to oversee this departure.</p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setShowAssignForm((prev) => !prev)}
          >
            <Plus size={14} aria-hidden="true" />
            <span>{showAssignForm ? 'Close Form' : '+ Assign Staff'}</span>
          </button>
        </div>

        {/* Inline Assignment Form if toggled */}
        {showAssignForm && (
          <div className="card org-admin-page-form-card" style={{ marginBottom: '0.5rem' }}>
            <h3>Assign Staff to {batch.batchName}</h3>
            <form onSubmit={handleAssignSubmit}>
              <div className="form-group">
                <label>Role in Batch</label>
                <select
                  value={assignForm.roleInBatch}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="TrekLeader">Trek Leader</option>
                  <option value="MedicalOfficer">Medical Officer</option>
                  <option value="Volunteer">Volunteer</option>
                </select>
              </div>

              <div className="form-group">
                <label>Staff Member</label>
                <select
                  value={assignForm.userId}
                  onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                  required
                >
                  <option value="">Select Staff Member</option>
                  {staffMembers
                    .filter((member) => {
                      const role = member.role || member.userId?.role;
                      return role === assignForm.roleInBatch;
                    })
                    .map((member) => {
                      const staffUser = member.userId;
                      return staffUser ? (
                        <option key={staffUser._id} value={staffUser._id}>
                          {staffUser.fullName || 'Staff'} ({member.role || staffUser.role})
                        </option>
                      ) : null;
                    })}
                </select>
                {staffMembers.filter((m) => (m.role || m.userId?.role) === assignForm.roleInBatch).length === 0 && (
                  <p className="field-hint" style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    No active {assignForm.roleInBatch === 'MedicalOfficer' ? 'Medical Officer' : assignForm.roleInBatch} staff members found in your organization.
                  </p>
                )}
              </div>

              {assignForm.roleInBatch === 'Volunteer' && (
                <div className="form-group">
                  <label>Supervising Trek Leader (Volunteer only)</label>
                  <select
                    value={assignForm.supervisingTrekLeaderId}
                    onChange={(e) => setAssignForm({ ...assignForm, supervisingTrekLeaderId: e.target.value })}
                    required
                  >
                    <option value="">Select a Trek Leader</option>
                    {trekLeaders.length > 0
                      ? trekLeaders.map((tl) => tl.userId && (
                          <option key={tl.userId._id} value={tl.userId._id}>
                            {tl.userId.fullName} (Assigned to this batch)
                          </option>
                        ))
                      : staffMembers
                          .filter((m) => (m.role || m.userId?.role) === 'TrekLeader')
                          .map((m) => m.userId && (
                            <option key={m.userId._id} value={m.userId._id}>
                              {m.userId.fullName}
                            </option>
                          ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={assignSubmitting}>
                  {assignSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignForm(false)}>
                  Cancel
                </button>
              </div>
            </form>

            {assignMessage && (
              <p className={assignMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'} style={{ marginTop: '0.75rem' }}>
                {assignMessage}
              </p>
            )}
          </div>
        )}

        {assignments.error ? (
          <p className="org-admin-batch-details-error" role="alert">{assignments.error}</p>
        ) : assignments.items.length === 0 ? (
          <div className="org-admin-batch-team-empty">
            <UserRound size={36} aria-hidden="true" />
            <h3>No field team assigned</h3>
            <p>Assign Trek Leaders, Medical Officers, and Volunteers to oversee operations for this batch.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAssignForm(true)}
            >
              <Plus size={15} aria-hidden="true" />
              <span>+ Assign Staff</span>
            </button>
          </div>
        ) : (
          <div className="org-admin-batch-team-groups">
            {/* Trek Leaders Group */}
            {trekLeaders.length > 0 && (
              <div className="org-admin-batch-team-group">
                <div className="org-admin-batch-team-group__header">
                  <UserRound size={16} className="role-icon-leader" aria-hidden="true" />
                  <h3>Trek Leaders ({trekLeaders.length})</h3>
                </div>
                <div className="org-admin-batch-details-staff-grid">
                  {trekLeaders.map((assignment) => (
                    <article className="org-admin-batch-staff-card" key={assignment._id}>
                      <div className="org-admin-batch-staff-avatar role-leader">
                        <UserRound size={18} />
                      </div>
                      <div className="org-admin-batch-staff-info">
                        <span className="org-admin-batch-staff-pill role-leader-pill">Trek Leader</span>
                        <h4>{assignment.userId?.fullName || 'Staff Member'}</h4>
                        {assignment.userId?.email && <p className="staff-email">{assignment.userId.email}</p>}
                      </div>
                      <button
                        type="button"
                        className="org-admin-batch-staff-remove"
                        title="Remove assignment"
                        onClick={() => handleRemoveAssignment(assignment._id, assignment.userId?.fullName || 'this staff member')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Medical Officers Group */}
            {medicalOfficers.length > 0 && (
              <div className="org-admin-batch-team-group">
                <div className="org-admin-batch-team-group__header">
                  <Stethoscope size={16} className="role-icon-medic" aria-hidden="true" />
                  <h3>Medical Officers ({medicalOfficers.length})</h3>
                </div>
                <div className="org-admin-batch-details-staff-grid">
                  {medicalOfficers.map((assignment) => (
                    <article className="org-admin-batch-staff-card" key={assignment._id}>
                      <div className="org-admin-batch-staff-avatar role-medic">
                        <Stethoscope size={18} />
                      </div>
                      <div className="org-admin-batch-staff-info">
                        <span className="org-admin-batch-staff-pill role-medic-pill">Medical Officer</span>
                        <h4>{assignment.userId?.fullName || 'Staff Member'}</h4>
                        {assignment.userId?.email && <p className="staff-email">{assignment.userId.email}</p>}
                      </div>
                      <button
                        type="button"
                        className="org-admin-batch-staff-remove"
                        title="Remove assignment"
                        onClick={() => handleRemoveAssignment(assignment._id, assignment.userId?.fullName || 'this staff member')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Volunteers Group */}
            {volunteers.length > 0 && (
              <div className="org-admin-batch-team-group">
                <div className="org-admin-batch-team-group__header">
                  <Award size={16} className="role-icon-volunteer" aria-hidden="true" />
                  <h3>Volunteers ({volunteers.length})</h3>
                </div>
                <div className="org-admin-batch-details-staff-grid">
                  {volunteers.map((assignment) => {
                    const supervisorId = referenceId(assignment.supervisingTrekLeaderId);
                    const supervisorName = supervisorId ? supervisorNames.get(supervisorId) : null;
                    return (
                      <article className="org-admin-batch-staff-card" key={assignment._id}>
                        <div className="org-admin-batch-staff-avatar role-volunteer">
                          <Award size={18} />
                        </div>
                        <div className="org-admin-batch-staff-info">
                          <span className="org-admin-batch-staff-pill role-volunteer-pill">Volunteer</span>
                          <h4>{assignment.userId?.fullName || 'Staff Member'}</h4>
                          {assignment.userId?.email && <p className="staff-email">{assignment.userId.email}</p>}
                          {supervisorName && (
                            <p className="org-admin-batch-supervisor-note">
                              Supervised by <strong>{supervisorName}</strong>
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="org-admin-batch-staff-remove"
                          title="Remove assignment"
                          onClick={() => handleRemoveAssignment(assignment._id, assignment.userId?.fullName || 'this staff member')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. Participants Section */}
      <section className="org-admin-batch-details-section org-admin-batch-participants-section">
        <div className="org-admin-batch-details-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Trekkers</p>
            <h2>Participants ({participants.items.length})</h2>
            <p className="org-admin-batch-details-section-desc">Roster of registered participants and booking confirmations.</p>
          </div>
        </div>

        {participants.error ? (
          <p className="org-admin-batch-details-error" role="alert">{participants.error}</p>
        ) : participants.items.length === 0 ? (
          <div className="org-admin-batch-empty-card">
            <Users size={32} aria-hidden="true" />
            <p>No participants registered for this batch yet.</p>
            <span className="empty-sub">Registered participants will appear in this roster.</span>
          </div>
        ) : (
          <div className="org-admin-batch-participants-table-wrap">
            <table className="org-admin-batch-participants-table">
              <thead>
                <tr>
                  <th>Participant</th>
                  <th>Contact Info</th>
                  <th>Booking Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.items.map((booking) => {
                  const participant = booking.participantId;
                  const status = booking.status || 'Inquiry';
                  const statusPillClass = status.toLowerCase().replace(/\s+/g, '-');
                  return (
                    <tr key={booking._id}>
                      <td>
                        <div className="participant-name-cell">
                          <div className="participant-avatar" aria-hidden="true">
                            <UserRound size={15} />
                          </div>
                          <span className="participant-fullname">
                            {participant?.fullName || 'Anonymous Participant'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="participant-contact-cell">
                          {participant?.email && <span className="contact-email">{participant.email}</span>}
                          {participant?.mobileNumber && <span className="contact-phone">{participant.mobileNumber}</span>}
                          {!participant?.email && !participant?.mobileNumber && <span className="text-muted">—</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`org-admin-booking-badge status-${statusPillClass}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 6. Operations Grid (Attendance & Checkpoints) */}
      <section className="org-admin-batch-details-section org-admin-batch-ops-section">
        <div className="org-admin-batch-details-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Field Operations</p>
            <h2>Trail Progress &amp; Verification</h2>
            <p className="org-admin-batch-details-section-desc">Field check-in, roster verification, and trail milestone progress.</p>
          </div>
        </div>

        <div className="org-admin-batch-ops-grid">
          {/* Attendance Card */}
          <div className="org-admin-batch-card-ops">
            <div className="org-admin-batch-card-ops__header">
              <div className="ops-icon-wrap icon-attendance">
                <ClipboardCheck size={18} aria-hidden="true" />
              </div>
              <div>
                <h3>Attendance Tracking</h3>
                <p>Field check-in and roster verification</p>
              </div>
            </div>
            <div className="org-admin-batch-info-box">
              <AlertTriangle size={18} className="info-box-icon" aria-hidden="true" />
              <div>
                <strong>Attendance records are recorded in the field</strong>
                <p>Attendance records are not available through the current OrgAdmin read API. Field leaders maintain real-time logs on trail.</p>
              </div>
            </div>
          </div>

          {/* Checkpoints Card */}
          <div className="org-admin-batch-card-ops">
            <div className="org-admin-batch-card-ops__header">
              <div className="ops-icon-wrap icon-checkpoints">
                <MapPin size={18} aria-hidden="true" />
              </div>
              <div>
                <h3>Checkpoint Tracking</h3>
                <p>Trail milestone &amp; pass progress</p>
              </div>
            </div>
            <div className="org-admin-batch-info-box">
              <AlertTriangle size={18} className="info-box-icon" aria-hidden="true" />
              <div>
                <strong>Checkpoint updates are managed by field staff</strong>
                <p>Checkpoint data is not currently available to OrgAdmin accounts through the current API. Trek leaders update checkpoints directly during expeditions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Gear Allocation Section */}
      <section className="org-admin-batch-details-section org-admin-batch-gear-section">
        <div className="org-admin-batch-details-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Equipment</p>
            <h2>Gear Allocation ({batchGear.length})</h2>
            <p className="org-admin-batch-details-section-desc">Safety gear and expedition equipment issued for this batch.</p>
          </div>
        </div>

        {gear.error ? (
          <p className="org-admin-batch-details-error" role="alert">{gear.error}</p>
        ) : batchGear.length === 0 ? (
          <div className="org-admin-batch-empty-card">
            <PackageCheck size={32} aria-hidden="true" />
            <p>No gear allocated to this batch yet.</p>
            <span className="empty-sub">Equipment assigned to this batch will appear here.</span>
          </div>
        ) : (
          <div className="org-admin-batch-gear-grid">
            {batchGear.map((allocation) => (
              <article className="org-admin-batch-gear-card" key={allocation._id}>
                <div className="gear-icon-box">
                  <PackageCheck size={18} aria-hidden="true" />
                </div>
                <div className="gear-card-body">
                  <h4>{allocation.gearItemId?.name || 'Equipment Item'}</h4>
                  {allocation.participantId?.fullName && (
                    <p className="gear-assigned">Assigned to: <strong>{allocation.participantId.fullName}</strong></p>
                  )}
                  {allocation.expectedReturnDate && (
                    <p className="gear-return">Expected return: {formatDate(allocation.expectedReturnDate)}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* 8. Safety: Incidents & SOS */}
      <section className="org-admin-batch-details-section org-admin-batch-safety-section">
        <div className="org-admin-batch-details-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Emergency &amp; Risk</p>
            <h2>Incidents &amp; SOS Alerts</h2>
            <p className="org-admin-batch-details-section-desc">Active emergency signals and filed incident reports.</p>
          </div>
        </div>

        {incidents.error || alerts.error ? (
          <p className="org-admin-batch-details-error" role="alert">{incidents.error || alerts.error}</p>
        ) : incidents.items.length === 0 && alerts.items.length === 0 ? (
          <div className="org-admin-batch-safe-card">
            <ShieldCheck size={36} aria-hidden="true" />
            <h3>No incidents reported</h3>
            <p>This batch currently has no recorded incidents or active SOS emergency events.</p>
          </div>
        ) : (
          <div className="org-admin-batch-safety-grid">
            {/* SOS Alerts */}
            {alerts.items.length > 0 && (
              <div className="org-admin-batch-sos-group">
                <h3>SOS Emergency Alerts ({alerts.items.length})</h3>
                <div className="org-admin-batch-sos-list">
                  {alerts.items.map((alert) => (
                    <article className="org-admin-batch-sos-card" key={alert._id}>
                      <span className="sos-alert-icon" aria-hidden="true">
                        <AlertTriangle size={18} />
                      </span>
                      <div className="sos-alert-content">
                        <h4>{alert.emergencyType || 'SOS Alert'}</h4>
                        <div className="sos-alert-meta">
                          {alert.status && (
                            <span className={`org-admin-booking-badge status-${alert.status.toLowerCase().replace(/\s+/g, '-')}`}>
                              {alert.status}
                            </span>
                          )}
                          {formatDate(alert.createdAt) && <span className="sos-date">{formatDate(alert.createdAt)}</span>}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Incidents */}
            {incidents.items.length > 0 && (
              <div className="org-admin-batch-incident-group">
                <h3>Incident Reports ({incidents.items.length})</h3>
                <div className="org-admin-batch-incident-list">
                  {incidents.items.map((incident) => (
                    <article className="org-admin-batch-incident-card" key={incident._id}>
                      <header><h4>Incident Report</h4></header>
                      <div className="org-admin-batch-incident-fields">
                        {incident.description && (
                          <div>
                            <span className="field-lbl">Description</span>
                            <p>{incident.description}</p>
                          </div>
                        )}
                        {incident.actionTaken && (
                          <div>
                            <span className="field-lbl">Action Taken</span>
                            <p>{incident.actionTaken}</p>
                          </div>
                        )}
                        {incident.volunteerNotes && (
                          <div>
                            <span className="field-lbl">Field Staff Notes</span>
                            <p>{incident.volunteerNotes}</p>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
