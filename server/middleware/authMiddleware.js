// server/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// NOTE: Ensure dotenv.config() is ONLY called once at the top of server.js

export const protect = async (req, res, next) => {
    const logPrefix = ">>> PROTECT MIDDLEWARE:";
    console.log(`${logPrefix} Entered for ${req.method} ${req.originalUrl}`);
    let token;

    // Check 1: Check process.env immediately upon entry
    const initialJwtSecret = process.env.JWT_SECRET;
    console.log(`${logPrefix} Initial check process.env.JWT_SECRET: [${initialJwtSecret ? 'Exists, length=' + initialJwtSecret.length : 'MISSING!'}]`);

    if (!initialJwtSecret) {
         console.error(`${logPrefix} FATAL ERROR - JWT_SECRET missing at middleware start!`);
         // Throw error to be caught by central handler
         throw new Error('Server configuration error: JWT_SECRET missing.');
    }

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            console.log(`${logPrefix} Token found in header.`);

            // --- Check 2: Re-check process.env RIGHT BEFORE jwt.verify ---
            const secretForVerify = process.env.JWT_SECRET;
            console.log(`${logPrefix} Re-checking process.env.JWT_SECRET before verify: [${secretForVerify ? 'Exists' : 'MISSING NOW!'}]`);

            if (!secretForVerify) {
                 console.error(`${logPrefix} FATAL ERROR - JWT_SECRET became undefined before jwt.verify!`);
                 throw new Error('Server configuration error: JWT_SECRET unavailable during verify.');
            }
            // --- End Re-check ---

            console.log(`${logPrefix} Verifying token...`);
            // Use the variable checked immediately before
            const decoded = jwt.verify(token, secretForVerify);
            console.log(`${logPrefix} Token verified. Decoded ID: ${decoded.id}`);

            console.log(`${logPrefix} Finding user by ID: ${decoded.id}...`);
            const user = await User.findById(decoded.id).select('-password').lean();
            console.log(`${logPrefix} User find query completed. User found: ${user ? 'Yes' : 'No'}`);

            if (!user) {
                 console.warn(`${logPrefix} User not found for ID: ${decoded.id}. Sending 401.`);
                 return res.status(401).json({ message: 'Not authorized, user session invalid' });
            }

            req.user = user;
            console.log(`${logPrefix} User attached to req. Proceeding via next().`);
            next();

        } catch (err) {
             console.error(`${logPrefix} CATCH BLOCK - ${err.name}: ${err.message}`);
             let message = 'Not authorized, token invalid';
             if (err.name === 'TokenExpiredError') { message = 'Not authorized, token expired'; }
             // Ensure error is passed to central handler if using express-async-errors
             // or call next(err) if not. Sending response here bypasses central handler.
              res.status(401).json({ message: message }); // Sending direct response for 401
              // If using express-async-errors, consider:
              // const authError = new Error(message);
              // authError.statusCode = 401;
              // throw authError; // Let central handler deal with it
        }
    } else {
         console.warn(`${logPrefix} No 'Bearer' token found in authorization header.`);
         token = null;
    }

    if (!req.user && !res.headersSent) {
         console.warn(`${logPrefix} No token processed or user not attached, sending 401.`);
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};