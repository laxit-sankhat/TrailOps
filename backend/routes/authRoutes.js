import express from 'express';
import { login, refresh, logout, requestPasswordReset, resetPassword } from '../controllers/authController.js';
import { verifyRefreshToken } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit'; 

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' }
});

router.post('/login', loginLimiter, login);

router.post('/refresh', verifyRefreshToken, refresh);

router.post('/logout', verifyRefreshToken, logout);

router.post('/request-password-reset', requestPasswordReset);

router.post('/reset-password', resetPassword);

export default router;