import { useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { createTrip, getTripsByOrg, uploadTripImage, removeTripImage } from '../services/tripService';
import { createBatch, getMyOrgBatches, completeBatch } from '../services/batchService';
import { createBatchAssignment } from '../services/batchAssignmentService';
import { getAssignmentsForBatch } from '../services/batchAssignmentService';
import { createGearItem, getMyOrgGear } from '../services/gearService';
import { getMyOrgStaff } from '../services/staffService';
import { getOrgStats } from '../services/analyticsService';
import type { BatchSummary, GearItemSummary, OrganizationStaffSummary } from '../types';

type FieldErrors = Record<string, string>;
type TrekLeaderAssignment = {
  _id: string;
  userId: { _id: string; fullName: string } | null;
};

export default function OrgAdminDashboard() {

  const { user } = useAuth();

  const [trips, setTrips] = useState<any[]>([]);
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [staffMembers, setStaffMembers] = useState<OrganizationStaffSummary[]>([]);
  const [gearItems, setGearItems] = useState<GearItemSummary[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<{ [tripId: string]: File }>({});
  const [uploadingTripId, setUploadingTripId] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState('');

  const [form, setForm] = useState({
    name: '', location: '', description: '', difficultyLevel: 'Easy',
    durationDays: 1, startDate: '', endDate: '', basePrice: 0
  });
  const [message, setMessage] = useState('');
  const [tripValidationErrors, setTripValidationErrors] = useState<FieldErrors>({});

  const validateTripField = (field: string, formElement: HTMLFormElement) => {
    const values = new FormData(formElement);
    const value = String(values.get(field) || '');
    if (['name', 'location', 'durationDays', 'startDate', 'endDate', 'basePrice'].includes(field) && !value.trim()) {
      return 'This field is required.';
    }
    if (field === 'durationDays' && (!Number.isFinite(Number(value)) || Number(value) < 1)) {
      return 'Duration must be at least 1 day.';
    }
    if (field === 'basePrice' && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      return 'Price cannot be negative.';
    }
    if (field === 'endDate' && value && String(values.get('startDate') || '') && value <= String(values.get('startDate'))) {
      return 'End date must be after the start date.';
    }
    return '';
  };

  const validateTripForm = (formElement: HTMLFormElement) => {
    const fields = ['name', 'location', 'durationDays', 'startDate', 'endDate', 'basePrice'];
    return Object.fromEntries(fields.map((field) => [field, validateTripField(field, formElement)]));
  };

  const handleTripBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const field = e.currentTarget.name;
    const formElement = e.currentTarget.form;
    if (!formElement) return;
    const error = validateTripField(field, formElement);
    setTripValidationErrors((current) => ({ ...current, [field]: error }));
  };

  const fetchTrips = async () => {
    try {
      const response = await getTripsByOrg(user!.organizationId!);
      setTrips(response.data.trips);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchOrgData = async () => {
    try {
      const [batchResponse, staffResponse, gearResponse] = await Promise.all([
        getMyOrgBatches(),
        getMyOrgStaff(),
        getMyOrgGear()
      ]);
      setBatches(batchResponse.data.batches || []);
      setStaffMembers(staffResponse.data.staff || []);
      setGearItems(gearResponse.data.gearItems || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([getMyOrgBatches(), getMyOrgStaff(), getMyOrgGear()])
      .then(([batchResponse, staffResponse, gearResponse]) => {
        setBatches(batchResponse.data.batches || []);
        setStaffMembers(staffResponse.data.staff || []);
        setGearItems(gearResponse.data.gearItems || []);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const handleFileSelect = (tripId: string, file: File | undefined) => {
    if (file) {
      setSelectedFiles((previous) => ({ ...previous, [tripId]: file }));
      return;
    }
    setSelectedFiles((previous) => {
      const copy = { ...previous };
      delete copy[tripId];
      return copy;
    });
  };

  const handleUploadImage = async (tripId: string) => {
    const file = selectedFiles[tripId];
    if (!file) return;

    setUploadingTripId(tripId);
    try {
      await uploadTripImage(tripId, file);
      setImageMessage('Image uploaded successfully');
      handleFileSelect(tripId, undefined);
      await fetchTrips();
    } catch (err: unknown) {
      const errorMessage = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
      setImageMessage(errorMessage || 'Failed to upload image');
    } finally {
      setUploadingTripId(null);
    }
  };

  const handleRemoveImage = async (tripId: string, publicId: string) => {
    try {
      await removeTripImage(tripId, publicId);
      setImageMessage('Image removed successfully');
      await fetchTrips();
    } catch (err: unknown) {
      const errorMessage = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined;
      setImageMessage(errorMessage || 'Failed to remove image');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTrip(form);
      setMessage('Trip created successfully');
      await fetchTrips();
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleValidatedTripSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validateTripForm(e.currentTarget);
    setTripValidationErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    handleSubmit(e);
  };

  const [batchForm, setBatchForm] = useState({
    tripId: '', batchName: '', startDate: '', endDate: '', maxCapacity: 10
  });
  const [batchMessage, setBatchMessage] = useState('');
  const [batchValidationErrors, setBatchValidationErrors] = useState<FieldErrors>({});

  const validateBatchField = (field: string, formElement: HTMLFormElement) => {
    const values = new FormData(formElement);
    const value = String(values.get(field) || '');
    if (['tripId', 'batchName', 'startDate', 'endDate', 'maxCapacity'].includes(field) && !value.trim()) {
      return 'This field is required.';
    }
    if (field === 'maxCapacity' && (!Number.isFinite(Number(value)) || Number(value) < 1)) {
      return 'Capacity must be at least 1.';
    }
    if (field === 'endDate' && value && String(values.get('startDate') || '') && value <= String(values.get('startDate'))) {
      return 'End date must be after the start date.';
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
    const error = validateBatchField(field, formElement);
    setBatchValidationErrors((current) => ({ ...current, [field]: error }));
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBatchForm({ ...batchForm, [e.target.name]: e.target.value });
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBatch(batchForm);
      setBatchMessage('Batch created successfully');
      await fetchOrgData();
    } catch (err: any) {
      setBatchMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleValidatedBatchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validateBatchForm(e.currentTarget);
    setBatchValidationErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    handleBatchSubmit(e);
  };

  const [assignForm, setAssignForm] = useState({ batchId: '', userId: '', roleInBatch: 'TrekLeader', supervisingTrekLeaderId: '' });
  const [assignMessage, setAssignMessage] = useState('');
  const [supervisingTrekLeaders, setSupervisingTrekLeaders] = useState<TrekLeaderAssignment[]>([]);

  const handleAssignChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAssignForm({ ...assignForm, [e.target.name]: e.target.value });
  };

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

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBatchAssignment(assignForm);
      setAssignMessage('Assignment created successfully');
    } catch (err: any) {
      setAssignMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [gearForm, setGearForm] = useState({
  name: '', category: '', quantity: 1, condition: 'Good',
  dailyLateFeeRate: 50, minorDamageFee: 200, moderateDamageFee: 500, severeDamageFee: 1000, lostItemFee: 5000
});

  const [gearMessage, setGearMessage] = useState('');
  const [gearValidationErrors, setGearValidationErrors] = useState<FieldErrors>({});

  const validateGearField = (field: string, formElement: HTMLFormElement) => {
    const values = new FormData(formElement);
    const value = String(values.get(field) || '');
    if (['name', 'category', 'quantity', 'condition'].includes(field) && !value.trim()) {
      return 'This field is required.';
    }
    if (field === 'quantity' && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      return 'Quantity cannot be negative.';
    }
    if (['dailyLateFeeRate', 'minorDamageFee', 'moderateDamageFee', 'severeDamageFee', 'lostItemFee'].includes(field)
      && value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      return 'Fee cannot be negative.';
    }
    return '';
  };

  const validateGearForm = (formElement: HTMLFormElement) => {
    const fields = [
      'name', 'category', 'quantity', 'condition',
      'dailyLateFeeRate', 'minorDamageFee', 'moderateDamageFee', 'severeDamageFee', 'lostItemFee'
    ];
    return Object.fromEntries(fields.map((field) => [field, validateGearField(field, formElement)]));
  };

  const handleGearBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const field = e.currentTarget.name;
    const formElement = e.currentTarget.form;
    if (!formElement) return;
    const error = validateGearField(field, formElement);
    setGearValidationErrors((current) => ({ ...current, [field]: error }));
  };

  const handleGearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGearForm({ ...gearForm, [e.target.name]: e.target.value });
  };

  const handleGearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createGearItem(gearForm);
      setGearMessage('Gear item created successfully');
      await fetchOrgData();
    } catch (err: any) {
      setGearMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const handleValidatedGearSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validateGearForm(e.currentTarget);
    setGearValidationErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    handleGearSubmit(e);
  };

  const [completeBatchId, setCompleteBatchId] = useState('');
  const [completeMessage, setCompleteMessage] = useState('');

  const handleCompleteBatch = async () => {
    try {
      await completeBatch(completeBatchId);
      setCompleteMessage('Batch marked as completed');
      await fetchOrgData();
    } catch (err: any) {
      setCompleteMessage(err.response?.data?.message || 'Something went wrong');
    }
  };

  const [stats, setStats] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const response = await getOrgStats();
      setStats(response.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div>
      <Navbar />
      <div className="dashboard-container">
        <h1>Org Admin Dashboard</h1>

        <div className="card">
          <h2>Existing Trips</h2>
          {trips.length > 0 ? (
            <ul className="item-list">
              {trips.map((trip) => (
                <li key={trip._id} style={{ display: 'block', padding: '1rem' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>{trip.name}</strong>{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>({trip.location})</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {trip._id}</div>
                  </div>
                  {trip.images?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
                      {trip.images.map((image: { url: string; publicId: string }) => (
                        <div key={image.publicId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                          <img src={image.url} alt="Trip thumbnail" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(trip._id, image.publicId)}
                            className="btn btn-sm btn-danger"
                            style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileSelect(trip._id, e.target.files?.[0])}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleUploadImage(trip._id)}
                      disabled={!selectedFiles[trip._id] || uploadingTripId === trip._id}
                      className="btn btn-sm"
                    >
                      {uploadingTripId === trip._id ? 'Uploading...' : 'Upload Image'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: 'var(--text-muted)' }}>No trips created yet.</p>
          )}
          {imageMessage && (
            <p className={imageMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'} style={{ marginTop: '0.75rem' }}>
              {imageMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Create Trip</h2>
          <form onSubmit={handleValidatedTripSubmit} noValidate>
            <div className="form-group">
              <label>Trip Name</label>
              <input name="name" placeholder="Trip Name" onChange={handleChange} onBlur={handleTripBlur} aria-invalid={Boolean(tripValidationErrors.name)} required />
              {tripValidationErrors.name && <p className="field-error">{tripValidationErrors.name}</p>}
            </div>
            <div className="form-group">
              <label>Location</label>
              <input name="location" placeholder="Location" onChange={handleChange} onBlur={handleTripBlur} aria-invalid={Boolean(tripValidationErrors.location)} required />
              {tripValidationErrors.location && <p className="field-error">{tripValidationErrors.location}</p>}
            </div>
            <div className="form-group">
              <label>Description</label>
              <input name="description" placeholder="Description" onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Difficulty Level</label>
              <select name="difficultyLevel" onChange={handleChange}>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Difficult">Difficult</option>
              </select>
            </div>
            <div className="form-group">
              <label>Duration (days)</label>
              <input name="durationDays" type="number" placeholder="Duration (days)" onChange={handleChange} onBlur={handleTripBlur} aria-invalid={Boolean(tripValidationErrors.durationDays)} required />
              {tripValidationErrors.durationDays && <p className="field-error">{tripValidationErrors.durationDays}</p>}
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input name="startDate" type="date" onChange={handleChange} onBlur={handleTripBlur} aria-invalid={Boolean(tripValidationErrors.startDate)} required />
              {tripValidationErrors.startDate && <p className="field-error">{tripValidationErrors.startDate}</p>}
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input name="endDate" type="date" onChange={handleChange} onBlur={handleTripBlur} aria-invalid={Boolean(tripValidationErrors.endDate)} required />
              {tripValidationErrors.endDate && <p className="field-error">{tripValidationErrors.endDate}</p>}
            </div>
            <div className="form-group">
              <label>Base Price ($)</label>
              <input name="basePrice" type="number" placeholder="Base Price" onChange={handleChange} onBlur={handleTripBlur} aria-invalid={Boolean(tripValidationErrors.basePrice)} required />
              {tripValidationErrors.basePrice && <p className="field-error">{tripValidationErrors.basePrice}</p>}
            </div>
            <button type="submit" className="btn">Create Trip</button>
          </form>
          {message && (
            <p className={message.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {message}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Create Batch</h2>
          <form onSubmit={handleValidatedBatchSubmit} noValidate>
            <div className="form-group">
              <label>Trip</label>
              <select name="tripId" value={batchForm.tripId} onChange={handleBatchChange} onBlur={handleBatchBlur} aria-invalid={Boolean(batchValidationErrors.tripId)} required>
                <option value="">Select a Trip</option>
                {trips.map((trip) => (
                  <option key={trip._id} value={trip._id}>{trip.name}</option>
                ))}
              </select>
              {batchValidationErrors.tripId && <p className="field-error">{batchValidationErrors.tripId}</p>}
            </div>
            <div className="form-group">
              <label>Batch Name</label>
              <input name="batchName" placeholder="Batch Name" onChange={handleBatchChange} onBlur={handleBatchBlur} aria-invalid={Boolean(batchValidationErrors.batchName)} required />
              {batchValidationErrors.batchName && <p className="field-error">{batchValidationErrors.batchName}</p>}
            </div>
            <div className="form-group">
              <label>Start Date</label>
              <input name="startDate" type="date" onChange={handleBatchChange} onBlur={handleBatchBlur} aria-invalid={Boolean(batchValidationErrors.startDate)} required />
              {batchValidationErrors.startDate && <p className="field-error">{batchValidationErrors.startDate}</p>}
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input name="endDate" type="date" onChange={handleBatchChange} onBlur={handleBatchBlur} aria-invalid={Boolean(batchValidationErrors.endDate)} required />
              {batchValidationErrors.endDate && <p className="field-error">{batchValidationErrors.endDate}</p>}
            </div>
            <div className="form-group">
              <label>Max Capacity</label>
              <input name="maxCapacity" type="number" placeholder="Max Capacity" onChange={handleBatchChange} onBlur={handleBatchBlur} aria-invalid={Boolean(batchValidationErrors.maxCapacity)} required />
              {batchValidationErrors.maxCapacity && <p className="field-error">{batchValidationErrors.maxCapacity}</p>}
            </div>
            <button type="submit" className="btn">Create Batch</button>
          </form>
          {batchMessage && (
            <p className={batchMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {batchMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Assign Trek Leader / Volunteer to Batch</h2>
          <form onSubmit={handleAssignSubmit}>
            <div className="form-group">
              <label>Batch</label>
              <select name="batchId" value={assignForm.batchId} onChange={(e) => handleAssignmentBatchChange(e.target.value)} required>
                <option value="">Select a Batch</option>
                {batches.map((batch) => (
                  <option key={batch._id} value={batch._id}>{batch.batchName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Staff Member</label>
              <select name="userId" value={assignForm.userId} onChange={handleAssignChange} required>
                <option value="">Select Staff Member</option>
                {staffMembers
                  .filter((member) => ['TrekLeader', 'Volunteer'].includes(member.role || member.userId?.role))
                  .map((member) => {
                    const staffUser = member.userId;
                    return staffUser ? (
                      <option key={staffUser._id} value={staffUser._id}>
                        {staffUser.fullName || 'Staff'} ({member.role || staffUser.role})
                      </option>
                    ) : null;
                  })}
              </select>
            </div>
            <div className="form-group">
              <label>Role in Batch</label>
              <select name="roleInBatch" onChange={handleAssignChange}>
                <option value="TrekLeader">Trek Leader</option>
                <option value="Volunteer">Volunteer</option>
              </select>
            </div>
            <div className="form-group">
              <label>Supervising Trek Leader (Volunteer only)</label>
              <select name="supervisingTrekLeaderId" value={assignForm.supervisingTrekLeaderId} onChange={handleAssignChange} disabled={!assignForm.batchId}>
                <option value="">Select a Trek Leader</option>
                {supervisingTrekLeaders.map((assignment) => assignment.userId && (
                  <option key={assignment._id} value={assignment.userId._id}>{assignment.userId.fullName}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn">Assign to Batch</button>
          </form>
          {assignMessage && (
            <p className={assignMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {assignMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Create Gear Item</h2>
          <form onSubmit={handleValidatedGearSubmit} noValidate>
            <div className="form-group">
              <label>Item Name</label>
              <input name="name" placeholder="Item Name" onChange={handleGearChange} onBlur={handleGearBlur} aria-invalid={Boolean(gearValidationErrors.name)} required />
              {gearValidationErrors.name && <p className="field-error">{gearValidationErrors.name}</p>}
            </div>
            <div className="form-group">
              <label>Category</label>
              <input name="category" placeholder="e.g. Tent, Backpack" onChange={handleGearChange} onBlur={handleGearBlur} aria-invalid={Boolean(gearValidationErrors.category)} required />
              {gearValidationErrors.category && <p className="field-error">{gearValidationErrors.category}</p>}
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input name="quantity" type="number" placeholder="Quantity" onChange={handleGearChange} onBlur={handleGearBlur} aria-invalid={Boolean(gearValidationErrors.quantity)} required />
              {gearValidationErrors.quantity && <p className="field-error">{gearValidationErrors.quantity}</p>}
            </div>
            <div className="form-group">
              <label>Condition</label>
              <input name="condition" placeholder="Condition (e.g. Good)" onChange={handleGearChange} onBlur={handleGearBlur} aria-invalid={Boolean(gearValidationErrors.condition)} required />
              {gearValidationErrors.condition && <p className="field-error">{gearValidationErrors.condition}</p>}
            </div>
            <div className="form-group">
              <label>Daily Late Fee ($)</label>
              <input name="dailyLateFeeRate" type="number" placeholder="Daily Late Fee" onChange={handleGearChange} onBlur={handleGearBlur} aria-invalid={Boolean(gearValidationErrors.dailyLateFeeRate)} />
              {gearValidationErrors.dailyLateFeeRate && <p className="field-error">{gearValidationErrors.dailyLateFeeRate}</p>}
            </div>
            <div className="form-group">
              <label>Minor Damage Fee ($)</label>
              <input name="minorDamageFee" type="number" placeholder="Minor Damage Fee" onChange={handleGearChange} onBlur={handleGearBlur} aria-invalid={Boolean(gearValidationErrors.minorDamageFee)} />
              {gearValidationErrors.minorDamageFee && <p className="field-error">{gearValidationErrors.minorDamageFee}</p>}
            </div>
            <div className="form-group">
              <label>Moderate Damage Fee ($)</label>
              <input name="moderateDamageFee" type="number" placeholder="Moderate Damage Fee" onChange={handleGearChange} onBlur={handleGearBlur} aria-invalid={Boolean(gearValidationErrors.moderateDamageFee)} />
              {gearValidationErrors.moderateDamageFee && <p className="field-error">{gearValidationErrors.moderateDamageFee}</p>}
            </div>
            <div className="form-group">
              <label>Severe Damage Fee ($)</label>
              <input name="severeDamageFee" type="number" placeholder="Severe Damage Fee" onChange={handleGearChange} onBlur={handleGearBlur} aria-invalid={Boolean(gearValidationErrors.severeDamageFee)} />
              {gearValidationErrors.severeDamageFee && <p className="field-error">{gearValidationErrors.severeDamageFee}</p>}
            </div>
            <div className="form-group">
              <label>Lost Item Fee ($)</label>
              <input name="lostItemFee" type="number" placeholder="Lost Item Fee" onChange={handleGearChange} onBlur={handleGearBlur} aria-invalid={Boolean(gearValidationErrors.lostItemFee)} />
              {gearValidationErrors.lostItemFee && <p className="field-error">{gearValidationErrors.lostItemFee}</p>}
            </div>
            <button type="submit" className="btn">Create Gear Item</button>
          </form>
          {gearMessage && (
            <p className={gearMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}>
              {gearMessage}
            </p>
          )}
          {gearItems.length > 0 && (
            <ul className="item-list" style={{ marginTop: '1rem' }}>
              {gearItems.map((item) => (
                <li key={item._id}>
                  <div><strong>{item.name}</strong> ({item.category})</div>
                  <span>Quantity: {item.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2>Mark Batch Completed</h2>
          <div className="form-inline" style={{ marginTop: '0.5rem' }}>
            <div className="form-group" style={{ flex: '1 1 250px' }}>
              <label>Batch</label>
              <select value={completeBatchId} onChange={(e) => setCompleteBatchId(e.target.value)}>
                <option value="">Select a Batch</option>
                {batches.map((batch) => (
                  <option key={batch._id} value={batch._id}>{batch.batchName} ({batch.status})</option>
                ))}
              </select>
            </div>
            <button onClick={handleCompleteBatch} className="btn" disabled={!completeBatchId}>Mark Completed</button>
          </div>
          {completeMessage && (
            <p className={completeMessage.includes('completed') ? 'alert alert-success' : 'alert alert-error'}>
              {completeMessage}
            </p>
          )}
        </div>

        <div className="card">
          <h2>Organization Analytics</h2>
          {stats ? (
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Total Trips</div>
                <div className="stat-value">{stats.totalTrips}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total Batches</div>
                <div className="stat-value">{stats.totalBatches}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total Bookings</div>
                <div className="stat-value">{stats.totalBookings}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Confirmed Bookings</div>
                <div className="stat-value">{stats.confirmedBookings}</div>
              </div>
            </div>
          ) : (
            <p>Loading analytics...</p>
          )}
        </div>

      </div>
    </div>
  );
}