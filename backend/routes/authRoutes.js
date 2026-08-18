import express from 'express';
import { login, refresh, logout } from '../controllers/authController.js';
import { verifyRefreshToken } from '../middleware/auth.js';
const router = express.Router();

router.post('/login', login);
router.post('/refresh', verifyRefreshToken, refresh);
router.post('/logout', verifyRefreshToken, logout);

export default router;