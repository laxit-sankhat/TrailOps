import mongoose from 'mongoose';
import Batch from '../models/Batch.js';
import Trip from '../models/Trip.js';
import OrganizationMembership from '../models/OrganizationMembership.js';

export const createBatch = async (req, res) => {
    try{
        const { tripId, batchName, startDate, endDate, maxCapacity, trekLeaderId } = req.body;

        if(!tripId){
            return res.status(400).json({ success: false, message: 'tripId is required' });
        }

        if (!mongoose.isValidObjectId(tripId)) {
            return res.status(400).json({ success: false, message: 'Invalid trip ID' });
        }

        const trip = await Trip.findById(tripId);

        if (!trip) {
           return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        if (trip.organizationId.toString() !== req.user.organizationId?.toString()) {
            return res.status(403).json({ success: false, message: 'This trip does not belong to your organization' });
        }

        if (trip.status === 'Inactive') {
            return res.status(400).json({ success: false, message: 'Cannot create a batch for an inactive trip.' });
        }

        let assignedTrekLeaderId = null;

        if(trekLeaderId){
            const membership = await OrganizationMembership.findOne({
                userId: trekLeaderId,
                organizationId: req.user.organizationId,
                role: 'TrekLeader',
                status: 'Active'
            });

            if (!membership){
                return res.status(400).json({ success: false, message: 'This user is not a Trek Leader in your organization' });
            }

            assignedTrekLeaderId = trekLeaderId;
        }

        const duplicateBatch = await Batch.findOne({
          tripId,
          batchName,
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        });

        if (duplicateBatch) {
          return res.status(409).json({ success: false, message: 'A batch with this name and these dates already exists for this trip' });
        }

        if (!req.user?.organizationId) {
          return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
        }

        const batch = await Batch.create({
            tripId,
            organizationId: req.user.organizationId,
            batchName,
            startDate,
            endDate,
            maxCapacity,
            assignedTrekLeaderId
        });

        res.status(201).json({ success: true, batch });

    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getBatchById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid batch ID' });
    }

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (req.user.role !== 'SuperAdmin') {
      if (!req.user?.organizationId || batch.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'This batch does not belong to your organization' });
      }
    }

    res.status(200).json({ success: true, batch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const completeBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (req.user.role !== 'SuperAdmin') {
      if (!req.user?.organizationId || batch.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'This batch does not belong to your organization' });
      }
    }

    batch.status = 'Completed';
    await batch.save();

    res.status(200).json({ success: true, batch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyOrgBatches = async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const batches = await Batch.find({
      organizationId: req.user.organizationId
    });

    res.status(200).json({ success: true, count: batches.length, batches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const searchBatches = async (req, res) => {
  try {
    const { batchName, status, startDate, endDate } = req.query;
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

    if (batchName) filter.batchName = { $regex: batchName, $options: 'i' };
    if (status) filter.status = status;
    if (startDate) filter.startDate = { $gte: new Date(startDate) };
    if (endDate) filter.endDate = { $lte: new Date(endDate) };

    const batches = await Batch.find(filter);
    res.status(200).json({ success: true, count: batches.length, batches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBatchesByTripPublic = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.tripId)) {
      return res.status(400).json({ success: false, message: 'Invalid trip ID' });
    }

    const trip = await Trip.findOne({ _id: req.params.tripId, status: 'Active' });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const batches = await Batch.find({
      tripId: trip._id,
      status: { $ne: 'Completed' }
    }).sort({ startDate: 1 });
    res.status(200).json({ success: true, count: batches.length, batches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
