import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { getOrgDashboardStats, getPlatformDashboardStats } from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/org', verifyToken, restrictTo('OrgAdmin'), getOrgDashboardStats);
router.get('/platform', verifyToken, restrictTo('SuperAdmin'), getPlatformDashboardStats);

export default router;