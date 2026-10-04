import crypto from 'crypto';
import mongoose from 'mongoose';
import BookingGroup from '../models/BookingGroup.js';
import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';
import Trip from '../models/Trip.js';
import { withTransaction } from '../utils/transactionHelper.js';

const ACTIVE_STATUSES = ['Inquiry', 'PendingMedicalReview', 'MedicallyApproved', 'Confirmed'];

export const createBookingGroup = async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }

    if (!mongoose.isValidObjectId(batchId)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID' });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const trip = await Trip.findById(batch.tripId);
    if (!trip) return res.status(404).json({ success: false, message: 'Associated trip not found' });
    if (trip.status === 'Inactive') {
      return res.status(400).json({
        success: false,
        message: 'This trip is currently inactive and not accepting new bookings.'
      });
    }

    const existingActiveOrWaitlistedBooking = await Booking.findOne({
      participantId: req.user.userId,
      batchId,
      status: { $in: [...ACTIVE_STATUSES, 'Waitlisted'] }
    });

    if (existingActiveOrWaitlistedBooking) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active or waitlisted booking for this batch'
      });
    }

    const groupCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const group = await BookingGroup.create({
      batchId,
      organizationId: trip.organizationId,
      initiatorId: req.user.userId,
      groupCode
    });

    const booking = await Booking.create({
      participantId: req.user.userId,
      batchId,
      tripId: batch.tripId,
      organizationId: trip.organizationId,
      groupId: group._id,
      status: 'Draft'
    });

    res.status(201).json({ success: true, group, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create booking group' });
  }
};

export const joinBookingGroup = async (req, res) => {
  try {
    const { groupCode } = req.body;

    if (!groupCode || typeof groupCode !== 'string') {
      return res.status(400).json({ success: false, message: 'groupCode is required' });
    }

    const group = await BookingGroup.findOne({ groupCode: groupCode.trim() });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.status !== 'Open') {
      return res.status(400).json({
        success: false,
        message: group.status === 'Cancelled' ? 'This group has been cancelled' : 'This group is no longer open for joining'
      });
    }

    const alreadyIn = await Booking.findOne({ groupId: group._id, participantId: req.user.userId });
    if (alreadyIn) return res.status(400).json({ success: false, message: 'You have already joined this group' });

    const existingActiveOrWaitlistedBooking = await Booking.findOne({
      participantId: req.user.userId,
      batchId: group.batchId,
      status: { $in: [...ACTIVE_STATUSES, 'Waitlisted'] }
    });

    if (existingActiveOrWaitlistedBooking) {
      return res.status(409).json({
        success: false,
        message: 'You already have an active or waitlisted booking for this batch'
      });
    }

    const batch = await Batch.findById(group.batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const trip = await Trip.findById(batch.tripId);
    if (!trip) return res.status(404).json({ success: false, message: 'Associated trip not found' });
    if (trip.status === 'Inactive') {
      return res.status(400).json({
        success: false,
        message: 'This trip is currently inactive and not accepting new bookings.'
      });
    }

    const booking = await Booking.create({
      participantId: req.user.userId,
      batchId: group.batchId,
      tripId: batch.tripId,
      organizationId: group.organizationId,
      groupId: group._id,
      status: 'Draft'
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to join booking group' });
  }
};

export const submitBookingGroup = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid group ID' });
    }

    const result = await withTransaction(async (session) => {
      // 1. Load the BookingGroup inside the transaction using session
      const group = await BookingGroup.findById(req.params.id).session(session);
      if (!group) {
        const err = new Error('Group not found');
        err.statusCode = 404;
        throw err;
      }

      // 2. Validate initiator and open status
      if (group.initiatorId.toString() !== req.user.userId) {
        const err = new Error('Only the group initiator can submit this group');
        err.statusCode = 403;
        throw err;
      }

      if (group.status !== 'Open') {
        const err = new Error(
          group.status === 'Cancelled' ? 'This group has been cancelled' : 'This group has already been submitted'
        );
        err.statusCode = 400;
        throw err;
      }

      // 3. Load the group's Draft member bookings using the SAME session
      const draftMembers = await Booking.find({ groupId: group._id, status: 'Draft' }).session(session);
      const groupSize = draftMembers.length;

      if (groupSize === 0) {
        const err = new Error('Cannot submit a group with no active draft members');
        err.statusCode = 400;
        throw err;
      }

      // 4. Mutate Batch reservationLock using $inc and session BEFORE capacity count
      const batch = await Batch.findOneAndUpdate(
        { _id: group.batchId },
        { $inc: { reservationLock: 1 } },
        { session, new: true }
      );

      if (!batch) {
        const err = new Error('Batch not found');
        err.statusCode = 404;
        throw err;
      }

      if (batch.status === 'Completed') {
        const err = new Error('Cannot book a completed batch');
        err.statusCode = 400;
        throw err;
      }

      const trip = await Trip.findById(batch.tripId).session(session);
      if (!trip) {
        const err = new Error('Associated trip not found');
        err.statusCode = 404;
        throw err;
      }

      if (trip.status === 'Inactive') {
        const err = new Error('This trip is currently inactive and not accepting new bookings.');
        err.statusCode = 400;
        throw err;
      }

      // 5. Verify no draft member already has an active or waitlisted booking for this batch
      const participantIds = draftMembers.map((m) => m.participantId);
      const draftBookingIds = draftMembers.map((m) => m._id);

      const uniqueParticipantIds = new Set(participantIds.map((p) => p.toString()));
      if (uniqueParticipantIds.size !== participantIds.length) {
        const err = new Error('One or more group members appear multiple times in this group');
        err.statusCode = 409;
        throw err;
      }

      const conflictingBooking = await Booking.findOne({
        participantId: { $in: participantIds },
        batchId: group.batchId,
        _id: { $nin: draftBookingIds },
        status: { $in: [...ACTIVE_STATUSES, 'Waitlisted'] }
      }).session(session);

      if (conflictingBooking) {
        const err = new Error('One or more group members already have an active or waitlisted booking for this batch');
        err.statusCode = 409;
        throw err;
      }

      // 6. Count ACTIVE_STATUSES bookings for this batch using the SAME session
      const occupiedSeats = await Booking.countDocuments({
        batchId: group.batchId,
        status: { $in: ACTIVE_STATUSES }
      }).session(session);

      // 7. Calculate fits (all-or-nothing group atomicity)
      const fits = (occupiedSeats + groupSize) <= batch.maxCapacity;
      const newStatus = fits ? 'Inquiry' : 'Waitlisted';

      // 8. Update ALL Draft member bookings using the SAME session
      await Booking.updateMany(
        { groupId: group._id, status: 'Draft' },
        { $set: { status: newStatus } }
      ).session(session);

      // 9. Update group status using the session
      group.status = fits ? 'Processed' : 'Waitlisted';
      await group.save({ session });

      return {
        fits,
        groupSize,
        group
      };
    });

    res.status(200).json({
      success: true,
      message: result.fits ? 'Group entered the booking pipeline together' : 'Group waitlisted together (all-or-nothing)',
      groupSize: result.groupSize,
      group: result.group
    });
  } catch (err) {
    console.error(err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Failed to submit booking group' });
  }
};

export const getMyOpenGroups = async (req, res) => {
  try {
    const groups = await BookingGroup.find({
      initiatorId: req.user.userId,
      status: 'Open'
    }).populate('batchId', 'batchName');
    res.status(200).json({ success: true, groups });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch your open groups' });
  }
};