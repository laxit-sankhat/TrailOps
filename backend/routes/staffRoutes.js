import express from 'express';
import { createStaffMember, removeStaffMember, getMyOrgStaff } from '../controllers/staffController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, restrictTo('OrgAdmin'), getMyOrgStaff);

router.post('/', verifyToken, restrictTo('OrgAdmin'), createStaffMember);

router.patch('/:userId/remove', verifyToken, restrictTo('OrgAdmin'), removeStaffMember);

export default router;