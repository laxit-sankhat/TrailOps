import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  HeartPulse,
  Info,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
  X,
  XCircle
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getMyBookings } from '../../services/bookingService';
import {
  getMyMedicalDocument,
  getMyMedicalProfile,
  uploadMedicalProfile
} from '../../services/medicalService';
import type { BookingStatus, ParticipantBookingSummary } from '../../types';
import './ParticipantMedicalPage.css';

type ParticipantBooking = Omit<ParticipantBookingSummary, 'tripId' | 'batchId'> & {
  tripId: (NonNullable<ParticipantBookingSummary['tripId']> & { _id?: string }) | null;
  batchId: (NonNullable<ParticipantBookingSummary['batchId']> & {
    _id?: string;
    startDate?: string;
    endDate?: string;
  }) | null;
};

type MedicalForm = {
  bloodGroup: string;
  allergies: string;
  medicalConditions: string;
  medications: string;
  emergencyContactDetails: string;
  validUntil: string;
};

type MedicalReviewBooking = {
  booking: ParticipantBooking;
  label: string;
  tone: 'pending' | 'approved' | 'rejected';
};

const initialMedicalForm: MedicalForm = {
  bloodGroup: '',
  allergies: '',
  medicalConditions: '',
  medications: '',
  emergencyContactDetails: '',
  validUntil: ''
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateInput(value?: string | Date): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : fallback;
}

function validateMedicalField(field: keyof MedicalForm, formElement: HTMLFormElement) {
  const values = new FormData(formElement);
  const value = String(values.get(field) || '');
  if (['bloodGroup', 'emergencyContactDetails', 'validUntil'].includes(field) && !value.trim()) {
    return 'This field is required.';
  }
  if (field === 'validUntil' && value) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(`${value}T00:00:00`) <= today) {
      return 'Valid-until date must be in the future.';
    }
  }
  return '';
}

function validateSelectedFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return 'File size exceeds the 5 MB limit. Please select a smaller document or compress the file.';
  }
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeAllowed = ALLOWED_MIME_TYPES.includes(file.type);
  const extAllowed = ALLOWED_EXTENSIONS.includes(ext);
  if (!mimeAllowed && !extAllowed) {
    return 'Unsupported file type. Please upload a PDF, JPEG, PNG, or WebP document.';
  }
  return null;
}

const medicalReviewStatuses: Partial<Record<BookingStatus, Omit<MedicalReviewBooking, 'booking'>>> = {
  PendingMedicalReview: { label: 'Pending Medical Review', tone: 'pending' },
  MedicallyApproved: { label: 'Medically Approved', tone: 'approved' },
  Rejected: { label: 'Rejected', tone: 'rejected' }
};

export default function ParticipantMedicalPage() {
  const [medicalForm, setMedicalForm] = useState<MedicalForm>(initialMedicalForm);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [profileMessage, setProfileMessage] = useState('');
  const [profileMessageTone, setProfileMessageTone] = useState<'success' | 'error'>('success');
  const [profileValidUntil, setProfileValidUntil] = useState<string | null>(null);
  const [submittingProfile, setSubmittingProfile] = useState(false);

  // Existing document on file states
  const [existingHasDocument, setExistingHasDocument] = useState(false);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [fetchingDocumentUrl, setFetchingDocumentUrl] = useState(false);
  const [documentActionError, setDocumentActionError] = useState('');

  // Selected new file states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bookings reviews
  const [bookings, setBookings] = useState<ParticipantBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState('');

  // 4. Load existing profile on page mount
  useEffect(() => {
    let active = true;

    // Load existing profile metadata
    getMyMedicalProfile()
      .then((response) => {
        if (!active) return;
        const profile = response.data.profile;
        if (profile) {
          setMedicalForm({
            bloodGroup: profile.bloodGroup || '',
            allergies: profile.allergies || '',
            medicalConditions: profile.medicalConditions || '',
            medications: profile.medications || '',
            emergencyContactDetails: profile.emergencyContactDetails || '',
            validUntil: formatDateInput(profile.validUntil)
          });
          if (profile.validUntil) {
            setProfileValidUntil(typeof profile.validUntil === 'string' ? profile.validUntil : null);
          }
          setExistingHasDocument(Boolean(profile.hasDocument));
          setExistingFileName(profile.reportFileName || null);
        }
      })
      .catch((err: unknown) => {
        console.warn('Could not load existing medical profile:', err);
      });

    // Load bookings for review status progress
    getMyBookings()
      .then((response) => {
        if (!active) return;
        setBookings((response.data.bookings || []) as ParticipantBooking[]);
        setBookingsError('');
      })
      .catch((error: unknown) => {
        console.error(error);
        if (active) setBookingsError(getApiErrorMessage(error, 'Unable to load your booking review statuses.'));
      })
      .finally(() => {
        if (active) setLoadingBookings(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const medicalReviewBookings: MedicalReviewBooking[] = bookings.flatMap((booking) => {
    const reviewStatus = medicalReviewStatuses[booking.status];
    return reviewStatus ? [{ booking, ...reviewStatus }] : [];
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;
    setMedicalForm((current) => ({ ...current, [name]: value }));
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const field = event.currentTarget.name as keyof MedicalForm;
    const formElement = event.currentTarget.form;
    if (!formElement) return;
    setValidationErrors((current) => ({
      ...current,
      [field]: validateMedicalField(field, formElement)
    }));
  };

  // 1 & 2. File Selection & Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileValidationError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationResult = validateSelectedFile(file);
    if (validationResult) {
      setFileValidationError(validationResult);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFile(null);
    setFileValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 5. View Existing Document via temporary signed URL
  const handleViewExistingDocument = async () => {
    setFetchingDocumentUrl(true);
    setDocumentActionError('');
    try {
      const response = await getMyMedicalDocument();
      const signedUrl = response.data.url;
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        setDocumentActionError('Document download URL was unavailable.');
      }
    } catch (err: unknown) {
      setDocumentActionError(getApiErrorMessage(err, 'Unable to open medical document. Please try again.'));
    } finally {
      setFetchingDocumentUrl(false);
    }
  };

  // 3 & 6. Submit Medical Profile with FormData
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingProfile) return;

    // Field validations
    const fields: (keyof MedicalForm)[] = ['bloodGroup', 'emergencyContactDetails', 'validUntil'];
    const nextErrors = Object.fromEntries(
      fields.map((field) => [field, validateMedicalField(field, event.currentTarget)])
    );
    setValidationErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    // File validation check if a file was selected
    if (selectedFile) {
      const fileErr = validateSelectedFile(selectedFile);
      if (fileErr) {
        setFileValidationError(fileErr);
        return;
      }
    }

    setSubmittingProfile(true);
    setProfileMessage('');
    setDocumentActionError('');

    try {
      // Build FormData payload
      const formData = new FormData();
      formData.append('bloodGroup', medicalForm.bloodGroup.trim());
      formData.append('validUntil', medicalForm.validUntil);
      formData.append('allergies', medicalForm.allergies.trim());
      formData.append('medicalConditions', medicalForm.medicalConditions.trim());
      formData.append('medications', medicalForm.medications.trim());
      formData.append('emergencyContactDetails', medicalForm.emergencyContactDetails.trim());

      if (selectedFile) {
        formData.append('report', selectedFile);
      }

      const response = await uploadMedicalProfile(formData);
      const safeProfile = response.data.profile;

      if (safeProfile) {
        const validUntil = safeProfile.validUntil;
        setProfileValidUntil(typeof validUntil === 'string' ? validUntil : null);
        if (safeProfile.hasDocument) {
          setExistingHasDocument(true);
          setExistingFileName(safeProfile.reportFileName || selectedFile?.name || 'Medical Document');
        }
      }

      // Clear the file picker after successful upload
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setProfileMessage('Medical profile and document uploaded successfully.');
      setProfileMessageTone('success');
    } catch (error: unknown) {
      setProfileMessage(getApiErrorMessage(error, 'Unable to submit your medical profile.'));
      setProfileMessageTone('error');
    } finally {
      setSubmittingProfile(false);
    }
  };

  return (
    <div className="participant-medical-page">
      <Navbar />

      <main className="participant-medical-main">
        <div className="participant-medical-container">
          {/* Header */}
          <header className="participant-medical-header">
            <p className="participant-medical-eyebrow">HEALTH & SAFETY</p>
            <h1 className="participant-medical-title">Medical Profile</h1>
            <p className="participant-medical-subtitle">
              Keep your health information and supporting documents up to date for clinical review by our medical officers.
            </p>
          </header>

          {/* Privacy Notice */}
          <aside className="participant-medical-privacy-notice" aria-label="Privacy notice">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>
              Your health information and uploaded medical documents are kept confidential and are only accessed by designated medical personnel and coordinators for trek safety.
            </span>
          </aside>

          {/* Profile Form Panel */}
          <section className="participant-medical-panel" aria-labelledby="medical-profile-heading">
            <div className="participant-medical-panel-heading">
              <span className="participant-medical-icon">
                <HeartPulse size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="participant-medical-eyebrow">PARTICIPANT DETAILS</p>
                <h2 id="medical-profile-heading">Medical Profile & Documentation</h2>
              </div>
            </div>

            <p className="participant-medical-intro">
              Provide current health indicators and emergency contacts. Upload supporting physician clearances or vaccination records if required for high-altitude treks.
            </p>

            {profileValidUntil && (
              <div className="participant-medical-validity" role="status">
                <Clock size={16} aria-hidden="true" />
                <span>
                  Current profile clearance is marked valid until <strong>{formatDate(profileValidUntil)}</strong>.
                </span>
              </div>
            )}

            {/* 5. Existing Document Card */}
            {existingHasDocument && (
              <div className="participant-medical-existing-doc-card">
                <div className="participant-medical-doc-info">
                  <div className="participant-medical-doc-icon-wrap">
                    <FileCheck size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <span className="participant-medical-doc-tag">ACTIVE DOCUMENT ON FILE</span>
                    <strong className="participant-medical-doc-name">
                      {existingFileName || 'Supporting Medical Document'}
                    </strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm participant-medical-view-doc-btn"
                  onClick={() => void handleViewExistingDocument()}
                  disabled={fetchingDocumentUrl}
                >
                  {fetchingDocumentUrl ? (
                    <>
                      <LoaderCircle size={14} className="participant-spin" aria-hidden="true" />
                      <span>Generating link…</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink size={14} aria-hidden="true" />
                      <span>View Document</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {documentActionError && (
              <div className="participant-medical-feedback participant-medical-feedback--error" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{documentActionError}</span>
              </div>
            )}

            <form className="participant-medical-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
              {/* Form Grid */}
              <div className="participant-medical-form-grid">
                <div className="form-group">
                  <label htmlFor="participant-medical-blood-group">
                    Blood Group <span className="participant-required-star">*</span>
                  </label>
                  <input
                    id="participant-medical-blood-group"
                    name="bloodGroup"
                    value={medicalForm.bloodGroup}
                    placeholder="e.g. O+, A-, B+, AB+"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(validationErrors.bloodGroup)}
                    required
                  />
                  {validationErrors.bloodGroup && <p className="field-error">{validationErrors.bloodGroup}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="participant-medical-valid-until">
                    Valid Until <span className="participant-required-star">*</span>
                  </label>
                  <input
                    id="participant-medical-valid-until"
                    name="validUntil"
                    type="date"
                    value={medicalForm.validUntil}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(validationErrors.validUntil)}
                    required
                  />
                  {validationErrors.validUntil && <p className="field-error">{validationErrors.validUntil}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="participant-medical-allergies">Allergies</label>
                  <input
                    id="participant-medical-allergies"
                    name="allergies"
                    value={medicalForm.allergies}
                    placeholder="e.g. Peanuts, Sulfa, Pollen, None"
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="participant-medical-conditions">Medical Conditions</label>
                  <input
                    id="participant-medical-conditions"
                    name="medicalConditions"
                    value={medicalForm.medicalConditions}
                    placeholder="e.g. Asthma, Hypertension, None"
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="participant-medical-medications">Current Medications</label>
                  <input
                    id="participant-medical-medications"
                    name="medications"
                    value={medicalForm.medications}
                    placeholder="e.g. Inhaler, Diamox, None"
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="participant-medical-emergency-contact">
                    Emergency Contact Details <span className="participant-required-star">*</span>
                  </label>
                  <input
                    id="participant-medical-emergency-contact"
                    name="emergencyContactDetails"
                    value={medicalForm.emergencyContactDetails}
                    placeholder="Name, Relationship & Phone Number"
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(validationErrors.emergencyContactDetails)}
                    required
                  />
                  {validationErrors.emergencyContactDetails && (
                    <p className="field-error">{validationErrors.emergencyContactDetails}</p>
                  )}
                </div>
              </div>

              {/* 1 & 2. Medical Document Upload Picker */}
              <div className="participant-medical-upload-section">
                <label className="participant-medical-upload-label" htmlFor="participant-medical-file-input">
                  Supporting Medical Document
                  <span className="participant-medical-optional-tag">(Optional / Recommended)</span>
                </label>
                <p className="participant-medical-upload-hint">
                  Upload a medical clearance certificate, fitness report, or prescription (PDF, JPEG, PNG, or WebP up to 5 MB).
                </p>

                {/* Hidden native input */}
                <input
                  id="participant-medical-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  className="participant-medical-hidden-input"
                  onChange={handleFileChange}
                />

                {/* File Selection States */}
                {selectedFile ? (
                  <div className="participant-medical-selected-file-card">
                    <div className="participant-medical-selected-file-info">
                      <FileText size={20} className="participant-medical-file-icon" aria-hidden="true" />
                      <div className="participant-medical-selected-file-meta">
                        <strong className="participant-medical-selected-file-name">{selectedFile.name}</strong>
                        <span className="participant-medical-selected-file-specs">
                          {selectedFile.type || 'Document'} • {formatFileSize(selectedFile.size)}
                        </span>
                      </div>
                    </div>
                    <div className="participant-medical-selected-file-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        className="participant-medical-remove-file-btn"
                        aria-label="Remove selected file"
                        onClick={handleRemoveSelectedFile}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="participant-medical-dropzone"
                    tabIndex={0}
                    role="button"
                    aria-label="Choose medical document to upload"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <UploadCloud size={28} className="participant-medical-dropzone-icon" aria-hidden="true" />
                    <span className="participant-medical-dropzone-title">
                      {existingHasDocument ? 'Upload replacement medical document' : 'Click to select a medical document'}
                    </span>
                    <span className="participant-medical-dropzone-sub">
                      Accepted formats: PDF, JPEG, PNG, WebP (Max size: 5 MB)
                    </span>
                  </div>
                )}

                {fileValidationError && (
                  <div className="participant-medical-field-alert" role="alert">
                    <AlertCircle size={15} aria-hidden="true" />
                    <span>{fileValidationError}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="participant-medical-form-actions">
                <button
                  type="submit"
                  className="btn btn-primary participant-medical-submit-btn"
                  disabled={submittingProfile}
                >
                  {submittingProfile ? (
                    <>
                      <LoaderCircle size={17} className="participant-spin" aria-hidden="true" />
                      <span>Saving Profile…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={17} aria-hidden="true" />
                      <span>Save / Update Medical Profile</span>
                    </>
                  )}
                </button>
              </div>

              {profileMessage && (
                <div
                  className={`participant-medical-feedback participant-medical-feedback--${profileMessageTone}`}
                  role={profileMessageTone === 'error' ? 'alert' : 'status'}
                >
                  {profileMessageTone === 'error' ? (
                    <AlertCircle size={18} aria-hidden="true" />
                  ) : (
                    <CheckCircle2 size={18} aria-hidden="true" />
                  )}
                  <span>{profileMessage}</span>
                </div>
              )}
            </form>
          </section>

          {/* Review Status Progress Section */}
          <section
            className="participant-medical-panel participant-medical-review-panel"
            aria-labelledby="medical-review-heading"
          >
            <div className="participant-medical-panel-heading">
              <span className="participant-medical-icon participant-medical-icon--review">
                <CalendarDays size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="participant-medical-eyebrow">BOOKING PROGRESS</p>
                <h2 id="medical-review-heading">Trek Review Status</h2>
              </div>
            </div>
            <p className="participant-medical-intro">
              Medical review status is evaluated per departure batch by the assigned organization medical team.
            </p>

            {loadingBookings ? (
              <div className="participant-medical-state" role="status">
                <LoaderCircle size={18} className="participant-spin" aria-hidden="true" />
                <span>Loading your booking statuses…</span>
              </div>
            ) : bookingsError ? (
              <div className="participant-medical-state participant-medical-state--error" role="alert">
                <AlertCircle size={18} aria-hidden="true" />
                <span>{bookingsError}</span>
              </div>
            ) : medicalReviewBookings.length > 0 ? (
              <div className="participant-medical-reviews" role="list">
                {medicalReviewBookings.map(({ booking, label, tone }) => (
                  <article className="participant-medical-review-card" key={booking._id} role="listitem">
                    <div className="participant-medical-review-info">
                      <h3>{booking.tripId?.name || 'Trek booking'}</h3>
                      {booking.batchId?.batchName && <p>{booking.batchId.batchName}</p>}
                      {(booking.batchId?.startDate || booking.batchId?.endDate) && (
                        <span className="participant-medical-review-dates">
                          <CalendarDays size={13} aria-hidden="true" />
                          <span>
                            {formatDate(booking.batchId.startDate) || 'Date unavailable'}
                            {booking.batchId.endDate ? ` — ${formatDate(booking.batchId.endDate)}` : ''}
                          </span>
                        </span>
                      )}
                    </div>
                    <span className={`participant-medical-status participant-medical-status--${tone}`}>
                      {tone === 'approved' ? (
                        <CheckCircle2 size={13} aria-hidden="true" />
                      ) : tone === 'rejected' ? (
                        <XCircle size={13} aria-hidden="true" />
                      ) : (
                        <Clock size={13} aria-hidden="true" />
                      )}
                      <span>{label}</span>
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="participant-medical-state">
                <Info size={18} aria-hidden="true" />
                <span>No active bookings are currently awaiting medical review.</span>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
