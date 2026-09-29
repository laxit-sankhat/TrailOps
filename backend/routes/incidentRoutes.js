import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { logIncident, addVolunteerNote, getIncidentsForBatch } from '../controllers/incidentController.js';

const router = express.Router();

router.get('/batch/:batchId', verifyToken, restrictTo('TrekLeader', 'Volunteer', 'OrgAdmin', 'TripCoordinator'), getIncidentsForBatch);

router.post('/', verifyToken, restrictTo('TrekLeader'), logIncident);
router.patch('/:id/notes', verifyToken, restrictTo('Volunteer'), addVolunteerNote);

export default router;