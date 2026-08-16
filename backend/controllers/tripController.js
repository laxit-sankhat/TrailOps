import Trip from '../models/Trip.js';

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