import Feedback from '../models/Feedback.js';
import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';

export const submitFeedback = async (req, res) => {
  try {
    const { bookingId, ratingGuide, ratingFood, ratingSafety, ratingOverall, comments } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.participantId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This is not your booking' });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ success: false, message: 'Feedback can only be submitted for confirmed bookings' });
    }

    const batch = await Batch.findById(booking.batchId);
    if (batch.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'This trek has not been completed yet' });
    }

    const feedback = await Feedback.create({
      participantId: req.user.userId,
      tripId: booking.tripId,
      organizationId: booking.organizationId,
      batchId: booking.batchId,
      ratingGuide,
      ratingFood,
      ratingSafety,
      ratingOverall,
      comments
    });

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};