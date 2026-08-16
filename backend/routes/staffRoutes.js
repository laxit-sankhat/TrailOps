import express from 'express';
import { createStaffMember } from '../controllers/staffController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin'), createStaffMember);

export default router;