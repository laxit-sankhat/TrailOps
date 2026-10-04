import mongoose from 'mongoose';
import Feedback from '../models/Feedback.js';
import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';

export const submitFeedback = async (req, res) => {
  try {
    const { bookingId, ratingGuide, ratingFood, ratingSafety, ratingOverall, comments } = req.body;

    // Explicit rating validation
    const ratings = { ratingGuide, ratingFood, ratingSafety, ratingOverall };
    for (const [key, val] of Object.entries(ratings)) {
      if (val === undefined || val === null || typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 5) {
        return res.status(400).json({
          success: false,
          message: `${key} is required and must be an integer between 1 and 5`
        });
      }
    }

    // Explicit comment validation
    let trimmedComments = undefined;
    if (comments !== undefined && comments !== null) {
      if (typeof comments !== 'string') {
        return res.status(400).json({ success: false, message: 'comments must be a string' });
      }
      trimmedComments = comments.trim();
      if (trimmedComments.length > 2000) {
        return res.status(400).json({ success: false, message: 'comments cannot exceed 2000 characters' });
      }
    }

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

    const existing = await Feedback.findOne({ bookingId });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Feedback has already been submitted for this booking' });
    }

    const batch = await Batch.findById(booking.batchId);
    if (batch.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'This trek has not been completed yet' });
    }

    const feedback = await Feedback.create({
      participantId: req.user.userId,
      bookingId,
      tripId: booking.tripId,
      organizationId: booking.organizationId,
      batchId: booking.batchId,
      ratingGuide,
      ratingFood,
      ratingSafety,
      ratingOverall,
      comments: trimmedComments
    });

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Feedback has already been submitted for this booking' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ participantId: req.user.userId })
      .populate('tripId', 'name')
      .populate('batchId', 'batchName startDate endDate')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, feedbacks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOrgFeedback = async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const { tripId, batchId, ratingOverall } = req.query;

    let page = 1;
    if (req.query.page !== undefined) {
      const parsedPage = Number(req.query.page);
      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        return res.status(400).json({ success: false, message: 'page must be a positive integer' });
      }
      page = parsedPage;
    }

    let limit = 50;
    if (req.query.limit !== undefined) {
      const parsedLimit = Number(req.query.limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({ success: false, message: 'limit must be an integer between 1 and 100' });
      }
      limit = parsedLimit;
    }

    const filter = {
      organizationId: req.user.organizationId
    };

    if (tripId !== undefined) {
      if (!mongoose.isValidObjectId(tripId)) {
        return res.status(400).json({ success: false, message: 'Invalid tripId' });
      }
      filter.tripId = tripId;
    }

    if (batchId !== undefined) {
      if (!mongoose.isValidObjectId(batchId)) {
        return res.status(400).json({ success: false, message: 'Invalid batchId' });
      }
      filter.batchId = batchId;
    }

    if (ratingOverall !== undefined) {
      const parsedRating = Number(ratingOverall);
      if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return res.status(400).json({ success: false, message: 'ratingOverall must be an integer between 1 and 5' });
      }
      filter.ratingOverall = parsedRating;
    }

    const skip = (page - 1) * limit;

    const [total, feedbacks] = await Promise.all([
      Feedback.countDocuments(filter),
      Feedback.find(filter)
        .select('_id bookingId tripId batchId participantId ratingGuide ratingFood ratingSafety ratingOverall comments createdAt')
        .populate('tripId', 'name location')
        .populate('batchId', 'batchName startDate endDate status')
        .populate('participantId', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      count: feedbacks.length,
      total,
      page,
      limit,
      feedbacks
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Unable to retrieve organization feedback' });
  }
};

export const getOrgFeedbackStats = async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const orgObjectId = new mongoose.Types.ObjectId(req.user.organizationId);

    const [aggregationResult] = await Feedback.aggregate([
      {
        $match: {
          organizationId: orgObjectId
        }
      },
      {
        $facet: {
          averages: [
            {
              $group: {
                _id: null,
                totalReviews: { $sum: 1 },
                avgOverall: { $avg: '$ratingOverall' },
                avgGuide: { $avg: '$ratingGuide' },
                avgFood: { $avg: '$ratingFood' },
                avgSafety: { $avg: '$ratingSafety' }
              }
            }
          ],
          distribution: [
            {
              $group: {
                _id: '$ratingOverall',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const summary = aggregationResult?.averages?.[0];
    const distributionRaw = aggregationResult?.distribution || [];

    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    for (const item of distributionRaw) {
      if (item._id && ratingDistribution[item._id] !== undefined) {
        ratingDistribution[item._id] = item.count;
      }
    }

    if (!summary || summary.totalReviews === 0) {
      return res.status(200).json({
        success: true,
        stats: {
          totalReviews: 0,
          avgOverall: null,
          avgGuide: null,
          avgFood: null,
          avgSafety: null,
          ratingDistribution
        }
      });
    }

    res.status(200).json({
      success: true,
      stats: {
        totalReviews: summary.totalReviews,
        avgOverall: Number(summary.avgOverall.toFixed(2)),
        avgGuide: Number(summary.avgGuide.toFixed(2)),
        avgFood: Number(summary.avgFood.toFixed(2)),
        avgSafety: Number(summary.avgSafety.toFixed(2)),
        ratingDistribution
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Unable to calculate feedback statistics' });
  }
};