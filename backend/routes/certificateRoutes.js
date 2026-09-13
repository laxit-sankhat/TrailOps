import express from 'express';
import { verifyToken, restrictTo } from '../middleware/auth.js';
import { generateCertificate, verifyCertificate } from '../controllers/certificateController.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('OrgAdmin', 'TripCoordinator'), generateCertificate);

router.get('/verify/:code', verifyCertificate);

export default router;