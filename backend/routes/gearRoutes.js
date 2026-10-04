import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { createGearItem, getGearItemById, allocateGear, returnGear, removeGearItem, getMyOrgGear, getMyOrgAllocations } from '../controllers/gearController.js';

const router = express.Router();

router.get('/', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader', 'Volunteer'), getMyOrgGear);

router.get('/my-org', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader', 'Volunteer'), getMyOrgGear);

router.get('/allocations', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader', 'Volunteer'), getMyOrgAllocations);

router.get('/:id', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader', 'Volunteer'), getGearItemById);

router.post('/', verifyToken, restrictTo('OrgAdmin'), createGearItem);

router.post('/allocate', verifyToken, restrictTo('TripCoordinator', 'TrekLeader', 'Volunteer'), allocateGear);

router.patch('/allocations/:id/return', verifyToken, restrictTo('TripCoordinator', 'TrekLeader', 'Volunteer'), returnGear);

router.patch('/:id/remove', verifyToken, restrictTo('OrgAdmin'), removeGearItem);

export default router;