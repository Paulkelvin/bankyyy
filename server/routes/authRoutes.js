// server/routes/authRoutes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Using bcryptjs
import { body } from 'express-validator'; // Import validation functions
import User from '../models/User.js';
import { validateRequest } from '../middleware/validateRequest.js'; // Import validation middleware
import { login, register, verifyAdmin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import adminLogger from '../middleware/adminLogger.js';

const router = express.Router();

// Register Route with Validation
router.post(
    '/register',
    [ // Array of validation rules
        body('name', 'Name is required').not().isEmpty().trim().escape(),
        body('email', 'Please include a valid email').isEmail().normalizeEmail(),
        body('password', 'Password must be at least 6 characters').isLength({ min: 6 })
    ],
    validateRequest, // Middleware to check validation results
    register
);

// Login Route with Validation
router.post(
    '/login',
    [ // Array of validation rules
        body('email', 'Please include a valid email').isEmail().normalizeEmail(),
        body('password', 'Password is required').not().isEmpty()
    ],
    validateRequest, // Middleware to check validation results
    login
);

router.post('/verify-admin', adminLogger, verifyAdmin);

export default router;
