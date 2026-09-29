import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { createBookingGroup, joinBookingGroup, submitBookingGroup, getMyOpenGroups } from '../controllers/bookingGroupController.js';

const router = express.Router();

router.get('/my', verifyToken, restrictTo('Participant'), getMyOpenGroups);

router.post('/', verifyToken, restrictTo('Participant'), createBookingGroup);

router.post('/join', verifyToken, restrictTo('Participant'), joinBookingGroup);

router.patch('/:id/submit', verifyToken, restrictTo('Participant'), submitBookingGroup);

export default router;