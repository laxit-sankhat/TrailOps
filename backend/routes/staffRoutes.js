import express from 'express';
import { createStaffMember, removeStaffMember, reactivateStaffMember, getMyOrgStaff, getStaffMemberById } from '../controllers/staffController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/', verifyToken, restrictTo('OrgAdmin'), getMyOrgStaff);

router.get('/my-org', verifyToken, restrictTo('OrgAdmin'), getMyOrgStaff);

router.get('/:userId', verifyToken, restrictTo('OrgAdmin'), getStaffMemberById);

router.post('/', verifyToken, restrictTo('OrgAdmin'), createStaffMember);

router.patch('/:userId/remove', verifyToken, restrictTo('OrgAdmin'), removeStaffMember);

router.patch('/:userId/activate', verifyToken, restrictTo('OrgAdmin'), reactivateStaffMember);

export default router;