import Batch from '../models/Batch.js';
import Trip from '../models/Trip.js';
import OrganizationMembership from '../models/OrganizationMembership.js';

export const createBatch = async (req, res) => {
    try{
        const { tripId, batchName, startDate, endDate, maxCapacity, trekLeaderId } = req.body;

        if(!tripId){
            return res.status(400).json({ success: false, message: 'tripId is required' });
        }

        const trip = await Trip.findById(tripId);

        if (!trip) {
           return res.status(404).json({ success: false, message: 'Trip not found' });
        }

        if (trip.organizationId.toString() !== req.user.organizationId) {
            return res.status(403).json({ success: false, message: 'This trip does not belong to your organization' });
        }

        let assignedTrekLeaderId = null;

        if(trekLeaderId){
            const membership = await OrganizationMembership.findOne({
                userId: trekLeaderId,
                organizationId: req.user.organizationId,
                role: 'TrekLeader'
            });

            if (!membership){
                return res.status(400).json({ success: false, message: 'This user is not a Trek Leader in your organization' });
            }

            assignedTrekLeaderId = trekLeaderId;
        }

        const batch = await Batch.create({
            tripId,
            organizationId: trip.organizationId,
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

export const completeBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    if (batch.organizationId.toString() !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'This batch does not belong to your organization' });
    }

    batch.status = 'Completed';
    await batch.save();

    res.status(200).json({ success: true, batch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const searchBatches = async (req, res) => {
  try {
    const { batchName, status, startDate, endDate } = req.query;
    const filter = { organizationId: req.user.organizationId };
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
