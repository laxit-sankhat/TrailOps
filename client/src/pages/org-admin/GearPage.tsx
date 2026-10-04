import { useEffect, useState, useMemo } from 'react';
import { isAxiosError } from 'axios';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  Layers,
  Package,
  PackageCheck,
  Plus,
  Trash2,
  User
} from 'lucide-react';
import {
  allocateGear,
  createGearItem,
  getMyOrgAllocations,
  getMyOrgGear,
  removeGearItem,
  returnGear
} from '../../services/gearService';
import { getMyOrgBatches } from '../../services/batchService';
import { getParticipantsByBatch } from '../../services/bookingService';
import type { GearItemSummary } from '../../types';
import './GearPage.css';

type GearItem = GearItemSummary & {
  condition?: string;
  availabilityStatus?: string;
  dailyLateFeeRate?: number;
  minorDamageFee?: number;
  moderateDamageFee?: number;
  severeDamageFee?: number;
  lostItemFee?: number;
};

type GearAllocation = {
  _id: string;
  gearItemId: { _id: string; name?: string } | string | null;
  participantId: { _id: string; fullName?: string } | string | null;
  batchId: { _id: string; batchName?: string } | string;
  allocatedAt?: string;
  expectedReturnDate?: string;
  returnedAt?: string | null;
  conditionOnReturn?: string;
  fineAmount?: number;
  fineReason?: string;
};

type BatchOption = {
  _id: string;
  batchName: string;
  startDate?: string;
  endDate?: string;
};

type BookingParticipant = {
  _id: string;
  participantId: {
    _id: string;
    fullName: string;
    email?: string;
    mobileNumber?: string;
  } | null;
};

type FieldErrors = Record<string, string>;

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export default function GearPage() {
  const location = useLocation();
  const [items, setItems] = useState<GearItem[]>([]);
  const [allocations, setAllocations] = useState<GearAllocation[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Add Gear Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [gearForm, setGearForm] = useState({
    name: '',
    category: '',
    quantity: 1,
    condition: 'Good',
    dailyLateFeeRate: 50,
    minorDamageFee: 200,
    moderateDamageFee: 500,
    severeDamageFee: 1000,
    lostItemFee: 5000
  });
  const [gearMessage, setGearMessage] = useState('');
  const [gearSubmitting, setGearSubmitting] = useState(false);
  const [gearValidationErrors, setGearValidationErrors] = useState<FieldErrors>({});

  // Allocate Gear Form State
  const [showAllocateForm, setShowAllocateForm] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    gearItemId: '',
    batchId: '',
    participantId: '',
    expectedReturnDate: ''
  });
  const [allocateMessage, setAllocateMessage] = useState('');
  const [allocateSubmitting, setAllocateSubmitting] = useState(false);
  const [batchParticipants, setBatchParticipants] = useState<BookingParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Return Gear Modal State
  const [returnModalAllocation, setReturnModalAllocation] = useState<GearAllocation | null>(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  useEffect(() => {
    if (location.hash === '#create-gear') {
      setShowCreateForm(true);
    }
    if (location.hash === '#allocate-gear') {
      setShowAllocateForm(true);
    }
  }, [location.hash]);

  const fetchData = async () => {
    try {
      const [gearRes, allocRes, batchRes] = await Promise.all([
        getMyOrgGear(),
        getMyOrgAllocations(),
        getMyOrgBatches()
      ]);
      setItems(gearRes.data.gearItems || []);
      setAllocations(allocRes.data.allocations || []);
      setBatches(batchRes.data.batches || []);
      setError('');
    } catch (err: unknown) {
      console.error(err);
      setError(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Unable to load gear inventory.'
          : 'Unable to load gear inventory.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Fast batch lookup
  const batchMap = useMemo(() => {
    const map = new Map<string, BatchOption>();
    for (const b of batches) {
      map.set(b._id, b);
    }
    return map;
  }, [batches]);

  // Active allocations grouped by gearItemId
  const activeAllocationsByGearId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of allocations) {
      if (!a.returnedAt) {
        const gId = typeof a.gearItemId === 'object' && a.gearItemId !== null ? a.gearItemId._id : a.gearItemId;
        if (gId) {
          map[gId] = (map[gId] || 0) + 1;
        }
      }
    }
    return map;
  }, [allocations]);

  // 2. Real KPI summary calculations
  const kpiStats = useMemo(() => {
    const totalEquipment = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
    const activeAllocationsCount = allocations.filter((a) => !a.returnedAt).length;
    const availableEquipment = Math.max(0, totalEquipment - activeAllocationsCount);
    const poorOrDamaged = items
      .filter((i) => i.condition === 'Poor' || i.condition === 'Damaged')
      .reduce((acc, item) => acc + (item.quantity || 0), 0);

    return {
      totalEquipment,
      availableEquipment,
      allocatedEquipment: activeAllocationsCount,
      poorOrDamaged
    };
  }, [items, allocations]);

  // Validation for Add Gear Form
  const validateGearField = (field: string, formElement: HTMLFormElement) => {
    const values = new FormData(formElement);
    const value = String(values.get(field) || '');
    if (['name', 'category', 'quantity', 'condition'].includes(field) && !value.trim()) {
      return 'This field is required.';
    }
    if (field === 'quantity' && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      return 'Quantity cannot be negative.';
    }
    if (
      ['dailyLateFeeRate', 'minorDamageFee', 'moderateDamageFee', 'severeDamageFee', 'lostItemFee'].includes(field) &&
      value.trim() &&
      (!Number.isFinite(Number(value)) || Number(value) < 0)
    ) {
      return 'Fee cannot be negative.';
    }
    return '';
  };

  const validateGearForm = (formElement: HTMLFormElement) => {
    const fields = [
      'name',
      'category',
      'quantity',
      'condition',
      'dailyLateFeeRate',
      'minorDamageFee',
      'moderateDamageFee',
      'severeDamageFee',
      'lostItemFee'
    ];
    return Object.fromEntries(fields.map((field) => [field, validateGearField(field, formElement)]));
  };

  const handleGearBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const field = e.currentTarget.name;
    const formElement = e.currentTarget.form;
    if (!formElement) return;
    const err = validateGearField(field, formElement);
    setGearValidationErrors((current) => ({ ...current, [field]: err }));
  };

  const handleGearChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setGearForm({ ...gearForm, [e.target.name]: e.target.value });
  };

  // Submit Add Gear Form
  const handleGearSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validateGearForm(e.currentTarget);
    setGearValidationErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setGearSubmitting(true);
    setGearMessage('');
    try {
      await createGearItem(gearForm);
      setSuccessNotice('Gear item created successfully.');
      setGearForm({
        name: '',
        category: '',
        quantity: 1,
        condition: 'Good',
        dailyLateFeeRate: 50,
        minorDamageFee: 200,
        moderateDamageFee: 500,
        severeDamageFee: 1000,
        lostItemFee: 5000
      });
      await fetchData();
      setShowCreateForm(false);
    } catch (err: unknown) {
      setGearMessage(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Something went wrong while creating gear.'
          : 'Something went wrong while creating gear.'
      );
    } finally {
      setGearSubmitting(false);
    }
  };

  // Start Allocate from item card or header
  const handleStartAllocate = (gearItemId?: string) => {
    if (gearItemId) {
      setAllocateForm((prev) => ({ ...prev, gearItemId }));
    }
    setShowAllocateForm(true);
    setShowCreateForm(false);
  };

  // Batch change in allocate form: loads participants for the chosen batch
  const handleAllocateBatchChange = async (batchId: string) => {
    const selectedBatch = batches.find((b) => b._id === batchId);
    let defaultReturnDate = '';
    if (selectedBatch?.endDate) {
      const d = new Date(selectedBatch.endDate);
      if (!Number.isNaN(d.getTime())) {
        defaultReturnDate = d.toISOString().split('T')[0];
      }
    }

    setAllocateForm((prev) => ({
      ...prev,
      batchId,
      participantId: '',
      expectedReturnDate: defaultReturnDate || prev.expectedReturnDate
    }));
    setBatchParticipants([]);

    if (!batchId) return;

    setLoadingParticipants(true);
    try {
      const res = await getParticipantsByBatch(batchId);
      setBatchParticipants(res.data.bookings || []);
    } catch (err) {
      console.error('Failed to load participants for batch', err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Submit Allocate Gear Form
  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (allocateSubmitting) return;

    setAllocateSubmitting(true);
    setAllocateMessage('');
    try {
      await allocateGear({
        gearItemId: allocateForm.gearItemId,
        batchId: allocateForm.batchId,
        participantId: allocateForm.participantId,
        expectedReturnDate: allocateForm.expectedReturnDate
      });
      setSuccessNotice('Gear successfully allocated to participant.');
      setAllocateForm({
        gearItemId: '',
        batchId: '',
        participantId: '',
        expectedReturnDate: ''
      });
      setBatchParticipants([]);
      await fetchData();
      setShowAllocateForm(false);
    } catch (err: unknown) {
      setAllocateMessage(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to allocate gear.'
          : 'Failed to allocate gear.'
      );
    } finally {
      setAllocateSubmitting(false);
    }
  };

  // Return Gear Submit
  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnModalAllocation || returnSubmitting) return;

    setReturnSubmitting(true);
    try {
      const res = await returnGear(returnModalAllocation._id, {
        conditionOnReturn: returnCondition
      });
      const fine = res.data.allocation?.fineAmount;
      const reason = res.data.allocation?.fineReason;
      const fineNotice = fine > 0 ? ` (Late/Damage fine assessed: $${fine}${reason ? ` · ${reason}` : ''})` : '';
      setSuccessNotice(`Gear returned successfully.${fineNotice}`);
      setReturnModalAllocation(null);
      setReturnCondition('Good');
      await fetchData();
    } catch (err: unknown) {
      alert(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to return gear.'
          : 'Failed to return gear.'
      );
    } finally {
      setReturnSubmitting(false);
    }
  };

  // Remove / Deactivate Gear
  const handleRemoveGear = async (gearItemId: string, gearName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate "${gearName}"? This will remove it from active inventory.`)) {
      return;
    }
    try {
      await removeGearItem(gearItemId);
      setSuccessNotice(`"${gearName}" deactivated successfully.`);
      await fetchData();
    } catch (err: unknown) {
      setError(
        isAxiosError<{ message?: string }>(err)
          ? err.response?.data?.message || 'Failed to deactivate gear item.'
          : 'Failed to deactivate gear item.'
      );
    }
  };

  return (
    <section className="org-admin-gear-page">
      {/* 1. Page Header */}
      <div className="org-admin-gear-header-row">
        <header className="org-admin-route-heading">
          <p className="org-admin-route-eyebrow">Organization</p>
          <h1>Gear</h1>
          <p>Manage trekking equipment, inventory and field allocations.</p>
        </header>

        {/* Primary Actions */}
        <div className="org-admin-route-actions org-admin-gear-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowCreateForm((prev) => !prev);
              if (showAllocateForm) setShowAllocateForm(false);
            }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>{showCreateForm ? 'Close Form' : '+ Add Gear'}</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setShowAllocateForm((prev) => !prev);
              if (showCreateForm) setShowCreateForm(false);
            }}
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{showAllocateForm ? 'Close Allocation' : 'Allocate Gear'}</span>
          </button>
        </div>
      </div>

      {/* Global Success / Notice Message */}
      {successNotice && (
        <div className="org-admin-gear-notice alert alert-success" role="status">
          <span>{successNotice}</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSuccessNotice('')}
            aria-label="Dismiss message"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div
          className="org-admin-route-error"
          role="alert"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}
        >
          <span>{error}</span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void fetchData()}>
            Retry
          </button>
        </div>
      )}

      {/* Add Gear Drawer/Form */}
      {showCreateForm && (
        <div className="card org-admin-page-form-card" id="create-gear">
          <h2>Create Gear Item</h2>
          <p className="org-admin-form-subtitle">Add new equipment units and configure condition and fee policies.</p>
          <form onSubmit={handleGearSubmit} noValidate>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="gear-name">Item Name</label>
                <input
                  id="gear-name"
                  name="name"
                  value={gearForm.name}
                  placeholder="e.g. 4-Season Expedition Tent"
                  onChange={handleGearChange}
                  onBlur={handleGearBlur}
                  aria-invalid={Boolean(gearValidationErrors.name)}
                  required
                />
                {gearValidationErrors.name && <p className="field-error">{gearValidationErrors.name}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="gear-category">Category</label>
                <input
                  id="gear-category"
                  name="category"
                  value={gearForm.category}
                  placeholder="e.g. Shelter, Backpack, Navigation"
                  onChange={handleGearChange}
                  onBlur={handleGearBlur}
                  aria-invalid={Boolean(gearValidationErrors.category)}
                  required
                />
                {gearValidationErrors.category && <p className="field-error">{gearValidationErrors.category}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="gear-quantity">Total Quantity (Units)</label>
                <input
                  id="gear-quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  value={gearForm.quantity}
                  placeholder="Total units in stock"
                  onChange={handleGearChange}
                  onBlur={handleGearBlur}
                  aria-invalid={Boolean(gearValidationErrors.quantity)}
                  required
                />
                {gearValidationErrors.quantity && <p className="field-error">{gearValidationErrors.quantity}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="gear-condition">Condition</label>
                <select
                  id="gear-condition"
                  name="condition"
                  value={gearForm.condition}
                  onChange={handleGearChange}
                  onBlur={handleGearBlur}
                  required
                >
                  <option value="Good">Good</option>
                  <option value="Poor">Poor</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                </select>
                {gearValidationErrors.condition && <p className="field-error">{gearValidationErrors.condition}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="gear-late-fee">Daily Late Fee ($)</label>
                <input
                  id="gear-late-fee"
                  name="dailyLateFeeRate"
                  type="number"
                  min="0"
                  value={gearForm.dailyLateFeeRate}
                  onChange={handleGearChange}
                  onBlur={handleGearBlur}
                  aria-invalid={Boolean(gearValidationErrors.dailyLateFeeRate)}
                />
                {gearValidationErrors.dailyLateFeeRate && <p className="field-error">{gearValidationErrors.dailyLateFeeRate}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="gear-minor-damage">Minor Damage Fee ($)</label>
                <input
                  id="gear-minor-damage"
                  name="minorDamageFee"
                  type="number"
                  min="0"
                  value={gearForm.minorDamageFee}
                  onChange={handleGearChange}
                  onBlur={handleGearBlur}
                  aria-invalid={Boolean(gearValidationErrors.minorDamageFee)}
                />
                {gearValidationErrors.minorDamageFee && <p className="field-error">{gearValidationErrors.minorDamageFee}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="gear-mod-damage">Moderate Damage Fee ($)</label>
                <input
                  id="gear-mod-damage"
                  name="moderateDamageFee"
                  type="number"
                  min="0"
                  value={gearForm.moderateDamageFee}
                  onChange={handleGearChange}
                  onBlur={handleGearBlur}
                  aria-invalid={Boolean(gearValidationErrors.moderateDamageFee)}
                />
                {gearValidationErrors.moderateDamageFee && <p className="field-error">{gearValidationErrors.moderateDamageFee}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="gear-severe-damage">Severe Damage Fee ($)</label>
                <input
                  id="gear-severe-damage"
                  name="severeDamageFee"
                  type="number"
                  min="0"
                  value={gearForm.severeDamageFee}
                  onChange={handleGearChange}
                  onBlur={handleGearBlur}
                  aria-invalid={Boolean(gearValidationErrors.severeDamageFee)}
                />
                {gearValidationErrors.severeDamageFee && <p className="field-error">{gearValidationErrors.severeDamageFee}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="gear-lost-fee">Lost Item Replacement Fee ($)</label>
                <input
                  id="gear-lost-fee"
                  name="lostItemFee"
                  type="number"
                  min="0"
                  value={gearForm.lostItemFee}
                  onChange={handleGearChange}
                  onBlur={handleGearBlur}
                  aria-invalid={Boolean(gearValidationErrors.lostItemFee)}
                />
                {gearValidationErrors.lostItemFee && <p className="field-error">{gearValidationErrors.lostItemFee}</p>}
              </div>
            </div>

            <div className="org-admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={gearSubmitting}>
                {gearSubmitting ? 'Creating...' : 'Create Gear Item'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
            </div>
          </form>

          {gearMessage && (
            <p
              className={gearMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}
              style={{ marginTop: '1rem' }}
            >
              {gearMessage}
            </p>
          )}
        </div>
      )}

      {/* Allocate Gear Drawer/Form */}
      {showAllocateForm && (
        <div className="card org-admin-page-form-card" id="allocate-gear">
          <h2>Allocate Gear to Participant</h2>
          <p className="org-admin-form-subtitle">Assign an available equipment unit to a participant registered for an upcoming departure batch.</p>
          <form onSubmit={handleAllocateSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="allocate-item">Equipment Item</label>
                <select
                  id="allocate-item"
                  name="gearItemId"
                  value={allocateForm.gearItemId}
                  onChange={(e) => setAllocateForm({ ...allocateForm, gearItemId: e.target.value })}
                  required
                >
                  <option value="">Select Equipment</option>
                  {items.map((item) => {
                    const allocated = activeAllocationsByGearId[item._id] || 0;
                    const available = Math.max(0, (item.quantity || 0) - allocated);
                    return (
                      <option key={item._id} value={item._id} disabled={available === 0}>
                        {item.name} ({available} available of {item.quantity})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="allocate-batch">Departure Batch</label>
                <select
                  id="allocate-batch"
                  name="batchId"
                  value={allocateForm.batchId}
                  onChange={(e) => void handleAllocateBatchChange(e.target.value)}
                  required
                >
                  <option value="">Select a Batch</option>
                  {batches.map((batch) => (
                    <option key={batch._id} value={batch._id}>
                      {batch.batchName} {batch.startDate ? `(${formatDate(batch.startDate)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="allocate-participant">Participant</label>
                <select
                  id="allocate-participant"
                  name="participantId"
                  value={allocateForm.participantId}
                  onChange={(e) => setAllocateForm({ ...allocateForm, participantId: e.target.value })}
                  disabled={!allocateForm.batchId || loadingParticipants}
                  required
                >
                  <option value="">
                    {loadingParticipants
                      ? 'Loading participants…'
                      : !allocateForm.batchId
                      ? 'Select a batch first'
                      : batchParticipants.length === 0
                      ? 'No participants found in batch'
                      : 'Select Participant'}
                  </option>
                  {batchParticipants.map((b) => {
                    const p = b.participantId;
                    return p ? (
                      <option key={p._id} value={p._id}>
                        {p.fullName || 'Participant'} {p.email ? `(${p.email})` : ''}
                      </option>
                    ) : null;
                  })}
                </select>
                {allocateForm.batchId && !loadingParticipants && batchParticipants.length === 0 && (
                  <p className="field-hint" style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    No registered bookings found for this batch.
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="allocate-return-date">Expected Return Date</label>
                <input
                  id="allocate-return-date"
                  type="date"
                  name="expectedReturnDate"
                  min={new Date().toISOString().split('T')[0]}
                  value={allocateForm.expectedReturnDate}
                  onChange={(e) => setAllocateForm({ ...allocateForm, expectedReturnDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="org-admin-form-actions">
              <button type="submit" className="btn btn-primary" disabled={allocateSubmitting}>
                {allocateSubmitting ? 'Allocating…' : 'Allocate Equipment'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAllocateForm(false)}>
                Cancel
              </button>
            </div>
          </form>

          {allocateMessage && (
            <p
              className={allocateMessage.includes('successfully') ? 'alert alert-success' : 'alert alert-error'}
              style={{ marginTop: '1rem' }}
            >
              {allocateMessage}
            </p>
          )}
        </div>
      )}

      {/* 2. Inventory KPI Summary Row */}
      {loading ? (
        <section className="org-admin-gear-kpi-grid" aria-label="Loading equipment metrics">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="org-admin-gear-kpi-card org-admin-gear-kpi-card--skeleton">
              <div className="skeleton-box skeleton-kpi-label" />
              <div className="skeleton-box skeleton-kpi-value" />
              <div className="skeleton-box skeleton-kpi-sub" />
            </div>
          ))}
        </section>
      ) : (
        <section className="org-admin-gear-kpi-grid" aria-label="Equipment Inventory Overview">
          <div className="org-admin-gear-kpi-card">
            <span className="org-admin-gear-kpi-label">Total Equipment</span>
            <div className="org-admin-gear-kpi-value-row">
              <strong className="org-admin-gear-kpi-value">{kpiStats.totalEquipment}</strong>
              <Package size={18} className="org-admin-gear-kpi-icon" aria-hidden="true" />
            </div>
            <span className="org-admin-gear-kpi-sub">Physical units in catalog</span>
          </div>

          <div className="org-admin-gear-kpi-card">
            <span className="org-admin-gear-kpi-label">Available</span>
            <div className="org-admin-gear-kpi-value-row">
              <strong className="org-admin-gear-kpi-value">{kpiStats.availableEquipment}</strong>
              <CheckCircle2 size={18} className="org-admin-gear-kpi-icon icon-available" aria-hidden="true" />
            </div>
            <span className="org-admin-gear-kpi-sub">Ready for field deployment</span>
          </div>

          <div className="org-admin-gear-kpi-card">
            <span className="org-admin-gear-kpi-label">Allocated</span>
            <div className="org-admin-gear-kpi-value-row">
              <strong className="org-admin-gear-kpi-value">{kpiStats.allocatedEquipment}</strong>
              <Compass size={18} className="org-admin-gear-kpi-icon icon-allocated" aria-hidden="true" />
            </div>
            <span className="org-admin-gear-kpi-sub">Currently in field use</span>
          </div>

          <div className="org-admin-gear-kpi-card">
            <span className="org-admin-gear-kpi-label">Poor / Damaged</span>
            <div className="org-admin-gear-kpi-value-row">
              <strong className="org-admin-gear-kpi-value">{kpiStats.poorOrDamaged}</strong>
              <AlertTriangle size={18} className="org-admin-gear-kpi-icon icon-warning" aria-hidden="true" />
            </div>
            <span className="org-admin-gear-kpi-sub">Requires inspection or repair</span>
          </div>
        </section>
      )}

      {/* 3 & 4. Equipment Inventory Section */}
      <section className="org-admin-gear-inventory-section" aria-labelledby="gear-inventory-heading">
        <div className="org-admin-gear-section-header">
          <div className="org-admin-gear-section-title-wrap">
            <Layers size={18} className="org-admin-gear-kpi-icon" aria-hidden="true" />
            <h2 id="gear-inventory-heading" className="org-admin-gear-section-title">
              Equipment Inventory
            </h2>
            <span className="org-admin-gear-section-count">{items.length}</span>
          </div>
          <p className="org-admin-gear-section-desc">
            Operational expedition gear catalog with unit counts, condition records, and allocation status.
          </p>
        </div>

        {loading ? (
          <div className="org-admin-gear-grid" aria-label="Loading equipment items">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="org-admin-gear-card org-admin-gear-card--skeleton" aria-hidden="true">
                <div className="skeleton-box skeleton-gear-eyebrow" />
                <div className="skeleton-box skeleton-gear-name" />
                <div className="skeleton-box skeleton-gear-metrics" />
                <div className="skeleton-box skeleton-gear-actions" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="org-admin-gear-empty">
            <Package size={40} aria-hidden="true" />
            <h3>No equipment found</h3>
            <p>Add expedition equipment, tents, backpacks, and safety gear to begin tracking field inventory.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              + Add Gear
            </button>
          </div>
        ) : (
          <div className="org-admin-gear-grid">
            {items.map((item) => {
              const totalQty = item.quantity || 0;
              const allocatedQty = activeAllocationsByGearId[item._id] || 0;
              const availableQty = Math.max(0, totalQty - allocatedQty);
              const conditionLower = (item.condition || 'good').toLowerCase();

              return (
                <article className="org-admin-gear-card" key={item._id}>
                  <div className="org-admin-gear-card__top">
                    <div className="org-admin-gear-card__eyebrow-row">
                      <span className="org-admin-gear-card__category">
                        {item.category ? item.category.toUpperCase() : 'EQUIPMENT'}
                      </span>
                      <span className={`org-admin-gear-condition-badge condition-${conditionLower}`}>
                        {item.condition || 'Good'}
                      </span>
                    </div>
                    <h3 className="org-admin-gear-card__name">{item.name}</h3>
                  </div>

                  {/* Operational Metrics Row */}
                  <div className="org-admin-gear-card__metrics">
                    <div className="org-admin-gear-metric">
                      <span className="org-admin-gear-metric__label">TOTAL</span>
                      <strong className="org-admin-gear-metric__value">{totalQty}</strong>
                      <span className="org-admin-gear-metric__unit">units</span>
                    </div>
                    <div className="org-admin-gear-metric">
                      <span className="org-admin-gear-metric__label">AVAILABLE</span>
                      <strong className="org-admin-gear-metric__value metric-available">{availableQty}</strong>
                      <span className="org-admin-gear-metric__unit">units</span>
                    </div>
                    <div className="org-admin-gear-metric">
                      <span className="org-admin-gear-metric__label">ALLOCATED</span>
                      <strong className="org-admin-gear-metric__value metric-allocated">{allocatedQty}</strong>
                      <span className="org-admin-gear-metric__unit">units</span>
                    </div>
                  </div>

                  {/* Fee Preview if available */}
                  {item.dailyLateFeeRate != null && item.dailyLateFeeRate > 0 && (
                    <div className="org-admin-gear-card__fee-preview">
                      <span>Daily late rate:</span>
                      <span className="org-admin-gear-card__fee-val">${item.dailyLateFeeRate}/day</span>
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="org-admin-gear-card__actions">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm org-admin-gear-btn-allocate"
                      disabled={availableQty === 0}
                      onClick={() => handleStartAllocate(item._id)}
                      title={availableQty === 0 ? 'All units currently allocated' : 'Allocate this item to a participant'}
                    >
                      <CheckCircle2 size={13} aria-hidden="true" />
                      <span>{availableQty === 0 ? 'Allocated' : 'Allocate'}</span>
                    </button>

                    <Link
                      to={`/dashboard/org-admin/gear/${item._id}`}
                      className="btn btn-secondary btn-sm org-admin-gear-btn-details"
                      aria-label={`View details and fee schedule for ${item.name}`}
                    >
                      <span>Details</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>

                    <button
                      type="button"
                      className="org-admin-gear-btn-remove"
                      onClick={() => void handleRemoveGear(item._id, item.name)}
                      title="Deactivate item"
                      aria-label={`Deactivate ${item.name}`}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Active Allocations Section */}
      <section className="org-admin-allocations-section" aria-labelledby="active-allocations-heading">
        <div className="org-admin-allocations-header">
          <div className="org-admin-allocations-title-wrap">
            <Compass size={18} className="org-admin-gear-kpi-icon icon-allocated" aria-hidden="true" />
            <h2 id="active-allocations-heading" className="org-admin-allocations-title">
              Active Allocations
            </h2>
            <span className="org-admin-allocations-count">{allocations.length}</span>
          </div>
          <p className="org-admin-allocations-desc">
            Equipment currently checked out and deployed with participants across scheduled departure batches.
          </p>
        </div>

        {loading ? (
          <div className="org-admin-allocations-grid" aria-label="Loading active allocations">
            {[1, 2, 3].map((n) => (
              <div key={n} className="org-admin-allocation-card org-admin-gear-card--skeleton" aria-hidden="true">
                <div className="skeleton-box skeleton-gear-eyebrow" />
                <div className="skeleton-box skeleton-gear-name" />
                <div className="skeleton-box skeleton-gear-metrics" />
                <div className="skeleton-box skeleton-gear-actions" />
              </div>
            ))}
          </div>
        ) : allocations.length === 0 ? (
          <div className="org-admin-allocations-empty">
            <PackageCheck size={36} aria-hidden="true" />
            <p>No active allocations. All equipment units are currently checked into inventory.</p>
          </div>
        ) : (
          <div className="org-admin-allocations-grid">
            {allocations.map((alloc) => {
              const gearName =
                typeof alloc.gearItemId === 'object' && alloc.gearItemId ? alloc.gearItemId.name : 'Gear Item';
              const participantName =
                typeof alloc.participantId === 'object' && alloc.participantId
                  ? alloc.participantId.fullName
                  : 'Assigned Participant';
              const batchIdStr =
                typeof alloc.batchId === 'object' && alloc.batchId ? alloc.batchId._id : alloc.batchId;
              const batchName =
                typeof alloc.batchId === 'object' && alloc.batchId?.batchName
                  ? alloc.batchId.batchName
                  : batchMap.get(batchIdStr)?.batchName || 'Departure Batch';
              const isOverdue = alloc.expectedReturnDate && new Date(alloc.expectedReturnDate) < new Date();

              return (
                <article className="org-admin-allocation-card" key={alloc._id}>
                  <div>
                    <div className="org-admin-allocation-card__header">
                      <div className="org-admin-allocation-item-info">
                        <span className="org-admin-allocation-eyebrow">FIELD DEPLOYMENT</span>
                        <h3 className="org-admin-allocation-gear-name">{gearName}</h3>
                      </div>
                      <span className={`org-admin-allocation-status-badge ${isOverdue ? 'status-overdue' : 'status-in-field'}`}>
                        {isOverdue ? 'Overdue' : 'In Field'}
                      </span>
                    </div>

                    <div className="org-admin-allocation-details-grid">
                      <div className="org-admin-alloc-detail">
                        <span className="org-admin-alloc-detail__label">Batch</span>
                        <span className="org-admin-alloc-detail__val">
                          <CalendarDays size={12} aria-hidden="true" />
                          <span>{batchName}</span>
                        </span>
                      </div>
                      <div className="org-admin-alloc-detail">
                        <span className="org-admin-alloc-detail__label">Assigned Person</span>
                        <span className="org-admin-alloc-detail__val">
                          <User size={12} aria-hidden="true" />
                          <span>{participantName}</span>
                        </span>
                      </div>
                      <div className="org-admin-alloc-detail">
                        <span className="org-admin-alloc-detail__label">Quantity</span>
                        <span className="org-admin-alloc-detail__val">1 unit</span>
                      </div>
                      <div className="org-admin-alloc-detail">
                        <span className="org-admin-alloc-detail__label">Expected Return</span>
                        <span className="org-admin-alloc-detail__val">
                          {formatDate(alloc.expectedReturnDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="org-admin-allocation-card__footer">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm org-admin-alloc-return-btn"
                      onClick={() => setReturnModalAllocation(alloc)}
                    >
                      <ArrowDownLeft size={13} aria-hidden="true" />
                      <span>Return Gear</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 6 & 7. Return Gear Modal Dialog */}
      {returnModalAllocation && (
        <div className="org-admin-modal-backdrop" onClick={() => setReturnModalAllocation(null)}>
          <div className="org-admin-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="org-admin-modal-header">
              <h3>Return Equipment</h3>
              <button
                type="button"
                className="org-admin-modal-close"
                onClick={() => setReturnModalAllocation(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="org-admin-modal-desc">
              Inspect and record return condition for{' '}
              <strong>
                {typeof returnModalAllocation.gearItemId === 'object' && returnModalAllocation.gearItemId
                  ? returnModalAllocation.gearItemId.name
                  : 'Equipment'}
              </strong>{' '}
              assigned to{' '}
              <strong>
                {typeof returnModalAllocation.participantId === 'object' && returnModalAllocation.participantId
                  ? returnModalAllocation.participantId.fullName
                  : 'Participant'}
              </strong>
              .
            </p>
            <form onSubmit={handleReturnSubmit}>
              <div className="form-group">
                <label htmlFor="return-condition">Condition on Return</label>
                <select
                  id="return-condition"
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  required
                >
                  <option value="Good">Good (Normal Wear / No Damage)</option>
                  <option value="Minor">Minor Damage</option>
                  <option value="Moderate">Moderate Damage</option>
                  <option value="Severe">Severe Damage</option>
                  <option value="Lost">Lost Item (Full Replacement Assessment)</option>
                </select>
              </div>

              <div className="org-admin-form-actions">
                <button type="submit" className="btn btn-primary" disabled={returnSubmitting}>
                  {returnSubmitting ? 'Processing Return…' : 'Confirm Return'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setReturnModalAllocation(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
