import express from 'express';
import { createBatch, completeBatch, getMyOrgBatches, searchBatches, getBatchesByTripPublic, getBatchById } from '../controllers/batchController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin'), createBatch);

router.get('/my-org', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader', 'Volunteer', 'MedicalOfficer'), getMyOrgBatches);

router.get('/public/trip/:tripId', getBatchesByTripPublic);

router.get('/search', verifyToken, searchBatches);

router.get('/:id', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader', 'Volunteer', 'MedicalOfficer', 'SuperAdmin'), getBatchById);

router.patch('/:id/complete', verifyToken, restrictTo('OrgAdmin'), completeBatch);

export default router;