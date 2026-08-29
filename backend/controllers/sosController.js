import SOSAlert from '../models/SOSAlert.js';
import BatchAssignment from '../models/BatchAssignment.js';

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