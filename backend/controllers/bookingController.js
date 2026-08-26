import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';
import Trip from '../models/Trip.js';

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

    if (booking.participantId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This is not your booking' });
    }

    const wasHoldingASeat = ['Inquiry', 'PendingMedicalReview', 'MedicallyApproved', 'Confirmed'].includes(booking.status);

    booking.status = 'Cancelled';
    await booking.save();

    if (wasHoldingASeat) {
      const nextInLine = await Booking.findOne({
        batchId: booking.batchId,
        status: 'Waitlisted'
      }).sort({ registeredAt: 1 }); // ascending = oldest first

      if (nextInLine) {
        nextInLine.status = 'Inquiry';
        await nextInLine.save();
      }
    }

    res.status(200).json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};