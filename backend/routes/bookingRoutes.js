import express from 'express';
import { createBooking, cancelBooking, submitForMedicalReview, confirmBooking, getBookingQRCode, getParticipantsByBatch, getMyBookings } from '../controllers/bookingController.js';
import {verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/my', verifyToken, restrictTo('Participant'), getMyBookings);

router.post('/', verifyToken, restrictTo('Participant'), createBooking);

router.patch('/:id', verifyToken, restrictTo('Participant'), cancelBooking);

router.post('/:id/submit-review', verifyToken, restrictTo('Participant'), submitForMedicalReview);

router.patch('/confirm/:id', verifyToken, restrictTo('TripCoordinator'), confirmBooking);

router.get('/:id/qr', verifyToken, restrictTo('Participant'), getBookingQRCode);

router.get('/batch/:batchId', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader', 'Volunteer'), getParticipantsByBatch);

export default router;  