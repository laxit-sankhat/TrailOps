import Incident from "../models/Incident.js";
import BatchAssignment from '../models/BatchAssignment.js';
import Batch from '../models/Batch.js';

export const logIncident = async (req, res) => {
  try {
    const { sosAlertId, batchId, affectedParticipantId, description, actionTaken } = req.body;

    const assignment = await BatchAssignment.findOne({
      batchId,
      userId: req.user.userId,
      roleInBatch: 'TrekLeader'
    });

    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You are not assigned as Trek Leader for this batch' });
    }

    const incident = await Incident.create({
      sosAlertId: sosAlertId || null,
      batchId,
      affectParticipantId: affectedParticipantId,
      description,
      actionTaken,
      loggedByUserId: req.user.userId
    });

    res.status(201).json({ success: true, incident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addVolunteerNote = async (req, res) => {
  try {
    const { volunteerNotes } = req.body;

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const assignment = await BatchAssignment.findOne({
      batchId: incident.batchId,
      userId: req.user.userId,
      roleInBatch: 'Volunteer'
    });

    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You are not assigned as Volunteer for this batch' });
    }

    incident.volunteerNotes = volunteerNotes;
    await incident.save();

    res.status(200).json({ success: true, incident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getIncidentsForBatch = async (req, res) => {
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

    const incidents = await Incident.find({ batchId: batch._id });
    res.status(200).json({ success: true, incidents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};