import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { createBatchAssignment } from '../controllers/batchAssignmentController.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin'), createBatchAssignment);

export default router;