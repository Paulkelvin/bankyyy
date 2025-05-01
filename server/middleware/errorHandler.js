// server/middleware/errorHandler.js
// Optional: Import logger if configured
// import logger from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log error details
    console.error(`Error: ${message}`, {
        statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        stack: err.stack
    });

    // Send error response
    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

// Custom error class for API errors
export class ApiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Validation error handler
export const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(error => error.message);
    return new ApiError(`Invalid input: ${errors.join('. ')}`, 400);
};

// Duplicate key error handler
export const handleDuplicateKeyError = (err) => {
    const field = Object.keys(err.keyValue)[0];
    return new ApiError(`Duplicate value for ${field}. Please use another value.`, 400);
};

// Cast error handler (invalid MongoDB ObjectId)
export const handleCastError = (err) => {
    return new ApiError(`Invalid ${err.path}: ${err.value}`, 400);
};

// JWT error handlers
export const handleJWTError = () => new ApiError('Invalid token. Please log in again.', 401);
export const handleJWTExpiredError = () => new ApiError('Your token has expired. Please log in again.', 401);