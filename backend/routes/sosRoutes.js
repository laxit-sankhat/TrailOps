import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { triggerSOS, getSOSAlertsForBatch } from '../controllers/sosController.js';

const router = express.Router();

router.get('/batch/:batchId', verifyToken, restrictTo('TrekLeader', 'Volunteer', 'OrgAdmin', 'TripCoordinator'), getSOSAlertsForBatch);

router.post('/', verifyToken, restrictTo('TrekLeader'), triggerSOS);

export default router;