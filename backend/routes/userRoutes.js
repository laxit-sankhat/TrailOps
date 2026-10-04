import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { getMyProfile, updateMyProfile } from '../controllers/userController.js';

const router = express.Router();

router.get('/me', verifyToken, getMyProfile);
router.patch('/me', verifyToken, updateMyProfile);

export default router;