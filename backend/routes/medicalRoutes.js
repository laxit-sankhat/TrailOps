import express from 'express';
import { uploadMedicalProfile } from '../controllers/medicalController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/profile', verifyToken, restrictTo('Participant'), uploadMedicalProfile);

export default router;