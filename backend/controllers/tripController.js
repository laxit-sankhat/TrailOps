import Trip from '../models/Trip.js';
import cloudinary from '../config/cloudinary.js';

export const createTrip = async (req, res) => {
  try {
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

export const getTripsByOrganization = async (req, res) => {
  try{
    const trips = await Trip.find({ organizationId: req.params.organizationId });
    res.status(200).json({ success: true, count: trips.length, trips });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    if (trip.organizationId.toString() !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'This trip does not belong to your organization' });
    }

    const { name, location, description, difficultyLevel, durationDays, startDate, endDate, basePrice, status } = req.body;
    Object.assign(trip, { name, location, description, difficultyLevel, durationDays, startDate, endDate, basePrice, status });
    await trip.save();

    res.status(200).json({ success: true, trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const searchTrips = async (req, res) => {
  try {
    const { name, location, difficultyLevel, status } = req.query;
    const filter = { organizationId: req.user.organizationId };
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

export const uploadTripImage = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    if (trip.organizationId.toString() !== req.user.organizationId) {
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

    trip.imageUrl = result.secure_url;
    await trip.save();

    res.status(200).json({ success: true, trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};