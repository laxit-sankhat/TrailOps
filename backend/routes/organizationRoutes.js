import express from 'express';
import {
  createOrganization,
  getMyOrgProfile,
  updateMyOrgProfile
} from '../controllers/organizationController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/my-org', verifyToken, restrictTo('OrgAdmin'), getMyOrgProfile);
router.patch('/my-org', verifyToken, restrictTo('OrgAdmin'), updateMyOrgProfile);
router.post('/', verifyToken, restrictTo('SuperAdmin'), createOrganization);

export default router;

