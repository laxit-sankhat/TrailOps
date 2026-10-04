import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import {
  submitFeedback,
  getMyFeedback,
  getOrgFeedback,
  getOrgFeedbackStats
} from '../controllers/feedbackController.js';

const router = express.Router();

router.get('/my', verifyToken, restrictTo('Participant'), getMyFeedback);
router.get('/my-org', verifyToken, restrictTo('OrgAdmin'), getOrgFeedback);
router.get('/my-org/stats', verifyToken, restrictTo('OrgAdmin'), getOrgFeedbackStats);
router.post('/', verifyToken, restrictTo('Participant'), submitFeedback);

export default router;