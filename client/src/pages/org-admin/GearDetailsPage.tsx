import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import { Backpack, PackageCheck } from 'lucide-react';
import { getMyOrgBatches } from '../../services/batchService';
import { getMyOrgAllocations, getGearItemById } from '../../services/gearService';
import type { BatchSummary, GearItemSummary } from '../../types';
import './GearDetailsPage.css';

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
  gearItemId: string | { _id: string; name?: string } | null;
  participantId: string | { _id: string; fullName?: string } | null;
  batchId: string | { _id: string; batchName?: string } | null;
  allocatedAt?: string;
  expectedReturnDate?: string;
  returnedAt?: string | null;
  conditionOnReturn?: string;
  fineAmount?: number;
  fineReason?: string;
};

type BatchDetails = BatchSummary & { _id: string };

function getReferenceId(reference: string | { _id: string } | null | undefined) {
  return typeof reference === 'object' && reference !== null ? reference._id : reference;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

function getErrorMessage(error: unknown, fallback: string) {
  return isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || fallback
    : fallback;
}

export default function GearDetailsPage() {
  const { gearItemId } = useParams<{ gearItemId: string }>();
  const [gearItem, setGearItem] = useState<GearItem | null>(null);
  const [allocations, setAllocations] = useState<GearAllocation[]>([]);
  const [batches, setBatches] = useState<BatchDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allocationsError, setAllocationsError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchDetails = async () => {
      if (!gearItemId) {
        setError('Gear item ID is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      setAllocationsError('');

      try {
        const gearResponse = await getGearItemById(gearItemId);
        if (!active) return;

        const selectedItem: GearItem = gearResponse.data.gearItem;
        if (!selectedItem) {
          setGearItem(null);
          setAllocations([]);
          setError('Gear item not found in your organization.');
          return;
        }

        setGearItem(selectedItem);
        const [allocationResult, batchResult] = await Promise.allSettled([
          getMyOrgAllocations(),
          getMyOrgBatches()
        ]);
        if (!active) return;

        if (allocationResult.status === 'fulfilled') {
          const organizationAllocations: GearAllocation[] = allocationResult.value.data.allocations || [];
          setAllocations(organizationAllocations.filter(
            (allocation) => getReferenceId(allocation.gearItemId) === gearItemId
          ));
        } else {
          console.error(allocationResult.reason);
          setAllocationsError(getErrorMessage(allocationResult.reason, 'Unable to load gear allocations.'));
        }

        if (batchResult.status === 'fulfilled') {
          setBatches(batchResult.value.data.batches || []);
        } else {
          console.error(batchResult.reason);
          setAllocationsError((current) => current
            ? `${current} Batch names could not be loaded.`
            : 'Batch names could not be loaded for allocations.');
        }
      } catch (err) {
        console.error(err);
        if (active) setError(getErrorMessage(err, 'Unable to load gear details.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchDetails();
    return () => { active = false; };
  }, [gearItemId]);

  if (loading) {
    return <p className="org-admin-gear-details-state">Loading gear details…</p>;
  }

  if (error || !gearItem) {
    return (
      <section className="org-admin-gear-details-page">
        <Link className="org-admin-gear-details-back" to="/dashboard/org-admin/gear">← Back to Gear</Link>
        <p className="org-admin-route-error" role="alert">{error || 'Gear item not found.'}</p>
      </section>
    );
  }

  const allocationBatchName = (allocation: GearAllocation) => {
    if (typeof allocation.batchId === 'object' && allocation.batchId !== null && allocation.batchId.batchName) {
      return allocation.batchId.batchName;
    }
    const batchId = getReferenceId(allocation.batchId);
    return batches.find((batch) => batch._id === batchId)?.batchName;
  };

  const fees = [
    { label: 'Daily late fee', value: gearItem.dailyLateFeeRate },
    { label: 'Minor damage', value: gearItem.minorDamageFee },
    { label: 'Moderate damage', value: gearItem.moderateDamageFee },
    { label: 'Severe damage', value: gearItem.severeDamageFee },
    { label: 'Lost item', value: gearItem.lostItemFee }
  ].filter((fee): fee is { label: string; value: number } => fee.value != null);

  return (
    <section className="org-admin-gear-details-page">
      <Link className="org-admin-gear-details-back" to="/dashboard/org-admin/gear">← Back to Gear</Link>

      <header className="org-admin-gear-details-heading">
        <p className="org-admin-route-eyebrow">Gear Details</p>
        <h1>{gearItem.name}</h1>
      </header>

      <div className="org-admin-gear-details-overview">
        <article className="org-admin-gear-details-summary">
          <div className="org-admin-gear-details-item-heading">
            <span className="org-admin-gear-details-icon" aria-hidden="true"><Backpack size={23} /></span>
            <div>
              <h2>{gearItem.name}</h2>
              {gearItem.category && <p>{gearItem.category}</p>}
            </div>
            {gearItem.availabilityStatus && (
              <span className="org-admin-gear-details-availability">{gearItem.availabilityStatus}</span>
            )}
          </div>
          <dl className="org-admin-gear-details-stats">
            <div><dt>Quantity</dt><dd>{gearItem.quantity}</dd></div>
            {gearItem.condition && <div><dt>Condition</dt><dd>{gearItem.condition}</dd></div>}
          </dl>
        </article>

        {fees.length > 0 && (
          <section className="org-admin-gear-details-fees">
            <div className="org-admin-gear-details-section-heading">
              <div>
                <p className="org-admin-route-eyebrow">Fees</p>
                <h2>Fee Structure</h2>
              </div>
            </div>
            <dl>
              {fees.map((fee) => (
                <div key={fee.label}>
                  <dt>{fee.label}</dt>
                  <dd>${fee.value.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      <section className="org-admin-gear-details-allocations">
        <div className="org-admin-gear-details-section-heading">
          <div>
            <p className="org-admin-route-eyebrow">Inventory activity</p>
            <h2>Allocations</h2>
          </div>
        </div>
        {allocationsError && <p className="org-admin-route-error" role="alert">{allocationsError}</p>}
        {!allocationsError && allocations.length === 0 ? (
          <div className="org-admin-gear-details-empty">
            <PackageCheck size={24} aria-hidden="true" />
            <p>No allocations for this gear item yet.</p>
          </div>
        ) : allocations.length > 0 ? (
          <div className="org-admin-gear-details-allocation-grid">
            {allocations.map((allocation) => {
              const participantName = typeof allocation.participantId === 'object' && allocation.participantId
                ? allocation.participantId.fullName
                : undefined;
              const batchName = allocationBatchName(allocation);
              return (
                <article className="org-admin-gear-details-allocation-card" key={allocation._id}>
                  <div className="org-admin-gear-details-allocation-heading">
                    <h3>{batchName || 'Allocation'}</h3>
                    <span className={`org-admin-gear-details-allocation-status ${allocation.returnedAt ? 'returned' : 'active'}`}>
                      {allocation.returnedAt ? 'Returned' : 'Allocated'}
                    </span>
                  </div>
                  {participantName && <p className="org-admin-gear-details-participant">{participantName}</p>}
                  <dl>
                    {formatDate(allocation.allocatedAt) && (
                      <div><dt>Allocated</dt><dd>{formatDate(allocation.allocatedAt)}</dd></div>
                    )}
                    {formatDate(allocation.expectedReturnDate) && (
                      <div><dt>Expected return</dt><dd>{formatDate(allocation.expectedReturnDate)}</dd></div>
                    )}
                    {formatDate(allocation.returnedAt) && (
                      <div><dt>Returned</dt><dd>{formatDate(allocation.returnedAt)}</dd></div>
                    )}
                    {allocation.conditionOnReturn && (
                      <div><dt>Return condition</dt><dd>{allocation.conditionOnReturn}</dd></div>
                    )}
                    {allocation.fineAmount != null && allocation.fineAmount > 0 && (
                      <div><dt>Fine{allocation.fineReason ? ` · ${allocation.fineReason}` : ''}</dt><dd>${allocation.fineAmount.toLocaleString()}</dd></div>
                    )}
                  </dl>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </section>
  );
}
