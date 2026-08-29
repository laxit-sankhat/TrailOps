import Trip from '../models/Trip.js';
import Batch from '../models/Batch.js';
import Booking from '../models/Booking.js';
import Organization from '../models/Organization.js';

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