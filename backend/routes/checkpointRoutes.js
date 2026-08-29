import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js'
import { createCheckpoint } from '../controllers/checkpointController.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('TrekLeader'), createCheckpoint);

export default router;