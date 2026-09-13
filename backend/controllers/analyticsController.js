import Trip from '../models/Trip.js';
import Batch from '../models/Batch.js';
import Booking from '../models/Booking.js';
import Organization from '../models/Organization.js';
import Attendance from '../models/Attendance.js';
import MedicalReview from '../models/MedicalReview.js';

export const getOrgDashboardStats = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;

    const totalTrips = await Trip.countDocuments({ organizationId });
    const totalBookings = await Booking.countDocuments({ organizationId });
    const confirmedBookings = await Booking.countDocuments({ organizationId, status: 'Confirmed' });
    const totalBatches = await Batch.countDocuments({ organizationId: req.user.organizationId });

    res.status(200).json({
      success: true,
      stats: { totalTrips, totalBatches, totalBookings, confirmedBookings }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPlatformDashboardStats = async (req, res) => {
  try {
    const totalOrganizations = await Organization.countDocuments({});
    const totalTrips = await Trip.countDocuments({});
    const totalBookings = await Booking.countDocuments({});

    res.status(200).json({
      success: true,
      stats: { totalOrganizations, totalTrips, totalBookings }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBatchComplianceReport = async (req, res) => {
  try {
    const { batchId } = req.params;

    const totalBookings = await Booking.countDocuments({ batchId, status: { $in: ['Confirmed'] } });
    const attendedParticipants = await Attendance.distinct('participantId', { batchId });
    const attendancePercent = totalBookings > 0 ? Math.round((attendedParticipants.length / totalBookings) * 100) : 0;

    const bookingIds = (await Booking.find({ batchId }).select('_id')).map(b => b._id);
    const totalReviews = await MedicalReview.countDocuments({ bookingId: { $in: bookingIds } });
    const approvedReviews = await MedicalReview.countDocuments({ bookingId: { $in: bookingIds }, status: 'Approved' });
    const medicalCompliancePercent = totalReviews > 0 ? Math.round((approvedReviews / totalReviews) * 100) : 0;

    res.status(200).json({ success: true, attendancePercent, medicalCompliancePercent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};