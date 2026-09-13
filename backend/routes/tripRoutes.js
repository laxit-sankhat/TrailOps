import express from 'express';
import { createTrip, getTripsByOrganization, updateTrip, searchTrips, uploadTripImage } from '../controllers/tripController.js';
import { verifyToken, restrictTo, restrictToOwnOrg } from '../middleware/auth.js';
import upload from '../config/multer.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin'), createTrip);

router.get('/search', verifyToken, searchTrips);

router.get('/:organizationId', verifyToken, restrictToOwnOrg, getTripsByOrganization);

router.patch('/:id', verifyToken, restrictTo('OrgAdmin'), updateTrip);

router.post('/:id/image', verifyToken, restrictTo('OrgAdmin'), upload.single('image'), uploadTripImage);

export default router;