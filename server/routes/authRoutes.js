// server/routes/authRoutes.js
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Using bcryptjs
import { body } from 'express-validator'; // Import validation functions
import User from '../models/User.js';
import { validateRequest } from '../middleware/validateRequest.js'; // Import validation middleware

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
    async (req, res, next) => { // Route handler logic
        const { name, email, password } = req.body;
        const secret = process.env.JWT_SECRET; // Access env var inside handler

        if (!secret) {
             console.error('JWT_SECRET is missing when trying to register user.');
             // Pass configuration error to central handler
             const error = new Error('Server configuration error (JWT Secret missing).');
             error.statusCode = 500;
             return next(error);
        }

        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                // Pass conflict error to central handler
                const error = new Error('User already exists with this email');
                error.statusCode = 409; // Conflict
                return next(error);
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = await User.create({
                name,
                email,
                password: hashedPassword
            });

            const payload = { id: user._id };
            const token = jwt.sign(payload, secret, { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '1h' });

            // Send SUCCESS response
            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (err) {
            console.error('Registration Error:', err);
            // Pass unexpected errors (DB errors, etc.) to central handler
            next(err);
        }
    }
);

// Login Route with Validation
router.post(
    '/login',
    [ // Array of validation rules
        body('email', 'Please include a valid email').isEmail().normalizeEmail(),
        body('password', 'Password is required').not().isEmpty()
    ],
    validateRequest, // Middleware to check validation results
    async (req, res, next) => { // Route handler logic
        const { email, password } = req.body;
        const secret = process.env.JWT_SECRET; // Access env var inside handler

         if (!secret) {
             console.error('JWT_SECRET is missing when trying to log in.');
             const error = new Error('Server configuration error (JWT Secret missing).');
             error.statusCode = 500;
             return next(error);
         }

        try {
            const user = await User.findOne({ email }).select('+password');

            // Check credentials
            if (!user || !(await user.matchPassword(password))) {
                 // *** CHANGED HERE: Use next(error) for invalid credentials ***
                 const error = new Error('Invalid credentials');
                 error.statusCode = 401; // Unauthorized
                 return next(error);
            }

            // Credentials are valid, proceed to create token
            const payload = { id: user._id };
            const token = jwt.sign(payload, secret, { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '1h' });

            // Send SUCCESS response
            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });

        } catch (err) {
            console.error('Login Error:', err);
            // Pass unexpected errors (DB errors, etc.) to central handler
            next(err);
        }
    }
);

export default router;
