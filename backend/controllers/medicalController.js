import path from 'path';
import mongoose from 'mongoose';
import MedicalProfile from '../models/MedicalProfile.js';
import MedicalReview from '../models/MedicalReview.js';
import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';
import OrganizationMembership from '../models/OrganizationMembership.js';
import Notification from '../models/Notification.js';
import cloudinary from '../config/cloudinary.js';
import { promoteWaitlistForBatch } from '../utils/waitlistHelper.js';
import { withTransaction } from '../utils/transactionHelper.js';

export const uploadMedicalProfile = async (req, res) => {
  let newlyUploadedPublicId = null;
  let newlyUploadedResourceType = null;

  try {
    const { bloodGroup, allergies, medicalConditions, medications, emergencyContactDetails, validUntil } = req.body;

    let reportFileUrl = req.body.reportFileUrl || null;
    let reportPublicId = null;
    let reportFileName = null;
    let reportResourceType = null;

    let previousPublicId = null;
    let previousResourceType = null;

    // Handle medical document upload if a file is attached
    if (req.file) {
      // Step A: Upload new document to Cloudinary as an authenticated asset
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'trailops/medical-documents',
            type: 'authenticated',
            resource_type: 'auto'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      reportFileUrl = uploadResult.secure_url;
      reportPublicId = uploadResult.public_id;
      reportFileName = req.file.originalname;
      reportResourceType = uploadResult.resource_type;

      newlyUploadedPublicId = uploadResult.public_id;
      newlyUploadedResourceType = uploadResult.resource_type;

      // Identify previous document for cleanup (do NOT delete yet)
      const previousProfile = await MedicalProfile.findOne({
        participantId: req.user.userId,
        reportPublicId: { $exists: true, $ne: null }
      }).sort({ createdAt: -1 });

      if (previousProfile?.reportPublicId) {
        previousPublicId = previousProfile.reportPublicId;
        previousResourceType = previousProfile.reportResourceType || 'auto';
      }
    }

    // Step B: Attempt to create/update MedicalProfile successfully
    let profile;
    try {
      profile = await MedicalProfile.create({
        participantId: req.user.userId,
        bloodGroup,
        allergies,
        medicalConditions,
        medications,
        emergencyContactDetails,
        reportFileUrl,
        reportPublicId,
        reportFileName,
        reportResourceType,
        validUntil
      });
    } catch (dbErr) {
      // If DB write fails, clean up the newly uploaded asset so it does not become orphaned,
      // and do NOT delete the previous asset.
      if (newlyUploadedPublicId) {
        try {
          await cloudinary.uploader.destroy(newlyUploadedPublicId, {
            type: 'authenticated',
            resource_type: newlyUploadedResourceType || 'auto'
          });
        } catch (cleanupErr) {
          console.error('Failed to clean up orphaned Cloudinary upload after DB failure:', cleanupErr);
        }
      }
      throw dbErr;
    }

    // Step C: ONLY AFTER successful database write, delete previous Cloudinary asset
    if (previousPublicId) {
      try {
        await cloudinary.uploader.destroy(previousPublicId, {
          type: 'authenticated',
          resource_type: previousResourceType
        });
      } catch (deleteErr) {
        // If old-document deletion fails, do NOT roll back DB. Log failure clearly.
        console.error('Failed to delete previous medical document from Cloudinary:', deleteErr);
      }
    }

    // Step D: Construct safe response excluding sensitive Cloudinary identifiers and permanent URLs
    const safeProfile = {
      _id: profile._id,
      participantId: profile.participantId,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies,
      medicalConditions: profile.medicalConditions,
      medications: profile.medications,
      emergencyContactDetails: profile.emergencyContactDetails,
      validUntil: profile.validUntil,
      reportFileName: profile.reportFileName,
      hasDocument: Boolean(profile.reportPublicId || profile.reportFileName),
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };

    res.status(201).json({ success: true, profile: safeProfile });
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

    if (!req.user?.organizationId || review.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'This review does not belong to your organization' });
    }

    // FIX 2: Review state precondition
    // Only pending or needs-more-info reviews can be acted upon.
    // Terminal review states (Approved, Rejected, Cancelled) cannot be transitioned.
    if (!['Pending', 'NeedsMoreInfo'].includes(review.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot review this submission because it is already '${review.status}'`
      });
    }

    // FIX 1: Verify associated booking status
    // Must be strictly 'PendingMedicalReview' before allowing Approve / Reject / NeedsMoreInfo
    const booking = await Booking.findById(review.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Associated booking not found' });
    }

    if (booking.status !== 'PendingMedicalReview') {
      return res.status(400).json({
        success: false,
        message: `Cannot review this medical submission because the booking is currently in '${booking.status}' status`
      });
    }

    // If rejected, handle capacity release and waitlist promotion in an atomic transaction
    if (status === 'Rejected') {
      const updatedReview = await withTransaction(async (session) => {
        // a. Load the MedicalReview using the SAME session
        const txReview = await MedicalReview.findById(req.params.id).session(session);
        if (!txReview) {
          const err = new Error('Medical review not found');
          err.statusCode = 404;
          throw err;
        }

        // b. Load the associated Booking using the SAME session
        const txBooking = await Booking.findById(txReview.bookingId).session(session);
        if (!txBooking) {
          const err = new Error('Associated booking not found');
          err.statusCode = 404;
          throw err;
        }

        // c. Validate all existing ownership/authorization/status rules inside session
        if (!req.user?.organizationId || txReview.organizationId.toString() !== req.user.organizationId.toString()) {
          const err = new Error('This review does not belong to your organization');
          err.statusCode = 403;
          throw err;
        }

        if (!['Pending', 'NeedsMoreInfo'].includes(txReview.status)) {
          const err = new Error(`Cannot review this submission because it is already '${txReview.status}'`);
          err.statusCode = 400;
          throw err;
        }

        if (txBooking.status !== 'PendingMedicalReview') {
          const err = new Error(`Cannot review this medical submission because the booking is currently in '${txBooking.status}' status`);
          err.statusCode = 400;
          throw err;
        }

        // d. Load and mutate the associated Batch using $inc: { reservationLock: 1 } with the SAME session
        await Batch.findOneAndUpdate(
          { _id: txBooking.batchId },
          { $inc: { reservationLock: 1 } },
          { session, new: true }
        );

        // e. Update the MedicalReview status to Rejected and preserve rejection reason/data
        txReview.status = 'Rejected';
        txReview.notes = notes;
        txReview.medicalReviewerId = req.user.userId;
        await txReview.save({ session });

        // f. Update the Booking status to Rejected using the SAME session
        txBooking.status = 'Rejected';
        await txBooking.save({ session });

        // g. Call promoteWaitlistForBatch(booking.batchId, session) using the SAME session
        await promoteWaitlistForBatch(txBooking.batchId, session);

        // h. Return updated review
        return txReview;
      });

      return res.status(200).json({ success: true, review: updatedReview });
    }

    // For Approved or NeedsMoreInfo (non-capacity-releasing transitions)
    review.status = status;
    review.notes = notes;
    review.medicalReviewerId = req.user.userId;
    await review.save();

    // NeedsMoreInfo leaves the booking at PendingMedicalReview (participant can
    // re-upload/act). Approved moves booking to MedicallyApproved and notifies coordinators.
    if (status === 'Approved') {
      booking.status = 'MedicallyApproved';
      await booking.save();
      try {
        const coordinators = await OrganizationMembership.find({
          organizationId: review.organizationId,
          role: 'TripCoordinator'
        });
        await Promise.all(coordinators.map((membership) => Notification.create({
          recipientUserId: membership.userId,
          message: `Booking ${booking._id} is ready to confirm`,
          relatedType: 'Booking',
          relatedId: booking._id
        })));
      } catch (notificationError) {
        console.error('Failed to create booking-ready notifications:', notificationError);
      }
    }
    // NeedsMoreInfo: booking stays at PendingMedicalReview, no change needed

    res.status(200).json({ success: true, review });
  } 
  catch (err) {
    console.error(err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPendingReviews = async (req, res) => {
  try{
    const reviews = await MedicalReview.find({ status: 'Pending', organizationId: req.user.organizationId })
      .populate('medicalProfileId', '-reportFileUrl -reportPublicId -reportResourceType')
      .populate('bookingId');

    // FIX 4: Never return reviews whose booking is Cancelled or not in PendingMedicalReview
    const activeReviews = reviews.filter(
      (r) => r.bookingId && r.bookingId.status === 'PendingMedicalReview'
    );

    res.status(200).json({ success: true, count: activeReviews.length, reviews: activeReviews });
  }
  catch(err){
    console.error(err);
    res.status(500).json({ success: false, message: err.message });    
  }
};

// Protected endpoint: Generates temporary signed URL for reviewing Medical Officer / OrgAdmin
export const getReviewDocument = async (req, res) => {
  try {
    const review = await MedicalReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Medical review not found' });
    }

    if (!req.user?.organizationId || review.organizationId.toString() !== req.user.organizationId.toString()) {
      return res.status(403).json({ success: false, message: 'This review does not belong to your organization' });
    }

    const profile = await MedicalProfile.findById(review.medicalProfileId);
    if (!profile || !profile.reportPublicId) {
      return res.status(404).json({ success: false, message: 'Medical document not found' });
    }

    if (!profile.reportResourceType) {
      return res.status(500).json({
        success: false,
        message: 'Document resource type is unavailable for this profile. Please request the participant to re-upload the medical document.'
      });
    }

    const ext = profile.reportFileName ? path.extname(profile.reportFileName).replace('.', '').toLowerCase() : '';
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1-hour expiry

    const signedUrl = cloudinary.utils.private_download_url(
      profile.reportPublicId,
      ext,
      {
        resource_type: profile.reportResourceType,
        type: 'authenticated',
        expires_at: expiresAt
      }
    );

    res.status(200).json({
      success: true,
      url: signedUrl,
      fileName: profile.reportFileName || 'medical-document',
      expiresAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Protected endpoint: Generates temporary signed URL for the Participant who owns the document
export const getMyMedicalDocument = async (req, res) => {
  try {
    const profile = await MedicalProfile.findOne({ participantId: req.user.userId })
      .sort({ createdAt: -1 });

    if (!profile || !profile.reportPublicId) {
      return res.status(404).json({ success: false, message: 'No medical document found for your profile' });
    }

    if (profile.participantId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!profile.reportResourceType) {
      return res.status(500).json({
        success: false,
        message: 'Document resource type is unavailable for this profile. Please re-upload the medical document.'
      });
    }

    const ext = profile.reportFileName ? path.extname(profile.reportFileName).replace('.', '').toLowerCase() : '';
    const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1-hour expiry

    const signedUrl = cloudinary.utils.private_download_url(
      profile.reportPublicId,
      ext,
      {
        resource_type: profile.reportResourceType,
        type: 'authenticated',
        expires_at: expiresAt
      }
    );

    res.status(200).json({
      success: true,
      url: signedUrl,
      fileName: profile.reportFileName || 'medical-document',
      expiresAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Protected endpoint: Retrieve current participant's profile metadata without exposing raw Cloudinary secrets
export const getMyMedicalProfile = async (req, res) => {
  try {
    const profile = await MedicalProfile.findOne({ participantId: req.user.userId })
      .sort({ createdAt: -1 });

    if (!profile) {
      return res.status(200).json({ success: true, profile: null });
    }

    res.status(200).json({
      success: true,
      profile: {
        _id: profile._id,
        bloodGroup: profile.bloodGroup,
        allergies: profile.allergies,
        medicalConditions: profile.medicalConditions,
        medications: profile.medications,
        emergencyContactDetails: profile.emergencyContactDetails,
        validUntil: profile.validUntil,
        hasDocument: Boolean(profile.reportPublicId || profile.reportFileName),
        reportFileName: profile.reportFileName
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};