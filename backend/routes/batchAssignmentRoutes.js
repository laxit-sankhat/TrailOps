import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { createBatchAssignment, removeBatchAssignment, getMyBatchAssignments } from '../controllers/batchAssignmentController.js';

const router = express.Router();

router.get('/my', verifyToken, restrictTo('TrekLeader', 'Volunteer'), getMyBatchAssignments);

router.post('/', verifyToken, restrictTo('OrgAdmin'), createBatchAssignment);

router.delete('/:id', verifyToken, restrictTo('OrgAdmin'), removeBatchAssignment);

export default router;