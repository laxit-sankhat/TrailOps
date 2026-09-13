import BatchAssignment from '../models/BatchAssignment.js';
import OrganizationMembership from '../models/OrganizationMembership.js';
import Batch from '../models/Batch.js';
import Trip from '../models/Trip.js';

export const createBatchAssignment = async (req, res) => {
  try {
    const { batchId, userId, roleInBatch, supervisingTrekLeaderId } = req.body;

    if (!['TrekLeader', 'Volunteer'].includes(roleInBatch)) {
      return res.status(400).json({ success: false, message: 'roleInBatch must be TrekLeader or Volunteer' });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const trip = await Trip.findById(batch.tripId);
    if (trip.organizationId.toString() !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'This batch does not belong to your organization' });
    }

    if (roleInBatch === 'TrekLeader') {
      const membership = await OrganizationMembership.findOne({
        userId,
        organizationId: req.user.organizationId,
        role: 'TrekLeader'
      });

      if (!membership) {
        return res.status(400).json({ success: false, message: 'This user is not a Trek Leader in your organization' });
      }
    }

    if (roleInBatch === 'Volunteer' && !supervisingTrekLeaderId) {
      return res.status(400).json({ success: false, message: 'supervisingTrekLeaderId is required when assigning a Volunteer' });
    }

    const existingAssignment = await BatchAssignment.find({ userId });

    const newBatch = batch; 

    for (const existing of existingAssignment) {
      const extingBatch = await Batch.findById(existing.batchId);

      if(!extingBatch) continue;

      // Standard interval-overlap check: two date ranges overlap if each one's
      // start is before or on the other's end. Prevents assigning the same Trek
      // Leader/Volunteer to two batches happening at overlapping times.
      const overlaps = newBatch.startDate <= existingBatch.endDate && existingBatch.startDate <= newBatch.endDate;

      if(overlaps)
        return res.status(409).json({
          sucess: false,
          message: `This user is already assigned to another batch (${existingBatch.batchName}) with overlapping dates`
        });
    }  
      
    const assignment = await BatchAssignment.create({
      batchId,
      userId,
      roleInBatch,
      supervisingTrekLeaderId: roleInBatch === 'Volunteer' ? supervisingTrekLeaderId : undefined
    });

    res.status(201).json({ success: true, assignment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const removeBatchAssignment = async (req, res) => {
  try {
    const assignment = await BatchAssignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

    await BatchAssignment.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Assignment removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};