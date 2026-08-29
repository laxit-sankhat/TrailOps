import GearItem from '../models/GearItem.js';
import GearAllocation from '../models/GearAllocation.js';

export const createGearItem = async (req, res) => {
  try {
    const {
      name, category, quantity, condition,
      dailyLateFeeRate, minorDamageFee, moderateDamageFee, severeDamageFee, lostItemFee
    } = req.body;

    const gearItem = await GearItem.create({
      organizationId: req.user.organizationId, // from token, same pattern as createTrip
      name,
      category,
      quantity,
      condition,
      dailyLateFeeRate,
      minorDamageFee,
      moderateDamageFee,
      severeDamageFee,
      lostItemFee
    });

    res.status(201).json({ success: true, gearItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const allocateGear = async (req, res) => {
  try {
    const { gearItemId, participantId, batchId, expectedReturnDate } = req.body;

    const gearItem = await GearItem.findById(gearItemId);
    if (!gearItem) {
      return res.status(404).json({ success: false, message: 'Gear item not found' });
    }

    if (gearItem.organizationId.toString() !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'This gear item does not belong to your organization' });
    }

    const activeAllocations = await GearAllocation.countDocuments({
      gearItemId,
      returnedAt: null
    });

    if (activeAllocations >= gearItem.quantity) {
      return res.status(400).json({ success: false, message: 'No units of this gear item are currently available' });
    }

    const allocation = await GearAllocation.create({
      gearItemId,
      participantId,
      batchId,
      expectedReturnDate
    });

    res.status(201).json({ success: true, allocation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const returnGear = async (req, res) => {
  try {
    const { conditionOnReturn } = req.body;

    const allocation = await GearAllocation.findById(req.params.id);
    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Allocation not found' });
    }

    const gearItem = await GearItem.findById(allocation.gearItemId);

    const now = new Date();
    let fineAmount = 0;
    let fineReason = 'None';

    // Late fee calculation
    if (allocation.expectedReturnDate && now > allocation.expectedReturnDate) {
      const msLate = now - allocation.expectedReturnDate;
      const daysLate = Math.ceil(msLate / (1000 * 60 * 60 * 24));
      fineAmount += daysLate * gearItem.dailyLateFeeRate;
      fineReason = 'Late';
    }

    // Damage/loss fee calculation (additive with late fee)
    if (conditionOnReturn === 'Minor') {
      fineAmount += gearItem.minorDamageFee;
      fineReason = fineReason === 'None' ? 'MinorDamage' : fineReason;
    } else if (conditionOnReturn === 'Moderate') {
      fineAmount += gearItem.moderateDamageFee;
      fineReason = fineReason === 'None' ? 'ModerateDamage' : fineReason;
    } else if (conditionOnReturn === 'Severe') {
      fineAmount += gearItem.severeDamageFee;
      fineReason = fineReason === 'None' ? 'SevereDamage' : fineReason;
    } else if (conditionOnReturn === 'Lost') {
      fineAmount = gearItem.lostItemFee; // lost overrides everything - full replacement, not additive
      fineReason = 'Lost';
    }

    allocation.returnedAt = now;
    allocation.conditionOnReturn = conditionOnReturn;
    allocation.fineAmount = fineAmount;
    allocation.fineReason = fineReason;
    await allocation.save();

    res.status(200).json({ success: true, allocation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};