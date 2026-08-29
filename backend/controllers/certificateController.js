import Certificate from '../models/Certificate.js';
import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';

export const generateCertificate = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.organizationId.toString() !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'This booking does not belong to your organization' });
    }

    if (booking.status !== 'Confirmed') {
      return res.status(400).json({ success: false, message: 'Only confirmed bookings are eligible for a certificate' });
    }

    const batch = await Batch.findById(booking.batchId);
    if (batch.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'This batch has not been marked completed yet' });
    }

    const certificateCode = `CERT-${Date.now()}-${booking._id.toString().slice(-6)}`;

    const certificate = await Certificate.create({
      participantId: booking.participantId,
      organizationId: booking.organizationId,
      tripId: booking.tripId,
      batchId: booking.batchId,
      certificateCode
    });

    res.status(201).json({ success: true, certificate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};