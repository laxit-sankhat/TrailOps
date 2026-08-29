import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { logIncident, addVolunteerNote } from '../controllers/incidentController.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('TrekLeader'), logIncident);
router.patch('/:id/notes', verifyToken, restrictTo('Volunteer'), addVolunteerNote);

export default router;