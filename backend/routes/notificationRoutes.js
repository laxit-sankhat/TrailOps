import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getMyNotifications, markNotificationRead } from '../controllers/notificationController.js';

const router = express.Router();

router.get('/my', verifyToken, getMyNotifications);
router.patch('/:id/read', verifyToken, markNotificationRead);

export default router;
