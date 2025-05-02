// server.js
import dotenv from 'dotenv';
dotenv.config(); // E je ko wa ni ibere patapata
// --- Fi console.log kun si ibi ---
console.log(`\n>>> SERVER.JS STARTING (${new Date().toISOString()}) <<<`);
console.log(`>>> SERVER.JS: JWT_SECRET loaded: [${process.env.JWT_SECRET ? 'Yes, length=' + process.env.JWT_SECRET.length : 'No'}]`);
// -----------------------------------

import 'express-async-errors'; // Fi eleyi kun si oke

// --- Environment Variable Checks ---
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI', 'PORT', 'ADMIN_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    console.error(`FATAL ERROR: Missing env vars: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

// --- Imports ---
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger, errorLogger } from './middleware/logging.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tempRoutes from './routes/tempRoutes.js';

// --- Database Connection ---
connectDB(); // Rii daju pe eleyi n sise dada

const app = express();

// --- Core Middleware ---
const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',') 
    : ['http://localhost:5173', 'https://bankyyy-front.onrender.com'];

// Configure Helmet with CORS compatibility
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// Configure CORS with more specific options
app.use(cors({ 
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Logging Middleware ---
app.use(requestLogger);

// --- Rate Limiting ---
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        success: false,
        message: 'Too many requests, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiters
app.use('/api', generalLimiter);

// --- API Routes ---
app.get('/api/health', (req, res) => res.status(200).send('API is running healthy!'));
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/temp', tempRoutes);

// --- Error Handling Middleware ---
app.use(errorLogger); // Log errors before handling them
app.use(errorHandler);

// --- Server Initialization ---
const PORT = process.env.PORT;
const server = app.listen(PORT, () =>
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
);

// --- Global Unhandled Error Handlers ---
process.on('unhandledRejection', (err, promise) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
});

server.on('close', () => console.log('Server instance closed.'));