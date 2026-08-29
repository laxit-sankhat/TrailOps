import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { postTrekStatusUpdate, getTrekStatusHistory } from '../controllers/trekStatusController.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('TrekLeader'), postTrekStatusUpdate);

router.get('/:batchId', verifyToken, getTrekStatusHistory);

export default router;