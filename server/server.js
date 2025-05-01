// server.js
import dotenv from 'dotenv';
dotenv.config(); // E je ko wa ni ibere patapata
// --- Fi console.log kun si ibi ---
console.log(`\n>>> SERVER.JS STARTING (${new Date().toISOString()}) <<<`);
console.log(`>>> SERVER.JS: JWT_SECRET loaded: [${process.env.JWT_SECRET ? 'Yes, length=' + process.env.JWT_SECRET.length : 'No'}]`);
// -----------------------------------

import 'express-async-errors'; // Fi eleyi kun si oke

// --- Environment Variable Checks ---
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI', 'PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) { console.error(`FATAL ERROR: Missing env vars: ${missingEnvVars.join(', ')}`); process.exit(1); }

// --- Imports ---
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import logger from './config/logger.js'; // Ro pe o ti setup logger yii
import authRoutes from './routes/authRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import tempRoutes from './routes/tempRoutes.js';

// --- Database Connection ---
connectDB(); // Rii daju pe eleyi n sise dada

const app = express();

// --- Core Middleware ---
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Simple Request Logger Middleware ---
app.use((req, res, next) => {
  console.log(`>>> REQUEST: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});
// ------------------------------------

// --- Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => { console.warn(`Rate limit exceeded for IP: ${req.ip}`); res.status(options.statusCode).json({ message: `Too many requests, try again after ${Math.ceil(options.windowMs / 60 / 1000)} minutes` }); }
});
app.use('/api', limiter);

// --- API Routes ---
app.get('/api/health', (req, res) => res.status(200).send('API is running healthy!'));
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/temp', tempRoutes);

// --- Error Handling Middleware ---
// Eleyi gbodo wa leyin gbogbo routes
app.use(errorHandler);

// --- Server Initialization ---
const PORT = process.env.PORT;
const server = app.listen(PORT, () =>
  (logger ? logger.info : console.log)(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
);

// --- Global Unhandled Error Handlers ---
process.on('unhandledRejection', (err, promise) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  const stack = err instanceof Error ? err.stack : '';
  (logger ? logger.error : console.error)(`Unhandled Rejection: ${message}`, { name: err?.name, stack });
  server.close(() => { (logger ? logger.info : console.log)('Server closed due to unhandled rejection'); process.exit(1); });
});
process.on('uncaughtException', (err) => {
  (logger ? logger.error : console.error)(`Uncaught Exception: ${err.message}`, { name: err.name, stack: err.stack });
  server.close(() => { (logger ? logger.info : console.log)('Server closed due to uncaught exception'); process.exit(1); });
});
server.on('close', () => { (logger ? logger.info : console.log)('>>> Server instance closed.'); });