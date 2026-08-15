import express from 'express';
import {createOrganization } from '../controllers/organizationController.js';
import { verifyToken, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/', verifyToken, restrictTo('SuperAdmin'), createOrganization);

export default router;

