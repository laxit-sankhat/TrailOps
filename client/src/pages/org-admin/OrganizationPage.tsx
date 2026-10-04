import { useEffect, useState, useCallback } from 'react';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
  Info,
  Lock,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  User,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyOrgProfile, updateMyOrgProfile } from '../../services/organizationService';
import type { OrganizationProfile } from '../../types';
import './OrganizationPage.css';

function formatDate(value?: string): string {
  if (!value) return 'Not provided';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not provided';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export default function OrganizationPage() {
  const { user, isLoading: isAuthLoading } = useAuth();

  // Organization data state
  const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Copy ID feedback state
  const [copied, setCopied] = useState<boolean>(false);

  // Edit Modal state
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    contactEmail: '',
    registrationDetails: '',
    address: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>('');

  // 1. Fetch Organization Profile
  const fetchOrganization = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const res = await getMyOrgProfile();
      if (res.data.success && res.data.organization) {
        setOrganization(res.data.organization);
      }
    } catch (err: unknown) {
      console.error('Failed to load organization profile', err);
      let msg = 'Unable to retrieve organization profile.';
      if (isAxiosError<{ message?: string }>(err)) {
        if (err.response?.status === 403) {
          msg = 'No organization scope found for your account.';
        } else if (err.response?.status === 404) {
          msg = 'Organization record not found.';
        } else if (err.response?.data?.message) {
          msg = err.response.data.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user?.organizationId) {
      void fetchOrganization();
    } else if (!isAuthLoading && !user?.organizationId) {
      setLoading(false);
    }
  }, [user?.organizationId, isAuthLoading, fetchOrganization]);

  // Copy ID handler
  const handleCopyId = () => {
    const idToCopy = organization?._id || user?.organizationId;
    if (idToCopy) {
      void navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Open Edit Modal & populate form
  const handleOpenEdit = () => {
    if (!organization) return;
    setEditFormData({
      name: organization.name || '',
      contactEmail: organization.contactEmail || '',
      registrationDetails: organization.registrationDetails || '',
      address: organization.address || ''
    });
    setFieldErrors({});
    setEditError('');
    setIsEditOpen(true);
  };

  const handleCloseEdit = () => {
    if (editSubmitting) return;
    setIsEditOpen(false);
    setFieldErrors({});
    setEditError('');
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const trimmedName = editFormData.name.trim();
    const trimmedEmail = editFormData.contactEmail.trim();

    if (!trimmedName) {
      errors.name = 'Organization name is required.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Organization name cannot exceed 100 characters.';
    }

    if (!trimmedEmail) {
      errors.contactEmail = 'Contact email is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.contactEmail = 'Please provide a valid email address (e.g. info@org.org).';
    } else if (trimmedEmail.length > 150) {
      errors.contactEmail = 'Contact email cannot exceed 150 characters.';
    }

    if (editFormData.registrationDetails.trim().length > 1000) {
      errors.registrationDetails = 'Registration details cannot exceed 1000 characters.';
    }

    if (editFormData.address.trim().length > 300) {
      errors.address = 'Address cannot exceed 300 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || editSubmitting) return;

    setEditSubmitting(true);
    setEditError('');

    try {
      const payload = {
        name: editFormData.name.trim(),
        contactEmail: editFormData.contactEmail.trim().toLowerCase(),
        registrationDetails: editFormData.registrationDetails.trim(),
        address: editFormData.address.trim()
      };

      const res = await updateMyOrgProfile(payload);
      if (res.data.success && res.data.organization) {
        setOrganization(res.data.organization);
        setSuccessMessage('Organization profile updated successfully.');
        setIsEditOpen(false);

        // Auto-dismiss success notification
        setTimeout(() => {
          setSuccessMessage('');
        }, 4000);
      }
    } catch (err: unknown) {
      console.error('Failed to update organization profile', err);
      let msg = 'Failed to update organization profile.';
      if (isAxiosError<{ message?: string }>(err)) {
        if (err.response?.status === 409) {
          msg = 'Contact email is already in use by another organization.';
        } else if (err.response?.data?.message) {
          msg = err.response.data.message;
        }
      }
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Keyboard accessibility for modal
  useEffect(() => {
    if (!isEditOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !editSubmitting) {
        handleCloseEdit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditOpen, editSubmitting]);

  const roleFormatted =
    user?.role === 'OrgAdmin'
      ? 'Organization Administrator (OrgAdmin)'
      : user?.role || 'Staff';

  const orgStatus = organization?.status || 'Approved';

  return (
    <section className="org-admin-org-page">
      {/* 1. Page Header Row */}
      <div className="org-admin-org-header-row">
        <header className="org-admin-route-heading">
          <p className="org-admin-route-eyebrow">Organization</p>
          <h1>Organization Profile</h1>
          <p>Inspect and manage your verified organization workspace and operational details.</p>
        </header>

        <div className="org-admin-org-header-actions">
          <button
            type="button"
            className={`btn btn-secondary org-admin-org-refresh-btn ${refreshing ? 'is-refreshing' : ''}`}
            onClick={() => void fetchOrganization(true)}
            disabled={loading || refreshing}
            aria-label="Refresh organization profile"
          >
            <RefreshCw size={14} aria-hidden="true" />
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>

          {organization && (
            <button
              type="button"
              className="btn btn-primary org-admin-org-edit-trigger-btn"
              onClick={handleOpenEdit}
              aria-label="Edit Organization Profile"
            >
              <Edit3 size={15} aria-hidden="true" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="org-admin-org-banner org-admin-org-banner--success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{successMessage}</span>
          <button
            type="button"
            className="org-admin-org-banner-close"
            onClick={() => setSuccessMessage('')}
            aria-label="Close notification"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Global Error Alert with Retry */}
      {error && (
        <div className="org-admin-org-banner org-admin-org-banner--error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <div className="org-admin-org-banner-msg">
            <strong>Unable to Load Organization Profile</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void fetchOrganization()}
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Loading State */}
      {loading || isAuthLoading ? (
        <>
          <div className="skeleton-box skeleton-hero" aria-label="Loading organization hero" />
          <div className="org-admin-org-grid">
            <div className="skeleton-box skeleton-card" />
            <div className="skeleton-box skeleton-card" />
          </div>
        </>
      ) : !user?.organizationId ? (
        /* Empty / No Organization Scope State */
        <div className="org-admin-org-empty">
          <Building2 size={38} aria-hidden="true" />
          <h3>Organization Scope Unavailable</h3>
          <p>
            No organization scope is linked to your current authenticated account. Contact your
            platform administrator if you believe this is in error.
          </p>
        </div>
      ) : organization ? (
        <>
          {/* 3. Organization Profile Hero Card */}
          <article className="org-admin-org-hero" aria-label="Organization Profile Identity">
            <div className="org-admin-org-hero__identity">
              <div className="org-admin-org-avatar" aria-hidden="true">
                <Building2 size={28} />
              </div>
              <div className="org-admin-org-hero__info">
                <div className="org-admin-org-hero__title-row">
                  <h2 className="org-admin-org-hero__title">{organization.name}</h2>
                  <span
                    className={`org-admin-org-status-badge ${
                      orgStatus === 'Approved' ? 'status-active' : 'status-suspended'
                    }`}
                  >
                    {orgStatus === 'Approved' ? 'Approved Organization' : 'Suspended Organization'}
                  </span>
                </div>
                <p className="org-admin-org-hero__subtitle">
                  Authorized multi-tenant operational environment for field expeditions and team logistics.
                </p>
              </div>
            </div>

            <div className="org-admin-org-hero__actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm org-admin-org-hero-btn"
                onClick={handleOpenEdit}
              >
                <Edit3 size={14} aria-hidden="true" />
                <span>Edit Profile</span>
              </button>
            </div>
          </article>

          {/* 4. Two-Column Information Cards */}
          <div className="org-admin-org-grid">
            {/* Card 1: Organization Details (Authoritative Backend Data) */}
            <article className="org-admin-org-card" aria-labelledby="org-details-title">
              <div className="org-admin-org-card__header">
                <div className="org-admin-org-card__title-wrap">
                  <span className="org-admin-route-eyebrow">Organization Details</span>
                  <h3 id="org-details-title" className="org-admin-org-card__title">
                    Workspace Profile
                  </h3>
                </div>
                <Building2 size={18} className="org-admin-org-card__header-icon" aria-hidden="true" />
              </div>

              <div className="org-admin-org-datalist">
                {/* Organization Name */}
                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Organization Name</span>
                  <span className="org-admin-org-row__value">
                    <span>{organization.name}</span>
                  </span>
                </div>

                {/* Status */}
                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Organization Status</span>
                  <div className="org-admin-org-row__value">
                    <span
                      className={`org-admin-org-status-badge ${
                        orgStatus === 'Approved' ? 'status-active' : 'status-suspended'
                      }`}
                    >
                      {orgStatus === 'Approved' ? 'Approved' : 'Suspended'}
                    </span>
                  </div>
                </div>

                {/* Contact Email */}
                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Official Contact Email</span>
                  <span className="org-admin-org-row__value">
                    <Mail size={15} aria-hidden="true" />
                    <span>{organization.contactEmail || 'Not provided'}</span>
                  </span>
                </div>

                {/* Operating Address */}
                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Operating Address</span>
                  <span className="org-admin-org-row__value">
                    <MapPin size={15} aria-hidden="true" />
                    <span>{organization.address || 'Not provided'}</span>
                  </span>
                </div>

                {/* Registration Details */}
                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Registration Details</span>
                  <span className="org-admin-org-row__value">
                    <span>{organization.registrationDetails || 'Not provided'}</span>
                  </span>
                </div>

                {/* Established / Registration Date */}
                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Established Date</span>
                  <span className="org-admin-org-row__value">
                    <Calendar size={15} aria-hidden="true" />
                    <span>{formatDate(organization.createdAt)}</span>
                  </span>
                </div>

                {/* Organization Scope ID */}
                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Organization Scope ID</span>
                  <div className="org-admin-org-row__value">
                    <span className="org-admin-org-id-badge">{organization._id}</span>
                    <button
                      type="button"
                      className={`org-admin-org-copy-btn ${copied ? 'copied' : ''}`}
                      onClick={handleCopyId}
                      aria-label="Copy Organization Scope ID"
                      title="Copy Organization ID to clipboard"
                    >
                      {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                      <span>{copied ? 'Copied' : 'Copy ID'}</span>
                    </button>
                  </div>
                </div>

                {/* Security Isolation */}
                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Security Isolation</span>
                  <span className="org-admin-org-row__value">
                    <span>Enforced Server-Side Multi-Tenancy</span>
                  </span>
                </div>
              </div>

              <div className="org-admin-org-notice-box" role="note">
                <Info size={15} aria-hidden="true" />
                <span>
                  All operations, departures, bookings, staff rosters, equipment items, and analytics
                  are strictly isolated to this organization scope.
                </span>
              </div>
            </article>

            {/* Card 2: Administration & Account (from AuthContext) */}
            <article className="org-admin-org-card" aria-labelledby="admin-profile-title">
              <div className="org-admin-org-card__header">
                <div className="org-admin-org-card__title-wrap">
                  <span className="org-admin-route-eyebrow">Administration</span>
                  <h3 id="admin-profile-title" className="org-admin-org-card__title">
                    Administrator Account
                  </h3>
                </div>
                <ShieldCheck size={18} className="org-admin-org-card__header-icon" aria-hidden="true" />
              </div>

              <div className="org-admin-org-datalist">
                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Administrator Name</span>
                  <span className="org-admin-org-row__value">
                    <User size={15} aria-hidden="true" />
                    <span>{user.fullName || 'Organization Administrator'}</span>
                  </span>
                </div>

                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Account Email</span>
                  <span className="org-admin-org-row__value">
                    <Mail size={15} aria-hidden="true" />
                    <span>{user.email || '—'}</span>
                  </span>
                </div>

                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Current Role</span>
                  <span className="org-admin-org-row__value">
                    <ShieldCheck size={15} aria-hidden="true" />
                    <span>{roleFormatted}</span>
                  </span>
                </div>

                <div className="org-admin-org-row">
                  <span className="org-admin-org-row__label">Authorization Scope</span>
                  <span className="org-admin-org-row__value">
                    <Lock size={15} aria-hidden="true" />
                    <span>Full Organization Operations &amp; Field Oversight</span>
                  </span>
                </div>
              </div>

              <div className="org-admin-org-notice-box" role="note">
                <ShieldCheck size={15} aria-hidden="true" />
                <span>
                  Administrator identity and authentication sessions are verified cryptographically.
                  Account modifications must be requested through system administration.
                </span>
              </div>
            </article>
          </div>
        </>
      ) : null}

      {/* 5. Edit Organization Profile Modal */}
      {isEditOpen && organization && (
        <div
          className="org-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!editSubmitting) handleCloseEdit();
          }}
        >
          <section
            className="org-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="org-edit-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="org-modal-header">
              <div className="org-modal-header-text">
                <h2 id="org-edit-modal-title" className="org-modal-title">
                  Edit Organization Profile
                </h2>
                <p className="org-modal-desc">
                  Update contact information and operational details for your organization.
                </p>
              </div>
              <button
                type="button"
                className="org-modal-close-btn"
                onClick={handleCloseEdit}
                disabled={editSubmitting}
                aria-label="Close edit dialog"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Modal Error Banner */}
            {editError && (
              <div className="org-modal-alert org-modal-alert--error" role="alert">
                <AlertCircle size={17} aria-hidden="true" />
                <span>{editError}</span>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleEditSubmit} className="org-modal-form" noValidate>
              {/* Organization Name Field */}
              <div className="org-form-group">
                <label htmlFor="edit-org-name" className="org-form-label">
                  Organization Name <span className="org-form-required">*</span>
                </label>
                <input
                  id="edit-org-name"
                  type="text"
                  className={`org-form-input ${fieldErrors.name ? 'is-invalid' : ''}`}
                  placeholder="e.g. Alpine Expeditions Society"
                  value={editFormData.name}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, name: e.target.value }));
                    if (fieldErrors.name) {
                      setFieldErrors((prev) => ({ ...prev, name: '' }));
                    }
                  }}
                  maxLength={100}
                  disabled={editSubmitting}
                  required
                />
                {fieldErrors.name ? (
                  <p className="org-form-error" role="alert">{fieldErrors.name}</p>
                ) : (
                  <span className="org-form-hint">Maximum 100 characters.</span>
                )}
              </div>

              {/* Contact Email Field */}
              <div className="org-form-group">
                <label htmlFor="edit-org-email" className="org-form-label">
                  Official Contact Email <span className="org-form-required">*</span>
                </label>
                <input
                  id="edit-org-email"
                  type="email"
                  className={`org-form-input ${fieldErrors.contactEmail ? 'is-invalid' : ''}`}
                  placeholder="e.g. contact@alpineexpeditions.org"
                  value={editFormData.contactEmail}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, contactEmail: e.target.value }));
                    if (fieldErrors.contactEmail) {
                      setFieldErrors((prev) => ({ ...prev, contactEmail: '' }));
                    }
                  }}
                  maxLength={150}
                  disabled={editSubmitting}
                  required
                />
                {fieldErrors.contactEmail ? (
                  <p className="org-form-error" role="alert">{fieldErrors.contactEmail}</p>
                ) : (
                  <span className="org-form-hint">Used for primary communications and organization identity.</span>
                )}
              </div>

              {/* Operating Address Field */}
              <div className="org-form-group">
                <label htmlFor="edit-org-address" className="org-form-label">
                  Operating Address <span className="org-form-optional">(optional)</span>
                </label>
                <textarea
                  id="edit-org-address"
                  className={`org-form-textarea ${fieldErrors.address ? 'is-invalid' : ''}`}
                  placeholder="e.g. 104 Alpine Vista, Old Manali, Himachal Pradesh, India"
                  value={editFormData.address}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, address: e.target.value }));
                    if (fieldErrors.address) {
                      setFieldErrors((prev) => ({ ...prev, address: '' }));
                    }
                  }}
                  maxLength={300}
                  rows={2}
                  disabled={editSubmitting}
                />
                {fieldErrors.address ? (
                  <p className="org-form-error" role="alert">{fieldErrors.address}</p>
                ) : (
                  <div className="org-form-hint-row">
                    <span>Field office or registered headquarters.</span>
                    <span>{editFormData.address.length} / 300</span>
                  </div>
                )}
              </div>

              {/* Registration Details Field */}
              <div className="org-form-group">
                <label htmlFor="edit-org-reg" className="org-form-label">
                  Registration Details <span className="org-form-optional">(optional)</span>
                </label>
                <textarea
                  id="edit-org-reg"
                  className={`org-form-textarea ${fieldErrors.registrationDetails ? 'is-invalid' : ''}`}
                  placeholder="e.g. Registered Trust #TR/2022/8821, Ministry of Tourism recognized..."
                  value={editFormData.registrationDetails}
                  onChange={(e) => {
                    setEditFormData((prev) => ({ ...prev, registrationDetails: e.target.value }));
                    if (fieldErrors.registrationDetails) {
                      setFieldErrors((prev) => ({ ...prev, registrationDetails: '' }));
                    }
                  }}
                  maxLength={1000}
                  rows={3}
                  disabled={editSubmitting}
                />
                {fieldErrors.registrationDetails ? (
                  <p className="org-form-error" role="alert">{fieldErrors.registrationDetails}</p>
                ) : (
                  <div className="org-form-hint-row">
                    <span>Non-profit, society, or corporate registration numbers.</span>
                    <span>{editFormData.registrationDetails.length} / 1000</span>
                  </div>
                )}
              </div>

              {/* Read-Only Invariants Notice */}
              <div className="org-modal-readonly-strip">
                <div className="org-modal-readonly-item">
                  <span className="org-modal-readonly-label">Status</span>
                  <span className="org-modal-readonly-val">{orgStatus}</span>
                </div>
                <div className="org-modal-readonly-item">
                  <span className="org-modal-readonly-label">Organization Scope ID</span>
                  <span className="org-modal-readonly-val org-modal-readonly-id">
                    {organization._id}
                  </span>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="org-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary org-modal-btn"
                  onClick={handleCloseEdit}
                  disabled={editSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary org-modal-btn"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Saving Changes…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
