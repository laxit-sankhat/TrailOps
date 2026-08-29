import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { generateCertificate } from '../controllers/certificateController.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator'), generateCertificate);

export default router;