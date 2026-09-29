import SOSAlert from '../models/SOSAlert.js';
import BatchAssignment from '../models/BatchAssignment.js';
import Batch from '../models/Batch.js';

export const triggerSOS = async (req, res) => {
  try {
    const { batchId, emergencyType } = req.body;

    const assignment = await BatchAssignment.findOne({
      batchId,
      userId: req.user.userId,
      roleInBatch: 'TrekLeader'
    });

    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You are not assigned as Trek Leader for this batch' });
    }

    const sosAlert = await SOSAlert.create({
      batchId,
      triggeredByUserId: req.user.userId,
      emergencyType,
      status: 'Open'
    });

    res.status(201).json({ success: true, sosAlert });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSOSAlertsForBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (['TrekLeader', 'Volunteer'].includes(req.user.role)) {
      const assignment = await BatchAssignment.findOne({
        batchId: batch._id,
        userId: req.user.userId,
        roleInBatch: req.user.role
      });
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this batch' });
      }
    } else if (batch.organizationId.toString() !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'This batch does not belong to your organization' });
    }

    const alerts = await SOSAlert.find({ batchId: batch._id, status: 'Open' });
    res.status(200).json({ success: true, alerts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};