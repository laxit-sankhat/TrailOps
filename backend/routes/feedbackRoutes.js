import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { submitFeedback } from '../controllers/feedbackController.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('Participant'), submitFeedback);

export default router;