import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import BookingGroup from '../models/BookingGroup.js';
import Batch from '../models/Batch.js';
import Trip from '../models/Trip.js';
import MedicalReview from '../models/MedicalReview.js';
import MedicalProfile from '../models/MedicalProfile.js';
import QRCode from 'qrcode';
import Notification from '../models/Notification.js';
import BatchAssignment from '../models/BatchAssignment.js';
import { promoteWaitlistForBatch } from '../utils/waitlistHelper.js';
import { withTransaction } from '../utils/transactionHelper.js';

const ACTIVE_STATUSES = ['Inquiry', 'PendingMedicalReview', 'MedicallyApproved', 'Confirmed'];

export const createBooking = async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }

    if (!mongoose.isValidObjectId(batchId)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID' });
    }

    const booking = await withTransaction(async (session) => {
      // 1. Serialize concurrent reservations on this batch via reservationLock
      const batch = await Batch.findOneAndUpdate(
        { _id: batchId },
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
        const err = new Error('Trip not found');
        err.statusCode = 404;
        throw err;
      }

      if (trip.status === 'Inactive') {
        const err = new Error('This trip is currently inactive and not accepting new bookings.');
        err.statusCode = 400;
        throw err;
      }

      // 2. Duplicate participant+batch check inside serialized transaction
      const existingActiveOrWaitlistedBooking = await Booking.findOne({
        participantId: req.user.userId,
        batchId,
        status: { $in: [...ACTIVE_STATUSES, 'Waitlisted'] }
      }).session(session);

      if (existingActiveOrWaitlistedBooking) {
        const err = new Error('You already have an active or waitlisted booking for this batch');
        err.statusCode = 409;
        throw err;
      }

      // 3. Count capacity-holding bookings inside serialized transaction
      const activeCount = await Booking.countDocuments({
        batchId,
        status: { $in: ACTIVE_STATUSES }
      }).session(session);

      const isFull = activeCount >= batch.maxCapacity;

      // 4. Create booking with Inquiry or Waitlisted using the session
      const [newBooking] = await Booking.create([{
        participantId: req.user.userId,
        batchId,
        tripId: batch.tripId,
        organizationId: trip.organizationId,
        status: isFull ? 'Waitlisted' : 'Inquiry'
      }], { session });

      return newBooking;
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error(err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (['Cancelled', 'Rejected'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'This booking is already cancelled or rejected' });
    }

    // booking.participantId is a real ObjectId from the DB; req.user.userId is a
    // plain string decoded from the JWT. Must convert before comparing, or this
    // check silently never matches even for the correct owner.
    if (booking.participantId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This is not your booking' });
    }

    // On cancellation, only promote the next waitlisted person if THIS booking was
    // actually holding a seat. A booking that was already Waitlisted never held a
    // seat, so cancelling it shouldn't free anything up or trigger promotion.
    const wasHoldingASeat = ['Inquiry', 'PendingMedicalReview', 'MedicallyApproved', 'Confirmed'].includes(booking.status);

    if (wasHoldingASeat) {
      // Transactional cancellation for capacity-holding bookings
      const updatedBooking = await withTransaction(async (session) => {
        // a. Load the booking using the session
        const txBooking = await Booking.findById(req.params.id).session(session);
        if (!txBooking) {
          const err = new Error('Booking not found');
          err.statusCode = 404;
          throw err;
        }

        // b. Validate ownership and terminal statuses inside the session
        if (['Cancelled', 'Rejected'].includes(txBooking.status)) {
          const err = new Error('This booking is already cancelled or rejected');
          err.statusCode = 400;
          throw err;
        }

        if (txBooking.participantId.toString() !== req.user.userId) {
          const err = new Error('This is not your booking');
          err.statusCode = 403;
          throw err;
        }

        // c. Load and mutate its Batch using $inc: { reservationLock: 1 } with session
        await Batch.findOneAndUpdate(
          { _id: txBooking.batchId },
          { $inc: { reservationLock: 1 } },
          { session, new: true }
        );

        // d. Change booking status to Cancelled using the SAME session
        txBooking.status = 'Cancelled';
        await txBooking.save({ session });

        // e. Cancel active MedicalReviews using the SAME session
        await MedicalReview.updateMany(
          {
            bookingId: txBooking._id,
            status: { $in: ['Pending', 'NeedsMoreInfo'] }
          },
          {
            $set: { status: 'Cancelled' }
          }
        ).session(session);

        // f. Call promoteWaitlistForBatch(batchId, session) using the SAME session
        await promoteWaitlistForBatch(txBooking.batchId, session);

        // g. Commit everything atomically
        return txBooking;
      });

      return res.status(200).json({ success: true, booking: updatedBooking });
    }

    // Non-capacity-holding cancellation (Draft, Waitlisted)
    // If cancelling a Draft booking belonging to a group, check if this participant is the group initiator
    if (booking.status === 'Draft' && booking.groupId) {
      const group = await BookingGroup.findById(booking.groupId);
      if (group && group.initiatorId.toString() === req.user.userId && group.status === 'Open') {
        group.status = 'Cancelled';
        await group.save();

        // Also cancel all other Draft bookings in this group
        await Booking.updateMany(
          { groupId: group._id, _id: { $ne: booking._id }, status: 'Draft' },
          { $set: { status: 'Cancelled' } }
        );
      }
    }

    booking.status = 'Cancelled';
    await booking.save();

    // Mark any active medical reviews associated with this cancelled booking as 'Cancelled'
    await MedicalReview.updateMany(
      {
        bookingId: booking._id,
        status: { $in: ['Pending', 'NeedsMoreInfo'] }
      },
      {
        $set: { status: 'Cancelled' }
      }
    );

    res.status(200).json({ success: true, booking });
  } catch (err) {
    console.error(err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
};

export const submitForMedicalReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.participantId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This is not your booking' });
    }

    // Use actual schema timestamps (updatedAt, createdAt) instead of non-existent uploadedAt
    const medicalProfile = await MedicalProfile.findOne({ participantId: req.user.userId })
      .sort({ updatedAt: -1, createdAt: -1 });

    if (!medicalProfile) {
      return res.status(400).json({ success: false, message: 'You must upload a medical profile before submitting' });
    }

    // NeedsMoreInfo resubmission workflow
    if (booking.status === 'Inquiry') {
      // Initial medical review submission
      const review = await MedicalReview.create({
        bookingId: booking._id,
        medicalProfileId: medicalProfile._id,
        organizationId: booking.organizationId,
        medicalReviewerId: null, // not yet assigned - filled in when a Medical Officer picks it up
        status: 'Pending'
      });

      booking.status = 'PendingMedicalReview';
      await booking.save();

      return res.status(200).json({ success: true, booking, review });
    } else if (booking.status === 'PendingMedicalReview') {
      // Resubmission flow: allowed ONLY if existing review is in 'NeedsMoreInfo' status
      const existingReview = await MedicalReview.findOne({
        bookingId: booking._id,
        status: 'NeedsMoreInfo'
      });

      if (!existingReview) {
        return res.status(400).json({
          success: false,
          message: 'Medical review is already pending or not awaiting resubmission'
        });
      }

      existingReview.status = 'Pending';
      existingReview.medicalProfileId = medicalProfile._id;
      await existingReview.save();

      return res.status(200).json({
        success: true,
        booking,
        review: existingReview,
        message: 'Medical review resubmitted successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Cannot submit medical review for booking in '${booking.status}' status`
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit medical review' });
  }
};

export const confirmBooking = async (req, res) => {
  try{
    if (!req.user?.organizationId) {  
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(req.params.id);

    if(!booking)
      return res.status(404).json({ success: false, message: 'Booking not found' });
    
    if(booking.organizationId?.toString() !== req.user.organizationId.toString())
      return res.status(403).json({ success: false, message: 'This booking does not belong to your organization' });

    if (booking.status !== 'MedicallyApproved')
      return res.status(400).json({ success: false, message: 'This booking is not medically approved yet' });

    booking.status = 'Confirmed';
    booking.qrCodeValue = booking._id.toString(); // opaque reference - just the booking's own ID
    await booking.save();
    try {
      await Notification.create({
        recipientUserId: booking.participantId,
        message: 'Your booking for batch has been confirmed!',
        relatedType: 'Booking',
        relatedId: booking._id
      });
    } catch (notificationError) {
      console.error('Failed to create booking confirmation notification:', notificationError);
    }

    res.status(200).json({ success: true, booking });
  }
  catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to confirm booking' });    
  }
};

export const getBookingQRCode = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.participantId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This is not your booking' });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ success: false, message: 'QR code is only available for confirmed bookings' });
    }

    const qrImageDataUrl = await QRCode.toDataURL(booking.qrCodeValue);

    res.status(200).json({ success: true, qrImage: qrImageDataUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to generate booking QR' });
  }
};  

export const getParticipantsByBatch = async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    if (!mongoose.isValidObjectId(req.params.batchId)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID' });
    }

    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (batch.organizationId?.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'This batch does not belong to your organization' });
    }

    if (['TrekLeader', 'Volunteer'].includes(req.user.role)) {
      const assignment = await BatchAssignment.findOne({
        batchId: req.params.batchId,
        userId: req.user.userId,
        roleInBatch: req.user.role
      });

      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this batch' });
      }
    }

    const bookings = await Booking.find({ batchId: req.params.batchId })
      .populate('participantId', 'fullName email mobileNumber');

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch participants' });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ participantId: req.user.userId })
      .populate('batchId', 'batchName startDate endDate')
      .populate('tripId', 'name');
    res.status(200).json({ success: true, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch your bookings' });
  }
};