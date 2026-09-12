import express from 'express';
import { createBatch, completeBatch } from '../controllers/batchController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin'), createBatch);

router.patch('/:id/complete', verifyToken, restrictTo('OrgAdmin'), completeBatch);

export default router;