import express from 'express';
import {
  uploadMedicalProfile,
  reviewMedicalSubmission,
  getPendingReviews,
  getReviewDocument,
  getMyMedicalDocument,
  getMyMedicalProfile
} from '../controllers/medicalController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import medicalUpload from '../config/medicalMulter.js';

const router = express.Router();

// Participant: Upload or update medical profile with optional document
router.post(
  '/profile',
  verifyToken,
  restrictTo('Participant'),
  medicalUpload.single('report'),
  uploadMedicalProfile
);

// Participant: Retrieve current profile details & safe document metadata
router.get(
  '/profile/my',
  verifyToken,
  restrictTo('Participant'),
  getMyMedicalProfile
);

// Participant: Get temporary signed URL for own medical document
router.get(
  '/profile/my/document',
  verifyToken,
  restrictTo('Participant'),
  getMyMedicalDocument
);

// Medical Officer / OrgAdmin: Get temporary signed URL for reviewing document
router.get(
  '/reviews/:id/document',
  verifyToken,
  restrictTo('MedicalOfficer', 'OrgAdmin'),
  getReviewDocument
);

// Medical Officer / OrgAdmin: Review and decide on medical submission
router.patch(
  '/reviews/:id',
  verifyToken,
  restrictTo('MedicalOfficer', 'OrgAdmin'),
  reviewMedicalSubmission
);

// Medical Officer / OrgAdmin: Get pending reviews for their organization
router.get(
  '/reviews/pending',
  verifyToken,
  restrictTo('MedicalOfficer', 'OrgAdmin'),
  getPendingReviews
);

export default router;