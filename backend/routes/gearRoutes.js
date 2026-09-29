import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { createGearItem, allocateGear, returnGear, removeGearItem, getMyOrgGear } from '../controllers/gearController.js';

const router = express.Router();

router.get('/', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader', 'Volunteer'), getMyOrgGear);

router.post('/', verifyToken, restrictTo('OrgAdmin'), createGearItem);

router.post('/allocate', verifyToken, restrictTo('TripCoordinator', 'TrekLeader', 'Volunteer'), allocateGear);

router.patch('/allocations/:id/return', verifyToken, restrictTo('TripCoordinator', 'TrekLeader', 'Volunteer'), returnGear);

router.patch('/:id/remove', verifyToken, restrictTo('OrgAdmin'), removeGearItem);

export default router;