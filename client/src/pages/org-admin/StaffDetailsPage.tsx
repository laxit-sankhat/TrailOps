import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAssignmentsForBatch } from '../../services/batchAssignmentService';
import { getMyOrgBatches } from '../../services/batchService';
import { getStaffMemberById, removeStaffMember, reactivateStaffMember } from '../../services/staffService';
import { getTripsByOrg } from '../../services/tripService';
import type { OrganizationStaffSummary } from '../../types';
import './StaffDetailsPage.css';

type StaffProfile = OrganizationStaffSummary & {
  status?: string;
  userId: OrganizationStaffSummary['userId'] & { email?: string };
};

type OrganizationBatch = {
  _id: string;
  batchName: string;
  tripId?: string | { _id: string; name?: string };
  startDate?: string;
  endDate?: string;
};

type OrganizationTrip = {
  _id: string;
  name?: string;
};

type BatchAssignment = {
  _id: string;
  batchId: string;
  userId: { _id: string; fullName: string; email?: string } | null;
  roleInBatch: string;
  supervisingTrekLeaderId?: string | { _id: string };
};

type StaffAssignment = BatchAssignment & {
  batch: OrganizationBatch;
  tripName?: string;
};

function getReferenceId(reference: string | { _id: string } | undefined | null) {
  return typeof reference === 'object' && reference !== null ? reference._id : reference;
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

function getErrorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : fallback;
}

export default function StaffDetailsPage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assignmentsError, setAssignmentsError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadStaffDetails = async () => {
    if (!userId || !user?.organizationId) {
      setError('Staff or organization information is unavailable.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setAssignmentsError('');

    try {
      const [staffResponse, batchResponse, tripResponse] = await Promise.all([
        getStaffMemberById(userId),
        getMyOrgBatches(),
        getTripsByOrg(user.organizationId)
      ]);

      const selectedStaff: StaffProfile = staffResponse.data.staff;
      if (!selectedStaff?.userId) {
        setStaff(null);
        setAssignments([]);
        setError('Staff member not found in your organization.');
        return;
      }
      setStaff(selectedStaff);

      const batches: OrganizationBatch[] = batchResponse.data.batches || [];
      const trips: OrganizationTrip[] = tripResponse.data.trips || [];
      const assignmentResponses = await Promise.all(
        batches.map(async (batch) => {
          try {
            const response = await getAssignmentsForBatch(batch._id);
            return {
              batch,
              assignments: (response.data.assignments || []) as BatchAssignment[],
              error: ''
            };
          } catch (err) {
            console.error(err);
            return {
              batch,
              assignments: [] as BatchAssignment[],
              error: getErrorMessage(err, 'Unable to load one or more batch assignments.')
            };
          }
        })
      );

      const failedBatchLookup = assignmentResponses.find((result) => result.error);
      if (failedBatchLookup) setAssignmentsError(failedBatchLookup.error);

      const tripNames = new Map(trips.map((trip) => [trip._id, trip.name || '']));
      const staffAssignments = assignmentResponses.flatMap(({ batch, assignments: batchAssignments }) =>
        batchAssignments
          .filter((assignment) => assignment.userId?._id === userId)
          .map((assignment) => ({
            ...assignment,
            batch,
            tripName: tripNames.get(getReferenceId(batch.tripId) || '')
              || (typeof batch.tripId === 'object' ? batch.tripId.name : undefined)
          }))
      );
      setAssignments(staffAssignments);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Unable to load staff details.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStaffDetails();
  }, [userId, user?.organizationId]);

  const handleDeactivate = async () => {
    if (!staff?.userId) return;
    const name = staff.userId.fullName || 'Staff member';
    if (!window.confirm(`Are you sure you want to deactivate ${name}? They will lose access to organization departures and field operations.`)) {
      return;
    }
    setActionLoading(true);
    setNoticeMessage(null);
    try {
      await removeStaffMember(staff.userId._id);
      setNoticeMessage({ type: 'success', text: `${name} has been deactivated successfully.` });
      await loadStaffDetails();
    } catch (err) {
      console.error(err);
      setNoticeMessage({
        type: 'error',
        text: isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || `Failed to deactivate ${name}.`
          : `Failed to deactivate ${name}.`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!staff?.userId) return;
    const name = staff.userId.fullName || 'Staff member';
    setActionLoading(true);
    setNoticeMessage(null);
    try {
      await reactivateStaffMember(staff.userId._id);
      setNoticeMessage({ type: 'success', text: `${name} has been reactivated successfully.` });
      await loadStaffDetails();
    } catch (err) {
      console.error(err);
      setNoticeMessage({
        type: 'error',
        text: isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || `Failed to reactivate ${name}.`
          : `Failed to reactivate ${name}.`
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <p className="org-admin-staff-details-state">Loading staff details…</p>;
  }

  if (error || !staff?.userId) {
    return (
      <section className="org-admin-staff-details-page">
        <Link className="org-admin-staff-details-back" to="/dashboard/org-admin/staff">← Back to Staff</Link>
        <p className="org-admin-route-error" role="alert">{error || 'Staff member not found.'}</p>
      </section>
    );
  }

  const staffName = staff.userId.fullName || 'Staff member';
  const staffRole = staff.role || staff.userId.role;
  const isInactive = staff.status === 'Inactive';

  return (
    <section className="org-admin-staff-details-page">
      <Link className="org-admin-staff-details-back" to="/dashboard/org-admin/staff">← Back to Staff</Link>

      {noticeMessage && (
        <div
          className={noticeMessage.type === 'success' ? 'alert alert-success' : 'alert alert-error'}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          role="status"
        >
          <span>{noticeMessage.text}</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setNoticeMessage(null)}
            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      <header className="org-admin-staff-details-heading">
        <p className="org-admin-route-eyebrow">Staff Details</p>
        <h1>{staffName}</h1>
      </header>

      <article className="org-admin-staff-profile-card">
        <div className="org-admin-staff-profile-avatar" aria-hidden="true">
          {staffName.trim().charAt(0).toUpperCase() || '?'}
        </div>
        <div className="org-admin-staff-profile-info">
          <h2>{staffName}</h2>
          {staff.userId.email && <p>{staff.userId.email}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '0.4rem' }}>
            <span className="org-admin-staff-profile-role">{staffRole}</span>
            <span className={`org-admin-staff-status-badge ${isInactive ? 'status-inactive' : ''}`}>
              {isInactive ? 'Inactive' : 'Active'}
            </span>
          </div>
          <div style={{ marginTop: '0.85rem' }}>
            {isInactive ? (
              <button
                type="button"
                className="org-admin-staff-action-btn btn-reactivate"
                onClick={handleReactivate}
                disabled={actionLoading}
              >
                {actionLoading ? 'Reactivating...' : 'Reactivate Staff Member'}
              </button>
            ) : (
              <button
                type="button"
                className="org-admin-staff-action-btn btn-deactivate"
                onClick={handleDeactivate}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deactivating...' : 'Deactivate Staff Member'}
              </button>
            )}
          </div>
        </div>
      </article>

      <section className="org-admin-staff-assignments">
        <div className="org-admin-staff-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Work</p>
            <h2>Assignments</h2>
          </div>
        </div>

        {assignmentsError && <p className="org-admin-route-error" role="alert">{assignmentsError}</p>}
        {assignments.length === 0 && !assignmentsError ? (
          <p className="org-admin-staff-empty">No batch assignments are available for this staff member.</p>
        ) : (
          <div className="org-admin-staff-assignment-grid">
            {assignments.map((assignment) => {
              const startDate = formatDate(assignment.batch.startDate);
              const endDate = formatDate(assignment.batch.endDate);
              const supervisorId = getReferenceId(assignment.supervisingTrekLeaderId);
              const supervisor = supervisorId
                ? assignments.find((candidate) =>
                    candidate.batch._id === assignment.batch._id
                    && candidate.userId?._id === supervisorId
                  )
                : undefined;

              return (
                <article className="org-admin-staff-assignment-card" key={assignment._id}>
                  <span className="org-admin-staff-assignment-role">{assignment.roleInBatch}</span>
                  <h3>{assignment.batch.batchName || 'Batch'}</h3>
                  {assignment.tripName && <p className="org-admin-staff-assignment-trip">{assignment.tripName}</p>}
                  {(startDate || endDate) && (
                    <p className="org-admin-staff-assignment-dates">
                      {startDate || 'Date not set'}{endDate ? ` – ${endDate}` : ''}
                    </p>
                  )}
                  {supervisor?.userId?.fullName && (
                    <p className="org-admin-staff-assignment-supervisor">
                      Supervising Trek Leader: {supervisor.userId.fullName}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
