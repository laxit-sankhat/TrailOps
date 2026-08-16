import express from 'express';
import { createTrip, getTripsByOrganization } from '../controllers/tripController.js';
import { verifyToken, restrictTo, restrictToOwnOrg } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin'), createTrip);

router.get('/:organizationId', verifyToken, restrictToOwnOrg, getTripsByOrganization);

export default router;