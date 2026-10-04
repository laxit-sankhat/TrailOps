import mongoose from 'mongoose';
import Checkpoint from '../models/Checkpoint.js';
import Booking from '../models/Booking.js';
import BatchAssignment from '../models/BatchAssignment.js';
import Attendance from '../models/Attendance.js';
import Batch from '../models/Batch.js';

export const createCheckpoint = async (req, res) => {
    try{
        const { batchId, name, sequenceOrder } = req.body;      

        // This checks assignment to THIS SPECIFIC batch, not just org membership -
        // a Trek Leader in the same org but on a different trek should not be able
        // to mark attendance or add checkpoints for a batch they're not running.
        const assignment = await BatchAssignment.findOne({
            batchId,
            userId: req.user.userId,
            roleInBatch: 'TrekLeader'
        });

        if(!assignment)
            return res.status(403).json({ success: false, message: 'You are not assigned as Trek Leader for this batch' });

        const checkpoint = await Checkpoint.create({ batchId, name, sequenceOrder });

        res.status(201).json({ success: true, checkpoint });
    }
    catch(err){
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const markAttendanceManual = async (req, res) => {
    try{
        const { participantId, checkpointId, batchId } = req.body;

        if (!participantId || !checkpointId || !batchId) {
            return res.status(400).json({ success: false, message: 'participantId, checkpointId, and batchId are required' });
        }

        if (!mongoose.isValidObjectId(participantId) || !mongoose.isValidObjectId(checkpointId) || !mongoose.isValidObjectId(batchId)) {
            return res.status(400).json({ success: false, message: 'Invalid ID format' });
        }
        
        const assignment = await BatchAssignment.findOne({
            batchId,
            userId: req.user.userId,
            roleInBatch: { $in: ['TrekLeader', 'Volunteer'] }
        });

        if(!assignment)
            return res.status(403).json({ success: false, message: 'You are not assigned to this batch' });

        const batch = await Batch.findById(batchId);
        if (!batch) {
          return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        if (batch.status === 'Completed') {
          return res.status(400).json({ success: false, message: 'Cannot mark attendance for a completed batch' });
        }

        const now = new Date();
        if (now < batch.startDate) {
          return res.status(400).json({ success: false, message: 'This trek has not started yet' });
        }

        // For markAttendanceManual specifically (QR version already checks booking status via the booking lookup):
        const booking = await Booking.findOne({ participantId, batchId, status: 'Confirmed' });
        if (!booking) {
          return res.status(400).json({ success: false, message: 'This participant does not have a confirmed booking for this batch' });
        }

        const existingAttendance = await Attendance.findOne({ participantId, checkpointId });
        if (existingAttendance) {
          return res.status(409).json({ success: false, message: 'Attendance already marked for this checkpoint' });
        }

        const markedByUserId = req.user.userId;

        const attendance = await Attendance.create({ participantId, checkpointId, batchId, markedByUserId });

        res.status(201).json({ success: true, attendance });
    }
    catch(err){
        if (err.code === 11000) {
          return res.status(409).json({ success: false, message: 'Attendance already marked for this checkpoint' });
        }
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to mark attendance' });
    }
};

export const markAttendanceByQR = async (req, res) => {
  try {
    const { qrCodeValue, checkpointId } = req.body;

    if (!qrCodeValue) {
      return res.status(400).json({ success: false, message: 'qrCodeValue is required' });
    }

    if (!checkpointId) {
      return res.status(400).json({ success: false, message: 'checkpointId is required' });
    }

    if (!mongoose.isValidObjectId(qrCodeValue)) {
      return res.status(400).json({ success: false, message: 'Invalid QR code - invalid booking ID' });
    }

    if (!mongoose.isValidObjectId(checkpointId)) {
      return res.status(400).json({ success: false, message: 'Invalid checkpoint ID' });
    }

    const booking = await Booking.findById(qrCodeValue);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Invalid QR code - booking not found' });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ success: false, message: 'This booking is not confirmed - cannot mark attendance' });
    }

    const batch = await Batch.findById(booking.batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (batch.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Cannot mark attendance for a completed batch' });
    }

    const now = new Date();
    if (now < batch.startDate) {
      return res.status(400).json({ success: false, message: 'This trek has not started yet' });
    }

    const assignment = await BatchAssignment.findOne({
      batchId: booking.batchId,
      userId: req.user.userId,
      roleInBatch: { $in: ['TrekLeader', 'Volunteer', 'OrgAdmin'] }
    });

    if (!assignment && req.user.role !== 'OrgAdmin') {
      return res.status(403).json({ success: false, message: 'You are not assigned to this batch' });
    }

    if (req.user.role === 'OrgAdmin') {
      if (!req.user.organizationId || batch.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'This batch does not belong to your organization' });
      }
    }

    const existingAttendance = await Attendance.findOne({
      participantId: booking.participantId,
      checkpointId
    });

    if (existingAttendance) {
      return res.status(409).json({ success: false, message: 'Attendance already marked for this checkpoint' });
    }

    const attendance = await Attendance.create({
      participantId: booking.participantId,
      checkpointId,
      batchId: booking.batchId,
      markedByUserId: req.user.userId
    });

    res.status(201).json({ success: true, attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to mark attendance by QR' });
  }
};

export const getCheckpointsByBatch = async (req, res) => {
  try {
    const assignment = await BatchAssignment.findOne({
      batchId: req.params.batchId,
      userId: req.user.userId,
      roleInBatch: { $in: ['TrekLeader', 'Volunteer'] }
    });

    if (!assignment) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this batch' });
    }

    const checkpoints = await Checkpoint.find({ batchId: req.params.batchId })
      .sort({ sequenceOrder: 1 });
    res.status(200).json({ success: true, checkpoints });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};