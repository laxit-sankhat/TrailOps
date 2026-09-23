import Certificate from '../models/Certificate.js';
import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';
import PDFDocument from 'pdfkit';
import cloudinary from '../config/cloudinary.js';
import Trip from '../models/Trip.js';


export const generateCertificate = async (req, res) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId).populate('participantId', 'fullName');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

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

    const trip = await Trip.findById(booking.tripId);
    const certificateCode = `CERT-${Date.now()}-${booking._id.toString().slice(-6)}`;

    // Build the PDF in memory
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(28).text('Certificate of Completion', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(16).text(`This certifies that`, { align: 'center' });
      doc.fontSize(22).text(booking.participantId.fullName, { align: 'center' });
      doc.fontSize(16).text(`has successfully completed the trek`, { align: 'center' });
      doc.fontSize(20).text(trip.name, { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(12).text(`Certificate Code: ${certificateCode}`, { align: 'center' });

      doc.end();
    });

    // Upload the generated PDF to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'trailops/certificates', resource_type: 'raw', public_id: `${certificateCode}.pdf` },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(pdfBuffer);
    });

    const certificate = await Certificate.create({
      participantId: booking.participantId._id,
      organizationId: booking.organizationId,
      tripId: booking.tripId,
      batchId: booking.batchId,
      certificateCode,
      pdfUrl: uploadResult.secure_url
    });

    res.status(201).json({ success: true, certificate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const verifyCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ certificateCode: req.params.code });

    if (!certificate) {
      return res.status(200).json({ success: true, valid: false });
    }

    res.status(200).json({ success: true, valid: true, certificate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};