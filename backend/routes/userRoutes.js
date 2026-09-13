import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { updateMyProfile } from '../controllers/userController.js';

const router = express.Router();

router.patch('/me', verifyToken, updateMyProfile);

export default router;