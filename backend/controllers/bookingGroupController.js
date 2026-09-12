import crypto from 'crypto';
import BookingGroup from '../models/BookingGroup.js';
import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';
import Trip from '../models/Trip.js';

const ACTIVE_STATUSES = ['Inquiry', 'PendingMedicalReview', 'MedicallyApproved', 'Confirmed'];

export const createBookingGroup = async (req, res) => {
  try {
    const { batchId } = req.body;

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const trip = await Trip.findById(batch.tripId);
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
    res.status(500).json({ success: false, message: err.message });
  }
};

export const joinBookingGroup = async (req, res) => {
  try {
    const { groupCode } = req.body;

    const group = await BookingGroup.findOne({ groupCode });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.status !== 'Open') return res.status(400).json({ success: false, message: 'This group is no longer open for joining' });

    const alreadyIn = await Booking.findOne({ groupId: group._id, participantId: req.user.userId });
    if (alreadyIn) return res.status(400).json({ success: false, message: 'You have already joined this group' });

    const batch = await Batch.findById(group.batchId);

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
    res.status(500).json({ success: false, message: err.message });
  }
};

export const submitBookingGroup = async (req, res) => {
  try {
    const group = await BookingGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.initiatorId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Only the group initiator can submit this group' });
    }

    if (group.status !== 'Open') {
      return res.status(400).json({ success: false, message: 'This group has already been submitted' });
    }

    const draftMembers = await Booking.find({ groupId: group._id, status: 'Draft' });
    const groupSize = draftMembers.length;

    const batch = await Batch.findById(group.batchId);

    const occupiedSeats = await Booking.countDocuments({
      batchId: group.batchId,
      status: { $in: ACTIVE_STATUSES }
    });

    const fits = (occupiedSeats + groupSize) <= batch.maxCapacity;
    const newStatus = fits ? 'Inquiry' : 'Waitlisted';

    await Booking.updateMany(
      { groupId: group._id, status: 'Draft' },
      { $set: { status: newStatus } }
    );

    group.status = fits ? 'Processed' : 'Waitlisted';
    await group.save();

    res.status(200).json({
      success: true,
      message: fits ? 'Group entered the booking pipeline together' : 'Group waitlisted together (all-or-nothing)',
      groupSize,
      group
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};