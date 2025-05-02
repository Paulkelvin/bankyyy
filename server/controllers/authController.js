import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
    const logPrefix = ">>> register:";
    console.log(`${logPrefix} Registration attempt started`);
    console.log(`${logPrefix} Request body:`, req.body);
    
    const { name, email, password } = req.body;
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error(`${logPrefix} JWT_SECRET is missing when trying to register user.`);
        const error = new Error('Server configuration error (JWT Secret missing).');
        error.statusCode = 500;
        return next(error);
    }

    // Validate required fields
    if (!name || !email || !password) {
        console.warn(`${logPrefix} Missing required fields:`, { 
            hasName: !!name, 
            hasEmail: !!email, 
            hasPassword: !!password 
        });
        const error = new Error('All fields (name, email, password) are required');
        error.statusCode = 400;
        return next(error);
    }

    try {
        console.log(`${logPrefix} Checking for existing user with email: ${email}`);
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log(`${logPrefix} User already exists with email: ${email}`);
            const error = new Error('User already exists with this email');
            error.statusCode = 409; // Conflict
            return next(error);
        }

        console.log(`${logPrefix} Creating new user with email: ${email}`);
        const user = await User.create({
            name,
            email,
            password
        });

        console.log(`${logPrefix} User created successfully with ID: ${user._id}`);
        const payload = { id: user._id };
        const token = jwt.sign(payload, secret, { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '1h' });

        console.log(`${logPrefix} Registration successful, sending response`);
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        console.error(`${logPrefix} Registration Error:`, err);
        next(err);
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
    const { email, password } = req.body;
    const secret = process.env.JWT_SECRET;
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

        const payload = { id: user._id };
        const token = jwt.sign(payload, secret, { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '1h' });
        console.log(`>>> Login successful for user: ${user._id}`);
        console.log(`>>> LOGIN ATTEMPT END - SUCCESS <<<\n`);

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
};

// @desc    Verify admin password for registration
// @route   POST /api/auth/verify-admin
// @access  Public
export const verifyAdmin = async (req, res, next) => {
    const logPrefix = ">>> verifyAdmin:";
    console.log(`${logPrefix} Attempting admin verification...`);
    console.log(`${logPrefix} Request body:`, req.body);
    console.log(`${logPrefix} ADMIN_PASSWORD env var exists:`, !!process.env.ADMIN_PASSWORD);
    console.log(`${logPrefix} ADMIN_PASSWORD length:`, process.env.ADMIN_PASSWORD?.length);

    try {
        const { password } = req.body;
        
        if (!password) {
            console.warn(`${logPrefix} No admin password provided`);
            return res.status(400).json({ 
                success: false, 
                message: 'Admin password is required' 
            });
        }

        // Get admin password from environment variable
        const correctPassword = process.env.ADMIN_PASSWORD;
        
        if (!correctPassword) {
            console.error(`${logPrefix} ADMIN_PASSWORD environment variable is not set`);
            return res.status(500).json({ 
                success: false, 
                message: 'Server configuration error' 
            });
        }
        
        console.log(`${logPrefix} Comparing passwords - Provided: "${password}", Expected: "${correctPassword}"`);
        if (password !== correctPassword) {
            console.warn(`${logPrefix} Invalid admin password attempt`);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin password' 
            });
        }

        console.log(`${logPrefix} Admin verification successful`);
        res.status(200).json({ 
            success: true, 
            message: 'Admin verification successful' 
        });

    } catch (error) {
        console.error(`${logPrefix} Error during admin verification:`, error);
        next(error);
    }
};
