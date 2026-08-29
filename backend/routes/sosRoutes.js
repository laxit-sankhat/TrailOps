import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { triggerSOS } from '../controllers/sosController.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('TrekLeader'), triggerSOS);

export default router;