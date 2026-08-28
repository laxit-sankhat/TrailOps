import express from 'express';
import { uploadMedicalProfile, reviewMedicalSubmission, getPendingReviews } from '../controllers/medicalController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/profile', verifyToken, restrictTo('Participant'), uploadMedicalProfile);

router.patch('/reviews/:id', verifyToken, restrictTo('MedicalOfficer', 'OrgAdmin'), reviewMedicalSubmission);

router.get('/reviews/pending', verifyToken, restrictTo('MedicalOfficer', 'OrgAdmin'), getPendingReviews);

export default router;