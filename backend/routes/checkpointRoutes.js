import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js'
import { createCheckpoint, getCheckpointsByBatch } from '../controllers/checkpointController.js';

const router = express.Router();

router.get('/batch/:batchId', verifyToken, restrictTo('TrekLeader', 'Volunteer'), getCheckpointsByBatch);

router.post('/', verifyToken, restrictTo('TrekLeader'), createCheckpoint);

export default router;