import { useEffect, useState, useMemo } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Compass,
  Mail,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users
} from 'lucide-react';
import { createStaffMember, getMyOrgStaff, removeStaffMember, reactivateStaffMember } from '../../services/staffService';
import { createBatchAssignment, getAssignmentsForBatch } from '../../services/batchAssignmentService';
import { getMyOrgBatches } from '../../services/batchService';
import type { OrganizationStaffSummary } from '../../types';
import './StaffPage.css';

type StaffMember = OrganizationStaffSummary & {
  status?: string;
  userId: OrganizationStaffSummary['userId'] & { email?: string };
};

type BatchOption = {
  _id: string;
  batchName: string;
};

type SupervisingLeader = {
  _id: string;
  userId: { _id: string; fullName: string } | null;
};

function formatRoleName(role?: string): string {
  switch (role) {
    case 'TrekLeader':
      return 'Trek Leader';
    case 'MedicalOfficer':
      return 'Medical Officer';
    case 'Volunteer':
      return 'Volunteer';
    case 'TripCoordinator':
      return 'Trip Coordinator';
    default:
      return role || 'Staff';
  }
}

export default function StaffPage() {
  const location = useLocation();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add staff member form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [staffMessage, setStaffMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Staff deactivation/reactivation state
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Assign staff to batch form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [assignForm, setAssignForm] = useState({
    batchId: '',
    userId: '',
    roleInBatch: 'TrekLeader',
    supervisingTrekLeaderId: ''
  });
  const [assignMessage, setAssignMessage] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [supervisingTrekLeaders, setSupervisingTrekLeaders] = useState<SupervisingLeader[]>([]);

  useEffect(() => {
    if (location.hash === '#create-staff') {
      setShowCreateForm(true);
    }
    if (location.hash === '#assign-staff') {
      setShowAssignForm(true);
    }
  }, [location.hash]);

  const fetchStaff = async () => {
    try {
      const response = await getMyOrgStaff();
      setStaff(
        (response.data.staff || []).filter(
          (member: StaffMember) => (member.role || member.userId?.role) !== 'OrgAdmin'
        )
      );
      setError('');
    } catch (err) {
      console.error(err);
      setError(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Unable to load staff.'
          : 'Unable to load staff.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStaff();
  }, []);

  // Fetch batches when assign form is opened
  useEffect(() => {
    if (showAssignForm && batches.length === 0) {
      getMyOrgBatches()
        .then((res) => {
          setBatches(res.data.batches || []);
        })
        .catch((err) => console.error('Failed to load batches for assignment', err));
    }
  }, [showAssignForm, batches.length]);

  // Handle assignment batch change and fetch supervising leaders
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

  const handleRoleInBatchChange = (newRole: string) => {
    const currentMember = staff.find((m) => m.userId?._id === assignForm.userId);
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
        supervisingTrekLeaderId:
          assignForm.roleInBatch === 'Volunteer'
            ? assignForm.supervisingTrekLeaderId || undefined
            : undefined
      };
      await createBatchAssignment(payload);
      setAssignMessage('Staff assigned to batch successfully');
      setAssignForm({ batchId: '', userId: '', roleInBatch: 'TrekLeader', supervisingTrekLeaderId: '' });
      setShowAssignForm(false);
    } catch (err: any) {
      setAssignMessage(err.response?.data?.message || 'Something went wrong assigning staff');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Handle staff deactivation
  const handleDeactivate = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}? They will lose access to organization departures and field operations.`)) {
      return;
    }
    setActionUserId(userId);
    setStatusNotice(null);
    try {
      await removeStaffMember(userId);
      setStatusNotice({ type: 'success', text: `${name} has been deactivated successfully.` });
      await fetchStaff();
    } catch (err) {
      console.error(err);
      setStatusNotice({
        type: 'error',
        text: isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || `Failed to deactivate ${name}.`
          : `Failed to deactivate ${name}.`
      });
    } finally {
      setActionUserId(null);
    }
  };

  // Handle staff reactivation
  const handleReactivate = async (userId: string, name: string) => {
    setActionUserId(userId);
    setStatusNotice(null);
    try {
      await reactivateStaffMember(userId);
      setStatusNotice({ type: 'success', text: `${name} has been reactivated successfully.` });
      await fetchStaff();
    } catch (err) {
      console.error(err);
      setStatusNotice({
        type: 'error',
        text: isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || `Failed to reactivate ${name}.`
          : `Failed to reactivate ${name}.`
      });
    } finally {
      setActionUserId(null);
    }
  };

  // Staff creation form submit
  const handleStaffSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStaffMessage('');
    const formElement = e.currentTarget;
    const formData = new FormData(formElement);

    setSubmitting(true);
    try {
      await createStaffMember({
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role')
      });
      setStaffMessage('Staff member created successfully');
      formElement.reset();
      await fetchStaff();
      setShowCreateForm(false);
    } catch (err: any) {
      setStaffMessage(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // KPI Calculations
  const staffCounts = useMemo(() => {
    const activeStaff = staff.filter((m) => m.status !== 'Inactive');
    const trekLeaders = activeStaff.filter((m) => (m.role || m.userId?.role) === 'TrekLeader').length;
    const medicalOfficers = activeStaff.filter((m) => (m.role || m.userId?.role) === 'MedicalOfficer').length;
    const volunteers = activeStaff.filter((m) => (m.role || m.userId?.role) === 'Volunteer').length;
    const tripCoordinators = activeStaff.filter((m) => (m.role || m.userId?.role) === 'TripCoordinator').length;
    return {
      total: activeStaff.length,
      trekLeaders,
      medicalOfficers,
      volunteers,
      tripCoordinators
    };
  }, [staff]);

  // Role Grouping
  const trekLeaders = useMemo(
    () => staff.filter((m) => (m.role || m.userId?.role) === 'TrekLeader'),
    [staff]
  );
  const medicalOfficers = useMemo(
    () => staff.filter((m) => (m.role || m.userId?.role) === 'MedicalOfficer'),
    [staff]
  );
  const volunteers = useMemo(
    () => staff.filter((m) => (m.role || m.userId?.role) === 'Volunteer'),
    [staff]
  );
  const tripCoordinators = useMemo(
    () => staff.filter((m) => (m.role || m.userId?.role) === 'TripCoordinator'),
    [staff]
  );
  const otherStaff = useMemo(
    () =>
      staff.filter(
        (m) =>
          !['TrekLeader', 'MedicalOfficer', 'Volunteer', 'TripCoordinator'].includes(
            m.role || m.userId?.role || ''
          )
      ),
    [staff]
  );

  const renderStaffCard = (member: StaffMember) => {
    const staffUser = member.userId;
    if (!staffUser) return null;

    const isInactive = member.status === 'Inactive';
    const role = member.role || staffUser.role || 'Staff';
    const roleClass = role.toLowerCase().replace(/\s+/g, '-');
    const initials = staffUser.fullName
      ? staffUser.fullName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : '?';

    return (
      <article className="org-admin-staff-card" key={staffUser._id}>
        <div className="org-admin-staff-card__header">
          <div className={`org-admin-staff-avatar role-${roleClass}`} aria-hidden="true">
            {initials}
          </div>
          <div className="org-admin-staff-card__identity">
            <h3 className="org-admin-staff-name">{staffUser.fullName || 'Staff Member'}</h3>
            {staffUser.email && (
              <span className="org-admin-staff-email">
                <Mail size={12} aria-hidden="true" />
                <span>{staffUser.email}</span>
              </span>
            )}
          </div>
        </div>

        <div className="org-admin-staff-card__meta">
          <span className={`org-admin-staff-role-badge role-badge-${roleClass}`}>
            {formatRoleName(role)}
          </span>
          <span className={`org-admin-staff-status-badge ${isInactive ? 'status-inactive' : ''}`}>
            {isInactive ? 'Inactive' : 'Active'}
          </span>
        </div>

        <div className="org-admin-staff-card__footer">
          <Link
            to={`/dashboard/org-admin/staff/${staffUser._id}`}
            className="org-admin-staff-view-btn"
            aria-label={`View profile and assignments for ${staffUser.fullName}`}
          >
            <span>View Profile</span>
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
          {isInactive ? (
            <button
              type="button"
              className="org-admin-staff-action-btn btn-reactivate"
              onClick={() => handleReactivate(staffUser._id, staffUser.fullName || 'Staff member')}
              disabled={actionUserId === staffUser._id}
              title="Reactivate staff member"
            >
              {actionUserId === staffUser._id ? 'Reactivating...' : 'Reactivate'}
            </button>
          ) : (
            <button
              type="button"
              className="org-admin-staff-action-btn btn-deactivate"
              onClick={() => handleDeactivate(staffUser._id, staffUser.fullName || 'Staff member')}
              disabled={actionUserId === staffUser._id}
              title="Deactivate staff member"
            >
              {actionUserId === staffUser._id ? 'Deactivating...' : 'Deactivate'}
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <section className="org-admin-staff-page">
      {statusNotice && (
        <div
          className={statusNotice.type === 'success' ? 'alert alert-success' : 'alert alert-error'}
          style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          role="status"
        >
          <span>{statusNotice.text}</span>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setStatusNotice(null)}
            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="org-admin-staff-header-row">
        <header className="org-admin-route-heading">
          <p className="org-admin-route-eyebrow">Organization</p>
          <h1>Staff</h1>
          <p>Manage your organization's operations and field team.</p>
        </header>

        {/* Primary Actions */}
        <div className="org-admin-route-actions org-admin-staff-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowAssignForm((prev) => !prev);
              if (showCreateForm) setShowCreateForm(false);
            }}
          >
            <UserCheck size={16} aria-hidden="true" />
            <span>{showAssignForm ? 'Close Assignment' : '+ Assign Staff'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              if (showAssignForm) setShowAssignForm(false);
            }}
          >
            <UserPlus size={16} aria-hidden="true" />
            <span>{showCreateForm ? 'Close Form' : '+ Add Staff Member'}</span>
          </button>
        </div>
      </div>

      {/* Assign Staff to Batch Drawer/Form */}
      {showAssignForm && (
        <div className="card org-admin-page-form-card" id="assign-staff">
          <h2>Assign Staff to Batch</h2>
          <p className="org-admin-form-subtitle">Deploy verified field staff to an upcoming trek departure.</p>
          <form onSubmit={handleAssignSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="assign-batch">Batch</label>
                <select
                  id="assign-batch"
                  name="batchId"
                  value={assignForm.batchId}
                  onChange={(e) => handleAssignmentBatchChange(e.target.value)}
                  required
                >
                  <option value="">Select a Batch</option>
                  {batches.map((batch) => (
                    <option key={batch._id} value={batch._id}>
                      {batch.batchName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="assign-role">Role in Batch</label>
                <select
                  id="assign-role"
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
                <label htmlFor="assign-user">Staff Member</label>
                <select
                  id="assign-user"
                  name="userId"
                  value={assignForm.userId}
                  onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                  required
                >
                  <option value="">Select Staff Member</option>
                  {staff
                    .filter((member) => member.status !== 'Inactive')
                    .filter((member) => {
                      const role = member.role || member.userId?.role;
                      return role === assignForm.roleInBatch;
                    })
                    .map((member) => {
                      const u = member.userId;
                      return u ? (
                        <option key={u._id} value={u._id}>
                          {u.fullName || 'Staff'} ({formatRoleName(member.role || u.role)})
                        </option>
                      ) : null;
                    })}
                </select>
                {staff.filter((m) => m.status !== 'Inactive' && (m.role || m.userId?.role) === assignForm.roleInBatch).length === 0 && (
                  <p className="field-hint" style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    No active {formatRoleName(assignForm.roleInBatch)} staff members found in your organization.
                  </p>
                )}
              </div>
              {assignForm.roleInBatch === 'Volunteer' && (
                <div className="form-group">
                  <label htmlFor="assign-supervisor">Supervising Trek Leader (Volunteer only)</label>
                  <select
                    id="assign-supervisor"
                    name="supervisingTrekLeaderId"
                    value={assignForm.supervisingTrekLeaderId}
                    onChange={(e) => setAssignForm({ ...assignForm, supervisingTrekLeaderId: e.target.value })}
                    disabled={!assignForm.batchId}
                    required
                  >
                    <option value="">Select a Trek Leader</option>
                    {supervisingTrekLeaders.map(
                      (assignment) =>
                        assignment.userId && (
                          <option key={assignment._id} value={assignment.userId._id}>
                            {assignment.userId.fullName}
                          </option>
                        )
                    )}
                  </select>
                </div>
              )}
            </div>
            <div className="org-admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={assignSubmitting}>
                {assignSubmitting ? 'Assigning...' : 'Assign to Batch'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAssignForm(false)}>
                Cancel
              </button>
            </div>
          </form>
          {assignMessage && (
            <p
              className={assignMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}
              style={{ marginTop: '1rem' }}
            >
              {assignMessage}
            </p>
          )}
        </div>
      )}

      {/* Add Staff Member Form */}
      {showCreateForm && (
        <div className="card org-admin-page-form-card" id="create-staff">
          <h2>Add Staff Member</h2>
          <p className="org-admin-form-subtitle">Create login credentials and assign operational role for new staff.</p>
          <form onSubmit={handleStaffSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="staff-name">Full Name</label>
                <input id="staff-name" name="fullName" placeholder="e.g. Maya Sharma" required />
              </div>
              <div className="form-group">
                <label htmlFor="staff-email">Email</label>
                <input id="staff-email" name="email" type="email" placeholder="staff@example.com" required />
              </div>
              <div className="form-group">
                <label htmlFor="staff-password">Password</label>
                <input id="staff-password" name="password" type="password" placeholder="Create password" required />
              </div>
              <div className="form-group">
                <label htmlFor="staff-role">Role</label>
                <select id="staff-role" name="role" defaultValue="TripCoordinator" required>
                  <option value="TripCoordinator">Trip Coordinator</option>
                  <option value="MedicalOfficer">Medical Officer</option>
                  <option value="TrekLeader">Trek Leader</option>
                  <option value="Volunteer">Volunteer</option>
                </select>
              </div>
            </div>
            <div className="org-admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Staff Member'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>
          {staffMessage && (
            <p
              className={staffMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}
              style={{ marginTop: '1rem' }}
            >
              {staffMessage}
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          className="org-admin-route-error"
          role="alert"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}
        >
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void fetchStaff()}>
            Retry
          </button>
        </div>
      )}

      {/* 2. Staff KPI Summary */}
      {loading ? (
        <section className="org-admin-staff-kpi-grid" aria-label="Loading staff metrics">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="org-admin-staff-kpi-card org-admin-staff-kpi-card--skeleton">
              <div className="skeleton-box skeleton-kpi-label" />
              <div className="skeleton-box skeleton-kpi-value" />
              <div className="skeleton-box skeleton-kpi-sub" />
            </div>
          ))}
        </section>
      ) : (
        <section className="org-admin-staff-kpi-grid" aria-label="Staff Metrics Overview">
          <div className="org-admin-staff-kpi-card">
            <span className="org-admin-staff-kpi-label">Total Staff</span>
            <div className="org-admin-staff-kpi-value-row">
              <strong className="org-admin-staff-kpi-value">{staffCounts.total}</strong>
              <Users size={18} className="org-admin-staff-kpi-icon" aria-hidden="true" />
            </div>
            <span className="org-admin-staff-kpi-sub">Active team members</span>
          </div>

          <div className="org-admin-staff-kpi-card">
            <span className="org-admin-staff-kpi-label">Trek Leaders</span>
            <div className="org-admin-staff-kpi-value-row">
              <strong className="org-admin-staff-kpi-value">{staffCounts.trekLeaders}</strong>
              <Compass size={18} className="org-admin-staff-kpi-icon role-icon-leader" aria-hidden="true" />
            </div>
            <span className="org-admin-staff-kpi-sub">Expedition field leads</span>
          </div>

          <div className="org-admin-staff-kpi-card">
            <span className="org-admin-staff-kpi-label">Medical Officers</span>
            <div className="org-admin-staff-kpi-value-row">
              <strong className="org-admin-staff-kpi-value">{staffCounts.medicalOfficers}</strong>
              <Stethoscope size={18} className="org-admin-staff-kpi-icon role-icon-medic" aria-hidden="true" />
            </div>
            <span className="org-admin-staff-kpi-sub">Wilderness medics</span>
          </div>

          <div className="org-admin-staff-kpi-card">
            <span className="org-admin-staff-kpi-label">Volunteers</span>
            <div className="org-admin-staff-kpi-value-row">
              <strong className="org-admin-staff-kpi-value">{staffCounts.volunteers}</strong>
              <Award size={18} className="org-admin-staff-kpi-icon role-icon-volunteer" aria-hidden="true" />
            </div>
            <span className="org-admin-staff-kpi-sub">Trail &amp; camp support</span>
          </div>

          <div className="org-admin-staff-kpi-card">
            <span className="org-admin-staff-kpi-label">Trip Coordinators</span>
            <div className="org-admin-staff-kpi-value-row">
              <strong className="org-admin-staff-kpi-value">{staffCounts.tripCoordinators}</strong>
              <ShieldCheck size={18} className="org-admin-staff-kpi-icon role-icon-coordinator" aria-hidden="true" />
            </div>
            <span className="org-admin-staff-kpi-sub">Logistics &amp; planning</span>
          </div>
        </section>
      )}

      {/* 3. Staff Directory by Role */}
      {loading ? (
        <div className="org-admin-staff-loading-grid" aria-label="Loading staff directory">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="org-admin-staff-card org-admin-staff-card--skeleton" aria-hidden="true">
              <div className="skeleton-staff-header">
                <div className="skeleton-box skeleton-avatar" />
                <div className="skeleton-staff-id">
                  <div className="skeleton-box skeleton-name" />
                  <div className="skeleton-box skeleton-email" />
                </div>
              </div>
              <div className="skeleton-box skeleton-badge" />
              <div className="skeleton-box skeleton-btn" />
            </div>
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="org-admin-staff-empty-card">
          <Users size={42} aria-hidden="true" />
          <h3>No staff members found</h3>
          <p>Add staff members to your organization to begin assigning field leaders and medical officers to departures.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + Add Staff Member
          </button>
        </div>
      ) : (
        <div className="org-admin-staff-sections">
          {/* Trek Leaders Section */}
          {trekLeaders.length > 0 && (
            <section className="org-admin-staff-section" aria-labelledby="trek-leaders-heading">
              <div className="org-admin-staff-section-header">
                <div className="org-admin-staff-section-title-wrap">
                  <Compass size={18} className="role-icon-leader" aria-hidden="true" />
                  <h2 id="trek-leaders-heading" className="org-admin-staff-section-title">
                    Trek Leaders
                  </h2>
                  <span className="org-admin-staff-section-count">{trekLeaders.length}</span>
                </div>
                <p className="org-admin-staff-section-desc">Certified field expedition leads and route directors.</p>
              </div>

              <div className="org-admin-staff-grid">
                {trekLeaders.map(renderStaffCard)}
              </div>
            </section>
          )}

          {/* Medical Officers Section */}
          {medicalOfficers.length > 0 && (
            <section className="org-admin-staff-section" aria-labelledby="medical-officers-heading">
              <div className="org-admin-staff-section-header">
                <div className="org-admin-staff-section-title-wrap">
                  <Stethoscope size={18} className="role-icon-medic" aria-hidden="true" />
                  <h2 id="medical-officers-heading" className="org-admin-staff-section-title">
                    Medical Officers
                  </h2>
                  <span className="org-admin-staff-section-count">{medicalOfficers.length}</span>
                </div>
                <p className="org-admin-staff-section-desc">Wilderness first aid officers and emergency medical staff.</p>
              </div>

              <div className="org-admin-staff-grid">
                {medicalOfficers.map(renderStaffCard)}
              </div>
            </section>
          )}

          {/* Volunteers Section */}
          {volunteers.length > 0 && (
            <section className="org-admin-staff-section" aria-labelledby="volunteers-heading">
              <div className="org-admin-staff-section-header">
                <div className="org-admin-staff-section-title-wrap">
                  <Award size={18} className="role-icon-volunteer" aria-hidden="true" />
                  <h2 id="volunteers-heading" className="org-admin-staff-section-title">
                    Volunteers
                  </h2>
                  <span className="org-admin-staff-section-count">{volunteers.length}</span>
                </div>
                <p className="org-admin-staff-section-desc">Supervised trail assistants, base camp coordinators, and logistics aides.</p>
              </div>

              <div className="org-admin-staff-grid">
                {volunteers.map(renderStaffCard)}
              </div>
            </section>
          )}

          {/* Trip Coordinators Section */}
          {tripCoordinators.length > 0 && (
            <section className="org-admin-staff-section" aria-labelledby="coordinators-heading">
              <div className="org-admin-staff-section-header">
                <div className="org-admin-staff-section-title-wrap">
                  <ShieldCheck size={18} className="role-icon-coordinator" aria-hidden="true" />
                  <h2 id="coordinators-heading" className="org-admin-staff-section-title">
                    Trip Coordinators
                  </h2>
                  <span className="org-admin-staff-section-count">{tripCoordinators.length}</span>
                </div>
                <p className="org-admin-staff-section-desc">Operations planners and trip program managers.</p>
              </div>

              <div className="org-admin-staff-grid">
                {tripCoordinators.map(renderStaffCard)}
              </div>
            </section>
          )}

          {/* Other Staff Section (if any uncategorized roles exist) */}
          {otherStaff.length > 0 && (
            <section className="org-admin-staff-section" aria-labelledby="other-staff-heading">
              <div className="org-admin-staff-section-header">
                <div className="org-admin-staff-section-title-wrap">
                  <Users size={18} aria-hidden="true" />
                  <h2 id="other-staff-heading" className="org-admin-staff-section-title">
                    Additional Staff
                  </h2>
                  <span className="org-admin-staff-section-count">{otherStaff.length}</span>
                </div>
                <p className="org-admin-staff-section-desc">Other personnel and operational team members.</p>
              </div>

              <div className="org-admin-staff-grid">
                {otherStaff.map(renderStaffCard)}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
