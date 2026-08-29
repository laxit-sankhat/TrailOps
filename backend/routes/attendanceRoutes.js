import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { markAttendance } from '../controllers/checkpointController.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('TrekLeader', 'Volunteer'), markAttendance);

export default router;