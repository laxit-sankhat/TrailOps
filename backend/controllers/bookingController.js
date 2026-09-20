import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';
import Trip from '../models/Trip.js';
import MedicalReview from '../models/MedicalReview.js';
import MedicalProfile from '../models/MedicalProfile.js';
import QRCode from 'qrcode';

const ACTIVE_STATUSES = ['Inquiry', 'PendingMedicalReview', 'MedicallyApproved', 'Confirmed'];

export const createBooking = async (req, res) => {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({ success: false, message: 'batchId is required' });
    }

    const batch = await Batch.findById(batchId);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const trip = await Trip.findById(batch.tripId);

    // We count bookings in ANY active status (not just Confirmed), because a booking
    // in PendingMedicalReview or MedicallyApproved still holds a seat - if we only
    // counted Confirmed, we could overbook once pending approvals came through.
    const activeCount = await Booking.countDocuments({
      batchId,
      status: { $in: ACTIVE_STATUSES }
    });

    const isFull = activeCount >= batch.maxCapacity;

    const booking = await Booking.create({
      participantId: req.user.userId,
      batchId,
      tripId: batch.tripId,
      organizationId: trip.organizationId,
      status: isFull ? 'Waitlisted' : 'Inquiry'
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
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

    booking.status = 'Cancelled';
    await booking.save();

    if (wasHoldingASeat) {
      const nextInLine = await Booking.findOne({
        batchId: booking.batchId,
        status: 'Waitlisted'
      }).sort({ registeredAt: 1 });

      if (nextInLine) {
        if (nextInLine.groupId) {
          const groupMembers = await Booking.find({ groupId: nextInLine.groupId, status: 'Waitlisted' });
          // Capacity check counts ANY active status (Inquiry through Confirmed), not just
          // Confirmed - because a pending approval still occupies a seat. Counting only
          // Confirmed would let the system overbook once those approvals came through.
          const currentlyOccupied = await Booking.countDocuments({
            batchId: booking.batchId,
            status: { $in: ACTIVE_STATUSES }
          });
          const batchDoc = await Batch.findById(booking.batchId);
          const seatsFree = batchDoc.maxCapacity - currentlyOccupied;

          // Group promotion: never split a waitlisted group. Only promote the whole
          // group together once enough freed capacity exists for every member - if
          // partial capacity opened up, the group stays waitlisted until it's fully covered.
          if (seatsFree >= groupMembers.length) {
            await Booking.updateMany(
              { _id: { $in: groupMembers.map(m => m._id) } },
              { $set: { status: 'Inquiry' } }
            );
          }
          // else: not enough freed capacity for the whole group yet - they stay waitlisted, promotion skipped this cycle
        } else {
          nextInLine.status = 'Inquiry';
          await nextInLine.save();
        }
      }
    }

    res.status(200).json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const submitForMedicalReview = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.participantId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This is not your booking' });
    }

    if (booking.status !== 'Inquiry') {
      return res.status(400).json({ success: false, message: 'This booking is not awaiting medical submission' });
    }

    const medicalProfile = await MedicalProfile.findOne({ participantId: req.user.userId }).sort({ uploadedAt: -1 });

    if (!medicalProfile) {
      return res.status(400).json({ success: false, message: 'You must upload a medical profile before submitting' });
    }

    const review = await MedicalReview.create({
      bookingId: booking._id,
      medicalProfileId: medicalProfile._id,
      organizationId: booking.organizationId,
      medicalReviewerId: null, // not yet assigned - filled in when a Medical Officer picks it up
      status: 'Pending'
    });

    booking.status = 'PendingMedicalReview';
    await booking.save();

    res.status(200).json({ success: true, booking, review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const confirmBooking = async (req, res) => {
  try{
    const booking = await Booking.findById(req.params.id);

    if(!booking)
      return res.status(404).json({ success: false, message: 'Booking not found' });
    
    if(booking.organizationId.toString() !== req.user.organizationId)
      return res.status(403).json({ success: false, message: 'This booking does not belong to your organization' });

    if (booking.status !== 'MedicallyApproved')
      return res.status(400).json({ success: false, message: 'This booking is not medically approved yet' });

    booking.status = 'Confirmed';
    booking.qrCodeValue = booking._id.toString(); // opaque reference - just the booking's own ID
    await booking.save();

    res.status(200).json({ success: true, booking });
  }
  catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });    
  }
};

export const getBookingQRCode = async (req, res) => {
  try {
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
    res.status(500).json({ success: false, message: err.message });
  }
};  

export const getParticipantsByBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (batch.organizationId.toString() !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'This batch does not belong to your organization' });
    }

    const bookings = await Booking.find({ batchId: req.params.batchId })
      .populate('participantId', 'fullName email mobileNumber');

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};