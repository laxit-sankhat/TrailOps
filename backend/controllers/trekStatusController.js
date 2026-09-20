import TrekStatusUpdate from '../models/TrekStatusUpdate.js';
import BatchAssignment from '../models/BatchAssignment.js';

export const postTrekStatusUpdate = async (req, res) => {
  try {
    const { batchId, milestone } = req.body;

    const assignment = await BatchAssignment.findOne({
      batchId,
      userId: req.user.userId,
      roleInBatch: 'TrekLeader'
    });

    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You are not assigned as Trek Leader for this batch' });
    }

    const update = await TrekStatusUpdate.create({
      batchId,
      milestone,
      updatedByUserId: req.user.userId
    });

    res.status(201).json({ success: true, update });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTrekStatusHistory = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    // Add real scoping - e.g. Participant must have an actual booking in this batch,
    // staff must belong to the batch's org. For now, minimum fix: block cross-org access.
    if (req.user.role !== 'SuperAdmin' && batch.organizationId?.toString() !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'This batch does not belong to your organization' });
    }

    const updates = await TrekStatusUpdate.find({ batchId: req.params.batchId }).sort({ timestamp: 1 });
    res.status(200).json({ success: true, updates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};