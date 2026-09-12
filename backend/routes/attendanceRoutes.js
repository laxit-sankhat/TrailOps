import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { markAttendanceManual, markAttendanceByQR } from '../controllers/checkpointController.js';

const router = express.Router();

router.post('/manual', verifyToken, restrictTo('TrekLeader', 'Volunteer'), markAttendanceManual);

router.post('/scan', verifyToken, restrictTo('TrekLeader', 'Volunteer', 'OrgAdmin'), markAttendanceByQR);

export default router;