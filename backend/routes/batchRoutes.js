import express from 'express';
import { createBatch } from '../controllers/batchController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin'), createBatch);

export default router;