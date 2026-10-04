import mongoose from 'mongoose';
import Trip from '../models/Trip.js';
import Batch from '../models/Batch.js';
import cloudinary from '../config/cloudinary.js';

export const createTrip = async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const { name, location, description, difficultyLevel, durationDays, startDate, endDate, basePrice } = req.body;

    const trip = await Trip.create({
      organizationId: req.user.organizationId, 
      name,
      location,
      description,
      difficultyLevel,
      durationDays,
      startDate,
      endDate,
      basePrice
    });

    res.status(201).json({ success: true, trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTripById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid trip ID' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (req.user.role !== 'SuperAdmin') {
      if (!req.user?.organizationId || trip.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'This trip does not belong to your organization' });
      }
    }

    res.status(200).json({ success: true, trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTripsByOrganization = async (req, res) => {
  try {
    const orgId = req.params.organizationId;
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: 'Invalid organization ID' });
    }

    if (req.user.role !== 'SuperAdmin') {
      if (!req.user?.organizationId || orgId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'You cannot access another organization\'s data' });
      }
    }

    const trips = await Trip.find({ organizationId: orgId });
    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (err) {
    console.error('Error fetching trips by organization:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch trips by organization' });
  }
};

export const getTripOrOrgTrips = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    // If param matches authenticated user's organizationId (or SuperAdmin), return org trips
    if (req.user.role === 'SuperAdmin' || (req.user?.organizationId && id === req.user.organizationId.toString())) {
      const trips = await Trip.find({ organizationId: id });
      return res.status(200).json({ success: true, count: trips.length, trips });
    }

    // Otherwise, treat as tripId
    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (req.user.role !== 'SuperAdmin') {
      if (!req.user?.organizationId || trip.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'This trip does not belong to your organization' });
      }
    }

    res.status(200).json({ success: true, trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTrip = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid trip ID' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    if (req.user.role !== 'SuperAdmin') {
      if (!req.user?.organizationId || trip.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'This trip does not belong to your organization' });
      }
    }

    const allowedFields = [
      'name',
      'location',
      'description',
      'difficultyLevel',
      'durationDays',
      'startDate',
      'endDate',
      'basePrice',
      'status'
    ];

    // Determine effective dates after applying incoming fields
    const effectiveStartDate = req.body.startDate !== undefined ? req.body.startDate : trip.startDate;
    const effectiveEndDate = req.body.endDate !== undefined ? req.body.endDate : trip.endDate;

    if (effectiveStartDate && effectiveEndDate) {
      if (new Date(effectiveEndDate) < new Date(effectiveStartDate)) {
        return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date' });
      }
    }

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        trip[field] = req.body[field];
      }
    }

    await trip.save();

    res.status(200).json({ success: true, trip });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: err.message });
    }
    console.error('Error updating trip:', err);
    res.status(500).json({ success: false, message: 'Failed to update trip' });
  }
};

export const searchTrips = async (req, res) => {
  try {
    const { name, location, difficultyLevel, status } = req.query;
    const filter = {};

    if (req.user.role === 'SuperAdmin') {
      if (req.query.organizationId) {
        filter.organizationId = req.query.organizationId;
      }
    } else {
      if (!req.user?.organizationId) {
        return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
      }
      filter.organizationId = req.user.organizationId;
    }

    if (name) filter.name = { $regex: name, $options: 'i' };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (difficultyLevel) filter.difficultyLevel = difficultyLevel;
    if (status) filter.status = status;

    const trips = await Trip.find(filter);
    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyOrgTrips = async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const trips = await Trip.find({
      organizationId: req.user.organizationId
    });

    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadTripImage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid trip ID' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    if (!req.user?.organizationId || trip.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'This trip does not belong to your organization' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'trailops/trips' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    trip.images.push({ url: result.secure_url, publicId: result.public_id });
    await trip.save();

    res.status(200).json({ success: true, trip });
  } catch (err) {
    console.error('Error uploading trip image:', err);
    res.status(500).json({ success: false, message: 'Failed to upload trip image' });
  }
};

export const removeTripImage = async (req, res) => {
  try {
    const { id, publicId } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid trip ID' });
    }

    const trip = await Trip.findById(id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    if (!req.user?.organizationId || trip.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'This trip does not belong to your organization' });
    }

    const imageExists = trip.images && trip.images.some(img => img.publicId === publicId);
    if (!imageExists) {
      return res.status(404).json({ success: false, message: 'Image not found in this trip gallery' });
    }

    await cloudinary.uploader.destroy(publicId);
    trip.images = trip.images.filter(img => img.publicId !== publicId);
    await trip.save();

    res.status(200).json({ success: true, trip });
  } catch (err) {
    console.error('Error removing trip image:', err);
    res.status(500).json({ success: false, message: 'Failed to remove trip image' });
  }
};  

export const getAllApprovedTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'Active' }).populate('organizationId', 'name');
    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBatchesForTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    if (!mongoose.isValidObjectId(tripId)) {
      return res.status(400).json({ success: false, message: 'Invalid trip ID' });
    }

    const batches = await Batch.find({
      tripId,
      status: { $ne: 'Completed' }
    });
    res.status(200).json({ success: true, batches });
  } catch (err) {
    console.error('Error fetching batches for trip:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch batches for trip' });
  }
};

export const getActiveTripsWithBatches = async (req, res) => {
  try {
    const now = new Date();

    const trips = await Trip.aggregate([
      { $match: { status: 'Active' } },
      {
        $lookup: {
          from: 'batches',
          let: { tripId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$tripId', '$$tripId'] },
                status: { $nin: ['Completed', 'Cancelled'] },
                endDate: { $gte: now }
              }
            },
            { $sort: { startDate: 1 } }
          ],
          as: 'batches'
        }
      },
      // Only keep trips that have at least one ongoing/upcoming batch -
      // a trip with no valid batches shouldn't appear as "bookable" at all.
      { $match: { 'batches.0': { $exists: true } } },
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCompletedTripsWithBatches = async (req, res) => {
  try {
    const trips = await Trip.aggregate([
      { $match: { status: 'Active' } },
      {
        $lookup: {
          from: 'batches',
          let: { tripId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$tripId', '$$tripId'] },
                status: 'Completed'
              }
            },
            { $sort: { startDate: -1 } }
          ],
          as: 'batches'
        }
      },
      // Only keep trips that have at least one completed batch
      { $match: { 'batches.0': { $exists: true } } },
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (err) {
    console.error('Error fetching completed trips with batches:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch completed trips' });
  }
};