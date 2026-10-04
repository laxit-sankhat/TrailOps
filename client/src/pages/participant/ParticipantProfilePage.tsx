import { useEffect, useMemo, useState, useCallback } from 'react';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  Sparkles,
  User
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import {
  getMyProfile,
  updateMyProfile,
  type UpdateUserProfilePayload,
  type UserProfile
} from '../../services/userService';
import './ParticipantProfilePage.css';

interface ProfileFormState {
  fullName: string;
  mobileNumber: string;
  address: string;
  dob: string;
  profilePicture: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
}

const INITIAL_FORM: ProfileFormState = {
  fullName: '',
  mobileNumber: '',
  address: '',
  dob: '',
  profilePicture: '',
  emergencyName: '',
  emergencyRelation: '',
  emergencyPhone: ''
};

function profileToForm(profile: UserProfile): ProfileFormState {
  let dobString = '';
  if (profile.dob) {
    const d = new Date(profile.dob);
    if (!Number.isNaN(d.getTime())) {
      dobString = d.toISOString().split('T')[0];
    }
  }

  return {
    fullName: profile.fullName || '',
    mobileNumber: profile.mobileNumber || '',
    address: profile.address || '',
    dob: dobString,
    profilePicture: profile.profilePicture || '',
    emergencyName: profile.emergencyContact?.name || '',
    emergencyRelation: profile.emergencyContact?.relation || '',
    emergencyPhone: profile.emergencyContact?.phone || ''
  };
}

function getInitials(name: string): string {
  if (!name.trim()) return 'P';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : fallback;
}

export default function ParticipantProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  // Load profile on mount or retry
  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    setFetchError('');
    try {
      const response = await getMyProfile();
      const user = response.data.user;
      setProfile(user);
      setForm(profileToForm(user));
      setAvatarLoadError(false);
    } catch (err) {
      console.error(err);
      setFetchError(getApiErrorMessage(err, 'Unable to load profile. Please check your connection.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfileData();
  }, [fetchProfileData]);

  // Check if form has unsaved modifications
  const isDirty = useMemo(() => {
    if (!profile) return false;
    const base = profileToForm(profile);
    return (
      form.fullName !== base.fullName ||
      form.mobileNumber !== base.mobileNumber ||
      form.address !== base.address ||
      form.dob !== base.dob ||
      form.profilePicture !== base.profilePicture ||
      form.emergencyName !== base.emergencyName ||
      form.emergencyRelation !== base.emergencyRelation ||
      form.emergencyPhone !== base.emergencyPhone
    );
  }, [form, profile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'profilePicture') {
      setAvatarLoadError(false);
    }
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleReset = () => {
    if (!profile) return;
    setForm(profileToForm(profile));
    setValidationErrors({});
    setStatusMessage(null);
    setAvatarLoadError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !isDirty) return;
    setStatusMessage(null);

    // Validation
    const errors: Record<string, string> = {};
    if (!form.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    // Payload restricted strictly to allowed fields
    const payload: UpdateUserProfilePayload = {
      fullName: form.fullName.trim(),
      mobileNumber: form.mobileNumber.trim(),
      address: form.address.trim(),
      dob: form.dob ? new Date(form.dob).toISOString() : null,
      profilePicture: form.profilePicture.trim(),
      emergencyContact: {
        name: form.emergencyName.trim(),
        relation: form.emergencyRelation.trim(),
        phone: form.emergencyPhone.trim()
      }
    };

    setSaving(true);
    try {
      const response = await updateMyProfile(payload);
      const updatedUser = response.data.user;
      setProfile(updatedUser);
      setForm(profileToForm(updatedUser));
      setStatusMessage({
        type: 'success',
        text: 'Profile updated successfully.'
      });
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: getApiErrorMessage(err, 'Unable to save profile changes. Please try again.')
      });
    } finally {
      setSaving(false);
    }
  };

  const previewAvatarUrl = form.profilePicture.trim();

  return (
    <div className="pp-page">
      <Navbar />

      <main className="pp-main">
        <div className="pp-container">
          {/* 1. Page Header Hierarchy */}
          <header className="pp-header">
            <div className="pp-header-content">
              <p className="pp-eyebrow">ACCOUNT</p>
              <h1 className="pp-title">Your Profile</h1>
              <p className="pp-subtitle">
                Manage your personal information and account details.
              </p>
            </div>
          </header>

          {/* 2. Loading, Error, or Profile Form */}
          {loading ? (
            <div className="pp-panel pp-loading-state" role="status">
              <LoaderCircle size={32} className="pp-spin pp-loading-icon" aria-hidden="true" />
              <p className="pp-loading-title">Loading Profile</p>
              <p className="pp-loading-desc">Retrieving your personal details and account information…</p>
            </div>
          ) : fetchError ? (
            <div className="pp-panel pp-error-state" role="alert">
              <AlertCircle size={34} className="pp-error-icon" aria-hidden="true" />
              <div className="pp-error-content">
                <h2 className="pp-error-title">Unable to Load Profile</h2>
                <p className="pp-error-desc">{fetchError}</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void fetchProfileData()}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>Retry Loading</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="pp-form" noValidate>
              {/* Alert Status Banner */}
              {statusMessage && (
                <div
                  className={`pp-banner pp-banner--${statusMessage.type}`}
                  role={statusMessage.type === 'error' ? 'alert' : 'status'}
                >
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 size={18} className="pp-banner-icon" aria-hidden="true" />
                  ) : (
                    <AlertCircle size={18} className="pp-banner-icon" aria-hidden="true" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* 2. Profile Hero Card */}
              <section className="pp-panel pp-hero-card" aria-label="Profile identity overview">
                <div className="pp-hero-avatar-wrap">
                  {previewAvatarUrl && !avatarLoadError ? (
                    <img
                      src={previewAvatarUrl}
                      alt={form.fullName || 'User Avatar'}
                      className="pp-hero-avatar-img"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <div className="pp-hero-avatar-fallback" aria-hidden="true">
                      {getInitials(form.fullName || profile?.fullName || 'Participant')}
                    </div>
                  )}
                </div>

                <div className="pp-hero-meta">
                  <div className="pp-hero-name-row">
                    <h2 className="pp-hero-name">{form.fullName || profile?.fullName || 'Your Name'}</h2>
                    <span className="pp-badge pp-badge--role">
                      <Sparkles size={12} aria-hidden="true" />
                      <span>{profile?.role || 'Participant'}</span>
                    </span>
                  </div>

                  <p className="pp-hero-email">
                    <Mail size={14} aria-hidden="true" />
                    <span>{profile?.email}</span>
                  </p>

                  <p className="pp-hero-hint">
                    Update your personal contact details, residential address, and expedition emergency contact below.
                  </p>
                </div>
              </section>

              {/* Responsive Layout: Main Edit Column + Sidebar/Overview Column */}
              <div className="pp-content-layout">
                {/* Primary Column */}
                <div className="pp-main-column">
                  {/* 3. Personal Information Card */}
                  <section className="pp-panel" aria-labelledby="personal-info-heading">
                    <div className="pp-section-header">
                      <div className="pp-section-icon-wrap" aria-hidden="true">
                        <User size={18} />
                      </div>
                      <div>
                        <h2 id="personal-info-heading" className="pp-section-title">Personal Information</h2>
                        <p className="pp-section-desc">Your basic identity and primary contact details for trekking operations.</p>
                      </div>
                    </div>

                    <div className="pp-grid pp-grid--2">
                      {/* Full Name */}
                      <div className="pp-form-group">
                        <label htmlFor="fullName" className="pp-label">
                          <span>Full Name</span>
                          <span className="pp-required" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          className={`pp-input ${validationErrors.fullName ? 'pp-input--error' : ''}`}
                          value={form.fullName}
                          onChange={handleChange}
                          placeholder="e.g. Jane Doe"
                          disabled={saving}
                          required
                          aria-invalid={Boolean(validationErrors.fullName)}
                          aria-describedby={validationErrors.fullName ? 'fullName-error' : undefined}
                        />
                        {validationErrors.fullName && (
                          <span id="fullName-error" className="pp-field-error" role="alert">
                            {validationErrors.fullName}
                          </span>
                        )}
                      </div>

                      {/* Mobile Number */}
                      <div className="pp-form-group">
                        <label htmlFor="mobileNumber" className="pp-label">
                          <span>Mobile Number</span>
                        </label>
                        <div className="pp-input-icon-wrap">
                          <Phone size={15} className="pp-input-icon" aria-hidden="true" />
                          <input
                            id="mobileNumber"
                            name="mobileNumber"
                            type="tel"
                            className="pp-input pp-input--has-icon"
                            value={form.mobileNumber}
                            onChange={handleChange}
                            placeholder="e.g. +91 98765 43210"
                            disabled={saving}
                          />
                        </div>
                      </div>

                      {/* Date of Birth */}
                      <div className="pp-form-group">
                        <label htmlFor="dob" className="pp-label">
                          <span>Date of Birth</span>
                        </label>
                        <div className="pp-input-icon-wrap">
                          <Calendar size={15} className="pp-input-icon" aria-hidden="true" />
                          <input
                            id="dob"
                            name="dob"
                            type="date"
                            className="pp-input pp-input--has-icon"
                            value={form.dob}
                            onChange={handleChange}
                            disabled={saving}
                          />
                        </div>
                      </div>

                      {/* Email (Read-only) */}
                      <div className="pp-form-group">
                        <label htmlFor="email" className="pp-label">
                          <span>Email Address</span>
                          <span className="pp-readonly-tag">
                            <Lock size={11} aria-hidden="true" /> Read-only
                          </span>
                        </label>
                        <div className="pp-input-icon-wrap">
                          <Mail size={15} className="pp-input-icon" aria-hidden="true" />
                          <input
                            id="email"
                            type="email"
                            className="pp-input pp-input--readonly pp-input--has-icon"
                            value={profile?.email || ''}
                            readOnly
                            aria-readonly="true"
                            title="Email address is tied to your account login and cannot be modified."
                          />
                        </div>
                        <span className="pp-field-hint">Primary email used for account authentication and trip notices.</span>
                      </div>

                      {/* Residential Address */}
                      <div className="pp-form-group pp-form-group--full">
                        <label htmlFor="address" className="pp-label">
                          <span>Residential Address</span>
                        </label>
                        <div className="pp-input-icon-wrap pp-input-icon-wrap--top">
                          <MapPin size={15} className="pp-input-icon" aria-hidden="true" />
                          <textarea
                            id="address"
                            name="address"
                            rows={3}
                            className="pp-textarea pp-textarea--has-icon"
                            value={form.address}
                            onChange={handleChange}
                            placeholder="Street, City, State, Postal Code"
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 4. Emergency Contact Card */}
                  <section className="pp-panel" aria-labelledby="emergency-heading">
                    <div className="pp-section-header">
                      <div className="pp-section-icon-wrap pp-section-icon-wrap--amber" aria-hidden="true">
                        <ShieldAlert size={18} />
                      </div>
                      <div>
                        <h2 id="emergency-heading" className="pp-section-title">Emergency Contact</h2>
                        <p className="pp-section-desc">
                          Critical contact details required for high-altitude logistics and expedition medical emergencies.
                        </p>
                      </div>
                    </div>

                    <div className="pp-grid pp-grid--3">
                      <div className="pp-form-group">
                        <label htmlFor="emergencyName" className="pp-label">Contact Name</label>
                        <input
                          id="emergencyName"
                          name="emergencyName"
                          type="text"
                          className="pp-input"
                          value={form.emergencyName}
                          onChange={handleChange}
                          placeholder="e.g. Robert Doe"
                          disabled={saving}
                        />
                      </div>

                      <div className="pp-form-group">
                        <label htmlFor="emergencyRelation" className="pp-label">Relationship</label>
                        <input
                          id="emergencyRelation"
                          name="emergencyRelation"
                          type="text"
                          className="pp-input"
                          value={form.emergencyRelation}
                          onChange={handleChange}
                          placeholder="e.g. Spouse / Parent / Sibling"
                          disabled={saving}
                        />
                      </div>

                      <div className="pp-form-group">
                        <label htmlFor="emergencyPhone" className="pp-label">Emergency Phone</label>
                        <div className="pp-input-icon-wrap">
                          <Phone size={15} className="pp-input-icon" aria-hidden="true" />
                          <input
                            id="emergencyPhone"
                            name="emergencyPhone"
                            type="tel"
                            className="pp-input pp-input--has-icon"
                            value={form.emergencyPhone}
                            onChange={handleChange}
                            placeholder="e.g. +91 99887 76655"
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 5. Profile Picture URL */}
                  <section className="pp-panel" aria-labelledby="picture-heading">
                    <div className="pp-section-header">
                      <div className="pp-section-icon-wrap" aria-hidden="true">
                        <ImageIcon size={18} />
                      </div>
                      <div>
                        <h2 id="picture-heading" className="pp-section-title">Avatar Image URL</h2>
                        <p className="pp-section-desc">Provide a publicly accessible image link for your avatar.</p>
                      </div>
                    </div>

                    <div className="pp-form-group">
                      <label htmlFor="profilePicture" className="pp-label">Image URL</label>
                      <input
                        id="profilePicture"
                        name="profilePicture"
                        type="url"
                        className="pp-input"
                        value={form.profilePicture}
                        onChange={handleChange}
                        placeholder="https://example.com/avatar.jpg"
                        disabled={saving}
                      />
                      <span className="pp-field-hint">
                        Enter an HTTPS image link (JPG, PNG, WebP). The live preview updates in the card above.
                      </span>
                    </div>
                  </section>
                </div>

                {/* Secondary Sidebar Column */}
                <div className="pp-sidebar-column">
                  {/* Account Overview Card */}
                  <section className="pp-panel" aria-labelledby="account-heading">
                    <div className="pp-section-header">
                      <div className="pp-section-icon-wrap" aria-hidden="true">
                        <Shield size={18} />
                      </div>
                      <div>
                        <h2 id="account-heading" className="pp-section-title">Account Details</h2>
                        <p className="pp-section-desc">Read-only account metadata.</p>
                      </div>
                    </div>

                    <div className="pp-meta-list">
                      <div className="pp-meta-item">
                        <span className="pp-meta-label">Account Role</span>
                        <span className="pp-meta-value">
                          <span className="pp-badge pp-badge--role">{profile?.role || 'Participant'}</span>
                        </span>
                      </div>

                      <div className="pp-meta-item">
                        <span className="pp-meta-label">Member Since</span>
                        <span className="pp-meta-value">{formatDate(profile?.createdAt) || '—'}</span>
                      </div>

                      <div className="pp-meta-item">
                        <span className="pp-meta-label">Last Profile Update</span>
                        <span className="pp-meta-value">{formatDate(profile?.updatedAt) || '—'}</span>
                      </div>
                    </div>
                  </section>

                  {/* Security / Privacy Note */}
                  <div className="pp-security-note" role="note">
                    <Info size={18} className="pp-security-note-icon" aria-hidden="true" />
                    <div className="pp-security-note-text">
                      <p className="pp-security-note-title">Security &amp; Privacy</p>
                      <p className="pp-security-note-desc">
                        Your personal and emergency contact information is securely stored and only accessible to verified organizers for safety coordination.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Action Controls Sticky Bar */}
              <div className="pp-actions-panel">
                <div className="pp-dirty-notice">
                  {isDirty ? (
                    <span className="pp-dirty-indicator">You have unsaved changes.</span>
                  ) : (
                    <span className="pp-synced-indicator">All profile information is up to date.</span>
                  )}
                </div>

                <div className="pp-actions-buttons">
                  <button
                    type="button"
                    className="btn btn-secondary pp-action-btn"
                    onClick={handleReset}
                    disabled={!isDirty || saving}
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    <span>Reset</span>
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary pp-action-btn"
                    disabled={saving || !isDirty}
                  >
                    {saving ? (
                      <>
                        <LoaderCircle size={15} className="pp-spin" aria-hidden="true" />
                        <span>Saving Changes…</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} aria-hidden="true" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

