import express from 'express';
import { createBooking, cancelBooking, submitForMedicalReview, confirmBooking, getBookingQRCode, getParticipantsByBatch } from '../controllers/bookingController.js';
import {verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('Participant'), createBooking);

router.patch('/:id', verifyToken, restrictTo('Participant'), cancelBooking);

router.post('/:id/submit-review', verifyToken, restrictTo('Participant'), submitForMedicalReview);

router.patch('/confirm/:id', verifyToken, restrictTo('TripCoordinator'), confirmBooking);

router.get('/:id/qr', verifyToken, restrictTo('Participant'), getBookingQRCode);

router.get('/batch/:batchId', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader'), getParticipantsByBatch);

export default router;  