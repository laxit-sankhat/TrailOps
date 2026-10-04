import { useEffect, useState, useMemo } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Clock,
  Users,
  Mountain,
  MapPin,
  ArrowRight,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { completeBatch, createBatch, getMyOrgBatches } from '../../services/batchService';
import { createBatchAssignment, getAssignmentsForBatch } from '../../services/batchAssignmentService';
import { getMyOrgStaff } from '../../services/staffService';
import { getTripsByOrg } from '../../services/tripService';
import { useAuth } from '../../context/AuthContext';
import type { BatchSummary, OrganizationStaffSummary } from '../../types';
import './BatchesPage.css';

type BatchWithDetails = BatchSummary & {
  tripId?: string | { _id: string; name?: string; location?: string };
  maxCapacity?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
};

type TripItem = {
  _id: string;
  name: string;
  location?: string;
  images?: Array<string | { url: string; publicId?: string }>;
  imageUrl?: string | null;
  difficultyLevel?: string;
  durationDays?: number;
};

type FieldErrors = Record<string, string>;

type TrekLeaderAssignment = {
  _id: string;
  userId: { _id: string; fullName: string } | null;
};

function getPrimaryImage(trip?: TripItem | null): string | null {
  if (!trip) return null;
  if (trip.images && trip.images.length > 0) {
    const first = trip.images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'url' in first) return first.url;
  }
  return trip.imageUrl || null;
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

export default function BatchesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [batches, setBatches] = useState<BatchWithDetails[]>([]);
  const [trips, setTrips] = useState<TripItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<OrganizationStaffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [batchForm, setBatchForm] = useState({
    tripId: '',
    batchName: '',
    startDate: '',
    endDate: '',
    maxCapacity: 10
  });
  const [batchMessage, setBatchMessage] = useState('');
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchValidationErrors, setBatchValidationErrors] = useState<FieldErrors>({});

  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({
    batchId: '',
    userId: '',
    roleInBatch: 'TrekLeader',
    supervisingTrekLeaderId: ''
  });
  const [assignMessage, setAssignMessage] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [supervisingTrekLeaders, setSupervisingTrekLeaders] = useState<TrekLeaderAssignment[]>([]);

  useEffect(() => {
    if (location.hash === '#create-batch') {
      setShowCreateForm(true);
    }
    if (location.hash === '#assign-staff') {
      setShowAssignForm(true);
    }
  }, [location.hash]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [batchResponse, tripResponse, staffResponse] = await Promise.all([
        getMyOrgBatches(),
        user?.organizationId ? getTripsByOrg(user.organizationId) : Promise.resolve(null),
        getMyOrgStaff()
      ]);
      setBatches(batchResponse.data.batches || []);
      setTrips(tripResponse?.data.trips || []);
      setStaffMembers(staffResponse.data.staff || []);
      if (!user?.organizationId) setError('Organization information is unavailable; trip names could not be loaded.');
    } catch (err) {
      console.error(err);
      setError(isAxiosError<{ message?: string }>(err) ? err.response?.data?.message || 'Unable to load batches.' : 'Unable to load batches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [user?.organizationId]);

  // Operational Sections: Active & Upcoming vs Completed vs Cancelled
  const activeBatches = useMemo(() => {
    return batches.filter((b) => b.status !== 'Completed' && b.status?.trim() !== 'Cancelled');
  }, [batches]);

  const completedBatches = useMemo(() => {
    return batches.filter((b) => b.status === 'Completed');
  }, [batches]);

  const cancelledBatches = useMemo(() => {
    return batches.filter((b) => b.status?.trim() === 'Cancelled');
  }, [batches]);

  const handleAssignmentBatchChange = async (batchId: string) => {
    setAssignForm((current) => ({ ...current, batchId, supervisingTrekLeaderId: '' }));
    setSupervisingTrekLeaders([]);
    if (!batchId) return;
    try {
      const response = await getAssignmentsForBatch(batchId, 'TrekLeader');
      setSupervisingTrekLeaders(response.data.assignments || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAssignForm({ ...assignForm, [e.target.name]: e.target.value });
  };

  const handleRoleInBatchChange = (newRole: string) => {
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
    if (assignSubmitting) return;
    setAssignSubmitting(true);
    setAssignMessage('');
    try {
      const payload = {
        batchId: assignForm.batchId,
        userId: assignForm.userId,
        roleInBatch: assignForm.roleInBatch,
        supervisingTrekLeaderId: assignForm.roleInBatch === 'Volunteer' ? assignForm.supervisingTrekLeaderId || undefined : undefined
      };
      await createBatchAssignment(payload);
      setAssignMessage('Assignment created successfully');
      setAssignForm({ batchId: '', userId: '', roleInBatch: 'TrekLeader', supervisingTrekLeaderId: '' });
      setShowAssignForm(false);
      await fetchData();
    } catch (err: any) {
      setAssignMessage(err.response?.data?.message || 'Something went wrong assigning staff');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const validateBatchField = (field: string, formElement: HTMLFormElement) => {
    const values = new FormData(formElement);
    const value = String(values.get(field) || '');
    if (!value.trim()) return `${field} is required.`;

    if (field === 'startDate' || field === 'endDate') {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return 'Please enter a valid date.';
    }

    if (field === 'maxCapacity') {
      const cap = Number(value);
      if (!Number.isFinite(cap) || cap < 1) return 'Capacity must be at least 1.';
    }

    const startVal = String(values.get('startDate') || '');
    const endVal = String(values.get('endDate') || '');
    if (startVal && endVal) {
      const start = new Date(startVal);
      const end = new Date(endVal);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end < start) {
        if (field === 'endDate') return 'End date must be after start date.';
      }
    }

    return '';
  };

  const validateBatchForm = (formElement: HTMLFormElement) => {
    const fields = ['tripId', 'batchName', 'startDate', 'endDate', 'maxCapacity'];
    return Object.fromEntries(fields.map((field) => [field, validateBatchField(field, formElement)]));
  };

  const handleBatchBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const field = e.currentTarget.name;
    const formElement = e.currentTarget.form;
    if (!formElement) return;
    const err = validateBatchField(field, formElement);
    setBatchValidationErrors((current) => ({ ...current, [field]: err }));
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBatchForm({ ...batchForm, [e.target.name]: e.target.value });
  };

  const handleBatchSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validateBatchForm(e.currentTarget);
    setBatchValidationErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setBatchSubmitting(true);
    setBatchMessage('');
    try {
      await createBatch(batchForm);
      setBatchMessage('Batch created successfully');
      setBatchForm({
        tripId: '',
        batchName: '',
        startDate: '',
        endDate: '',
        maxCapacity: 10
      });
      await fetchData();
      setShowCreateForm(false);
    } catch (err: any) {
      setBatchMessage(err.response?.data?.message || 'Something went wrong');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleCompleteBatch = async (batchId: string) => {
    if (!window.confirm('Are you sure you want to mark this batch as completed?')) return;
    setActionMessage('');
    try {
      await completeBatch(batchId);
      setActionMessage('Batch marked as completed');
      await fetchData();
    } catch (err: any) {
      setActionMessage(err.response?.data?.message || 'Something went wrong completing batch');
    }
  };

  const renderBatchCard = (batch: BatchWithDetails) => {
    const tripId = typeof batch.tripId === 'object' && batch.tripId !== null ? batch.tripId._id : batch.tripId;
    const trip = trips.find((t) => t._id === tripId);
    const tripName = trip?.name || (typeof batch.tripId === 'object' && batch.tripId?.name ? batch.tripId.name : 'TrailOps Trek');
    const tripLocation = trip?.location;
    const tripImage = getPrimaryImage(trip);

    const dateRange = formatDateRange(batch.startDate, batch.endDate);
    const duration = calculateDuration(batch.startDate, batch.endDate);
    const statusRaw = batch.status || 'Open';
    const statusClass = statusRaw.toLowerCase().trim().replace(/\s+/g, '-');
    const isCompleted = statusRaw === 'Completed';
    const isCancelled = statusRaw.trim() === 'Cancelled';
    const canComplete = !isCompleted && !isCancelled;

    return (
      <article
        key={batch._id}
        className={`org-admin-batch-card ${isCompleted ? 'org-admin-batch-card--completed' : ''} ${isCancelled ? 'org-admin-batch-card--cancelled' : ''}`}
        onClick={() => navigate(`/dashboard/org-admin/batches/${batch._id}`)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/dashboard/org-admin/batches/${batch._id}`);
          }
        }}
        aria-label={`View details for ${batch.batchName || 'batch'}`}
      >
        {/* 1. Trip Media Section with Badges */}
        <div className="org-admin-batch-card__media">
          {tripImage ? (
            <img
              src={tripImage}
              alt={tripName}
              className="org-admin-batch-card__image"
              loading="lazy"
            />
          ) : (
            <div className="org-admin-batch-card__fallback">
              <Mountain size={36} aria-hidden="true" />
              <span>{tripName}</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="org-admin-batch-card__status-wrapper">
            <span className={`org-admin-batch-card__status-pill status-${statusClass}`}>
              {statusRaw}
            </span>
          </div>

          {/* Location Badge if available */}
          {tripLocation && (
            <div className="org-admin-batch-card__location-wrapper">
              <span className="org-admin-batch-card__location-pill">
                <MapPin size={12} aria-hidden="true" />
                <span>{tripLocation}</span>
              </span>
            </div>
          )}
        </div>

        {/* 2. Card Content Body */}
        <div className="org-admin-batch-card__content">
          {/* Trip Context Eyebrow */}
          <div className="org-admin-batch-card__eyebrow">
            <Mountain size={13} aria-hidden="true" />
            <span>{tripName}</span>
          </div>

          {/* Batch Title */}
          <h3 className="org-admin-batch-card__title">
            {batch.batchName || 'Unnamed Departure'}
          </h3>

          {/* Date Range */}
          <div className="org-admin-batch-card__dates">
            <CalendarDays size={14} aria-hidden="true" />
            <span>{dateRange}</span>
          </div>

          {/* Operational Stats Pills */}
          <div className="org-admin-batch-card__facts">
            {duration && (
              <span className="org-admin-batch-card__fact-pill">
                <Clock size={12} aria-hidden="true" />
                <span>{duration}</span>
              </span>
            )}
            {batch.maxCapacity != null && (
              <span className="org-admin-batch-card__fact-pill">
                <Users size={12} aria-hidden="true" />
                <span>{batch.maxCapacity} Capacity</span>
              </span>
            )}
            <span className={`org-admin-batch-card__fact-pill fact-status-${statusClass}`}>
              <span className="status-dot" aria-hidden="true" />
              <span>{statusRaw}</span>
            </span>
          </div>

          {/* Field Team Row */}
          <div className="org-admin-batch-card__team-row">
            <div className="org-admin-batch-card__team-label">
              <UserCheck size={14} aria-hidden="true" />
              <span>Field Team</span>
            </div>
            <span className="org-admin-batch-card__team-link">
              Manage field team →
            </span>
          </div>

          {/* Action Footer */}
          <div className="org-admin-batch-card__footer">
            <Link
              to={`/dashboard/org-admin/batches/${batch._id}`}
              className="org-admin-batch-card__cta-btn"
              onClick={(e) => e.stopPropagation()}
            >
              <span>View Details</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>

            {canComplete && (
              <button
                type="button"
                className="org-admin-batch-card__complete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteBatch(batch._id);
                }}
              >
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Mark Complete</span>
              </button>
            )}
          </div>
        </div>
      </article>
    );
  };

  return (
    <section className="org-admin-batches-page">
      <header className="org-admin-route-heading">
        <p className="org-admin-route-eyebrow">Operations</p>
        <h1>Batches</h1>
        <p>Plan departures, assign field teams, and monitor trek operations.</p>
      </header>

      <div className="org-admin-route-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          {showCreateForm ? 'Close Form' : '+ Create Batch'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowAssignForm((prev) => !prev)}
        >
          {showAssignForm ? 'Close Assignment' : '+ Assign Staff to Batch'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card org-admin-page-form-card" id="create-batch" style={{ marginBottom: '1.75rem' }}>
          <h2>Create New Batch</h2>
          <form onSubmit={handleBatchSubmit} noValidate>
            <div className="form-group">
              <label>Trip</label>
              <select
                name="tripId"
                value={batchForm.tripId}
                onChange={handleBatchChange}
                onBlur={handleBatchBlur}
                aria-invalid={Boolean(batchValidationErrors.tripId)}
                required
              >
                <option value="">Select a Trip</option>
                {trips.map((trip) => (
                  <option key={trip._id} value={trip._id}>{trip.name}</option>
                ))}
              </select>
              {batchValidationErrors.tripId && <p className="field-error">{batchValidationErrors.tripId}</p>}
            </div>
            <div className="form-group">
              <label>Batch Name</label>
              <input
                name="batchName"
                value={batchForm.batchName}
                placeholder="e.g. Batch A - February Departure"
                onChange={handleBatchChange}
                onBlur={handleBatchBlur}
                aria-invalid={Boolean(batchValidationErrors.batchName)}
                required
              />
              {batchValidationErrors.batchName && <p className="field-error">{batchValidationErrors.batchName}</p>}
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input
                name="startDate"
                type="date"
                value={batchForm.startDate}
                onChange={handleBatchChange}
                onBlur={handleBatchBlur}
                aria-invalid={Boolean(batchValidationErrors.startDate)}
                required
              />
              {batchValidationErrors.startDate && <p className="field-error">{batchValidationErrors.startDate}</p>}
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                name="endDate"
                type="date"
                value={batchForm.endDate}
                onChange={handleBatchChange}
                onBlur={handleBatchBlur}
                aria-invalid={Boolean(batchValidationErrors.endDate)}
                required
              />
              {batchValidationErrors.endDate && <p className="field-error">{batchValidationErrors.endDate}</p>}
            </div>
            <div className="form-group">
              <label>Max Capacity</label>
              <input
                name="maxCapacity"
                type="number"
                value={batchForm.maxCapacity}
                placeholder="Max Capacity"
                onChange={handleBatchChange}
                onBlur={handleBatchBlur}
                aria-invalid={Boolean(batchValidationErrors.maxCapacity)}
                required
              />
              {batchValidationErrors.maxCapacity && <p className="field-error">{batchValidationErrors.maxCapacity}</p>}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={batchSubmitting}>
                {batchSubmitting ? 'Creating...' : 'Create Batch'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
          {batchMessage && (
            <p className={batchMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'} style={{ marginTop: '1rem' }}>
              {batchMessage}
            </p>
          )}
        </div>
      )}

      {showAssignForm && (
        <div className="card org-admin-page-form-card" id="assign-staff" style={{ marginBottom: '1.75rem' }}>
          <h2>Assign Staff to Batch</h2>
          <form onSubmit={handleAssignSubmit}>
            <div className="form-group">
              <label>Batch</label>
              <select
                name="batchId"
                value={assignForm.batchId}
                onChange={(e) => handleAssignmentBatchChange(e.target.value)}
                required
              >
                <option value="">Select a Batch</option>
                {batches.map((batch) => (
                  <option key={batch._id} value={batch._id}>{batch.batchName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Role in Batch</label>
              <select
                name="roleInBatch"
                value={assignForm.roleInBatch}
                onChange={(e) => handleRoleInBatchChange(e.target.value)}
              >
                <option value="TrekLeader">Trek Leader</option>
                <option value="MedicalOfficer">Medical Officer</option>
                <option value="Volunteer">Volunteer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Staff Member</label>
              <select
                name="userId"
                value={assignForm.userId}
                onChange={handleAssignChange}
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
                  name="supervisingTrekLeaderId"
                  value={assignForm.supervisingTrekLeaderId}
                  onChange={handleAssignChange}
                  disabled={!assignForm.batchId}
                  required
                >
                  <option value="">Select a Trek Leader</option>
                  {supervisingTrekLeaders.map((assignment) => assignment.userId && (
                    <option key={assignment._id} value={assignment.userId._id}>{assignment.userId.fullName}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={assignSubmitting}>
                {assignSubmitting ? 'Assigning...' : 'Assign to Batch'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAssignForm(false)}>
                Cancel
              </button>
            </div>
          </form>
          {assignMessage && (
            <p className={assignMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'} style={{ marginTop: '1rem' }}>
              {assignMessage}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="org-admin-route-error" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void fetchData()}>
            Retry
          </button>
        </div>
      )}
      {actionMessage && (
        <p className={actionMessage.includes('completed') ? 'alert alert-success' : 'alert alert-error'} style={{ marginBottom: '1rem' }}>
          {actionMessage}
        </p>
      )}

      {loading ? (
        <div className="org-admin-batches-loading-grid" aria-label="Loading batches">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="org-admin-batch-card org-admin-batch-card--skeleton" aria-hidden="true">
              <div className="skeleton-box skeleton-media" />
              <div className="org-admin-batch-card__content">
                <div className="skeleton-box skeleton-eyebrow" />
                <div className="skeleton-box skeleton-title" />
                <div className="skeleton-box skeleton-dates" />
                <div className="skeleton-facts-row">
                  <div className="skeleton-box skeleton-pill" />
                  <div className="skeleton-box skeleton-pill" />
                  <div className="skeleton-box skeleton-pill" />
                </div>
                <div className="skeleton-box skeleton-team" />
                <div className="skeleton-box skeleton-footer" />
              </div>
            </div>
          ))}
        </div>
      ) : batches.length === 0 ? (
        <div className="org-admin-batches-empty-card">
          <Mountain size={42} aria-hidden="true" />
          <h3>No batches scheduled yet</h3>
          <p>Create your first departure batch to begin scheduling treks and assigning field teams.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + Create Batch
          </button>
        </div>
      ) : (
        <div className="org-admin-batches-sections">
          {/* 1. Primary Section: Active & Upcoming */}
          <section className="org-admin-batches-section" aria-labelledby="active-batches-heading">
            <div className="org-admin-batches-section-header">
              <div className="org-admin-batches-section-title-wrap">
                <h2 id="active-batches-heading" className="org-admin-batches-section-title">
                  Active & Upcoming
                </h2>
                <span className="org-admin-batches-section-count">{activeBatches.length}</span>
              </div>
              <p className="org-admin-batches-section-desc">
                Active departures and scheduled operations.
              </p>
            </div>

            {activeBatches.length > 0 ? (
              <div className="org-admin-batches-grid">
                {activeBatches.map(renderBatchCard)}
              </div>
            ) : (
              <div className="org-admin-batches-section-empty">
                <div className="org-admin-batches-section-empty-icon" aria-hidden="true">
                  <CalendarDays size={24} />
                </div>
                <h3 className="org-admin-batches-section-empty-title">No active departures</h3>
                <p className="org-admin-batches-section-empty-text">
                  Create a batch to schedule your next trek operation.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setShowCreateForm(true)}
                >
                  + Create Batch
                </button>
              </div>
            )}
          </section>

          {/* 2. Second Section: Completed Departures */}
          <section className="org-admin-batches-section" aria-labelledby="completed-batches-heading">
            <div className="org-admin-batches-section-header">
              <div className="org-admin-batches-section-title-wrap">
                <h2 id="completed-batches-heading" className="org-admin-batches-section-title">
                  Completed Departures
                </h2>
                <span className="org-admin-batches-section-count">{completedBatches.length}</span>
              </div>
              <p className="org-admin-batches-section-desc">
                Previously completed trek operations.
              </p>
            </div>

            {completedBatches.length > 0 ? (
              <div className="org-admin-batches-grid">
                {completedBatches.map(renderBatchCard)}
              </div>
            ) : (
              <div className="org-admin-batches-empty-inline">
                <p>No completed departures recorded yet.</p>
              </div>
            )}
          </section>

          {/* 3. Optional Section: Cancelled Departures (rendered only when real records exist) */}
          {cancelledBatches.length > 0 && (
            <section className="org-admin-batches-section" aria-labelledby="cancelled-batches-heading">
              <div className="org-admin-batches-section-header">
                <div className="org-admin-batches-section-title-wrap">
                  <h2 id="cancelled-batches-heading" className="org-admin-batches-section-title">
                    Cancelled Departures
                  </h2>
                  <span className="org-admin-batches-section-count">{cancelledBatches.length}</span>
                </div>
                <p className="org-admin-batches-section-desc">
                  Cancelled trek operations.
                </p>
              </div>

              <div className="org-admin-batches-grid">
                {cancelledBatches.map(renderBatchCard)}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
