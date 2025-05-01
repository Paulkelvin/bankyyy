// server/middleware/errorHandler.js
// Optional: Import logger if configured
// import logger from '../config/logger.js';

export const errorHandler = (err, req, res, next) => {
    // Determine status code: Use error's statusCode if it's a valid error code, otherwise default to 500
    let statusCode = (err.statusCode && err.statusCode >= 400 && err.statusCode < 600)
        ? err.statusCode
        : 500;

    let message = err.message || 'Internal Server Error';

    // --- Specific Error Handling (Examples) ---

    // Mongoose CastError (Invalid ObjectId format)
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
         statusCode = 404; // Or 400 depending on preference
         message = `Resource not found. Invalid ID format for path: ${err.path || 'unknown path'}`;
    }

    // Mongoose Duplicate Key Error
    if (err.code === 11000) {
         statusCode = 409; // Conflict (or 400 Bad Request)
         // Extract duplicate field key from error message if possible
         const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
         message = `Duplicate value entered for '${field}'. Please use another value.`;
    }

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
         statusCode = 400; // Bad Request
         // Combine multiple validation error messages
         try {
             message = Object.values(err.errors).map(val => val.message).join(', ');
         } catch {
             message = 'Validation Error'; // Fallback if error structure is unexpected
         }
    }

    // --- End Specific Error Handling ---


    // Log the error (use logger if available)
    // Add more details like request body for debugging if not in production
    const logContext = process.env.NODE_ENV !== 'production' ? { body: req.body, params: req.params, query: req.query } : {};
    const logMessage = `[${statusCode}] ${message} (${req.method} ${req.originalUrl})`;
    console.error(logMessage, logContext); // Basic console log
    // if (logger) logger.error(logMessage, { stack: err.stack, errorDetails: err, requestContext: logContext }); // Example with logger


    const stack = process.env.NODE_ENV === 'production' ? null : err.stack;

    // --- ADD CHECK for headersSent ---
    if (res.headersSent) {
         console.error("errorHandler ERROR: Headers were already sent for this request. Cannot send error JSON response. Check middleware order or double responses.");
         // Cannot set status or send JSON, delegate to default Express handler
         return next(err);
    }
    // --- END CHECK ---


    // Send the JSON response
    res.status(statusCode).json({
        message: message, // Send the determined message
        stack: stack, // Will be null in production
        // Optionally add error code or name in non-production
        ...(process.env.NODE_ENV !== 'production' && { code: err.code, name: err.name })
    });
};