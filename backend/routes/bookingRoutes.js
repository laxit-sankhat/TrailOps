import express from 'express';
import { createBooking, cancelBooking, submitForMedicalReview } from '../controllers/bookingController.js';
import {verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('Participant'), createBooking);

router.patch('/:id', verifyToken, restrictTo('Participant'), cancelBooking);

router.post('/:id/submit-review', verifyToken, restrictTo('Participant'), submitForMedicalReview);

export default router;