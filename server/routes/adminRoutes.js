import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAdmin } from '../controllers/authController.js';
import { adminLogger } from '../middleware/adminLogger.js';

const router = express.Router();

// Rate limiting for admin verification
const adminVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        success: false,
        message: 'Too many admin verification attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin verification route with rate limiting and logging
router.post('/verify', adminVerificationLimiter, adminLogger, verifyAdmin);

export default router; 