import MedicalProfile from '../models/MedicalProfile.js';
import MedicalReview from '../models/MedicalReview.js';
import Booking from '../models/Booking.js';

export const uploadMedicalProfile = async (req, res) => {
  try {
    const { bloodGroup, allergies, medicalConditions, medications, emergencyContactDetails, reportFileUrl, validUntil } = req.body;

    const profile = await MedicalProfile.create({
      participantId: req.user.userId,
      bloodGroup,
      allergies,
      medicalConditions,
      medications,
      emergencyContactDetails,
      reportFileUrl,
      validUntil
    });

    res.status(201).json({ success: true, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reviewMedicalSubmission = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const validStatuses = ['Approved', 'Rejected', 'NeedsMoreInfo'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${validStatuses.join(', ')}` });
    }

    const review = await MedicalReview.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Medical review not found' });
    }

    if (review.organizationId.toString() !== req.user.organizationId) {
      return res.status(403).json({ success: false, message: 'This review does not belong to your organization' });
    }

    review.status = status;
    review.notes = notes;
    review.medicalReviewerId = req.user.userId;
    await review.save();

    if (status === 'Approved') {
      const booking = await Booking.findById(review.bookingId);
      booking.status = 'MedicallyApproved';
      await booking.save();
    } else if (status === 'Rejected') {
      const booking = await Booking.findById(review.bookingId);
      booking.status = 'Rejected';
      await booking.save();
    }
    // NeedsMoreInfo: booking stays at PendingMedicalReview, no change needed

    res.status(200).json({ success: true, review });
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPendingReviews = async (req, res) => {
  try{
    const reviews = await MedicalReview.find({ status: 'Pending', organizationId: req.user.organizationId });
    res.status(200).json({ success: true, count: reviews.length, reviews });
  }
  catch(err){
    console.error(err);
    res.status(500).json({ success: false, message: err.message });    
  }
};