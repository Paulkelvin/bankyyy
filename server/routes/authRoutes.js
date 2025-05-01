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
             const error = new Error('Server configuration error (JWT Secret missing).');
             error.statusCode = 500;
             return next(error);
        }

        try {
            console.log(`>>> Checking for existing user with email: ${email}`);
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                console.log(`>>> User already exists with email: ${email}`);
                const error = new Error('User already exists with this email');
                error.statusCode = 409; // Conflict
                return next(error);
            }

            console.log(`>>> Creating new user with email: ${email}`);
            // Let the pre-save hook handle password hashing
            const user = await User.create({
                name,
                email,
                password // Pass plain password, let pre-save hook hash it
            });

            console.log(`>>> User created successfully with ID: ${user._id}`);
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
        console.log(`\n>>> LOGIN ATTEMPT START <<<`);
        console.log(`>>> Email: ${email}`);
        console.log(`>>> Password length: ${password.length}`);

         if (!secret) {
             console.error('JWT_SECRET is missing when trying to log in.');
             const error = new Error('Server configuration error (JWT Secret missing).');
             error.statusCode = 500;
             return next(error);
         }

        try {
            console.log(`>>> Finding user with email: ${email}`);
            const user = await User.findOne({ email }).select('+password');
            
            if (!user) {
                console.log(`>>> No user found with email: ${email}`);
                const error = new Error('Invalid credentials');
                error.statusCode = 401;
                return next(error);
            }

            console.log(`>>> User found with ID: ${user._id}`);
            console.log(`>>> Has password field: ${!!user.password}`);
            
            if (!user.password) {
                console.log(`>>> WARNING: User ${user._id} has no password field`);
                const error = new Error('Invalid credentials');
                error.statusCode = 401;
                return next(error);
            }

            console.log(`>>> Attempting password comparison for user: ${user._id}`);
            const isMatch = await user.matchPassword(password);
            console.log(`>>> Password match result: ${isMatch}`);

            if (!isMatch) {
                console.log(`>>> Password mismatch for user: ${user._id}`);
                const error = new Error('Invalid credentials');
                error.statusCode = 401;
                return next(error);
            }

            // Credentials are valid, proceed to create token
            const payload = { id: user._id };
            const token = jwt.sign(payload, secret, { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '1h' });
            console.log(`>>> Login successful for user: ${user._id}`);
            console.log(`>>> LOGIN ATTEMPT END - SUCCESS <<<\n`);

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
            console.log(`>>> LOGIN ATTEMPT END - ERROR <<<\n`);
            next(err);
        }
    }
);

export default router;
