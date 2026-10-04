import express from 'express';
import {
  createTrip,
  getTripsByOrganization,
  getMyOrgTrips,
  getTripById,
  getTripOrOrgTrips,
  updateTrip,
  searchTrips,
  uploadTripImage,
  removeTripImage,
  getAllApprovedTrips,
  getBatchesForTrip,
  getActiveTripsWithBatches,
  getCompletedTripsWithBatches
} from '../controllers/tripController.js';
import { verifyToken, restrictTo, restrictToOwnOrg } from '../middleware/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin'), createTrip);

router.get('/my-org', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator', 'TrekLeader'), getMyOrgTrips);

router.get('/search', verifyToken, searchTrips);

router.get('/public/all', getAllApprovedTrips);
router.get('/public/active', getActiveTripsWithBatches);
router.get('/public/completed', getCompletedTripsWithBatches);

router.get('/:tripId/batches', getBatchesForTrip);

router.get('/detail/:id', verifyToken, getTripById);
router.get('/organization/:organizationId', verifyToken, restrictToOwnOrg, getTripsByOrganization);
router.get('/:id', verifyToken, getTripOrOrgTrips);

router.patch('/:id', verifyToken, restrictTo('OrgAdmin'), updateTrip);

router.post('/:id/image', verifyToken, restrictTo('OrgAdmin'), upload.single('image'), uploadTripImage);

router.delete('/:id/images/:publicId', verifyToken, restrictTo('OrgAdmin'), removeTripImage);

export default router;