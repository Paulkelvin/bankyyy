import { logger } from './logging.js';

// Middleware to log admin access attempts
export const adminLogger = (req, res, next) => {
    const logData = {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        method: req.method,
        path: req.path,
        userAgent: req.get('user-agent'),
        body: req.body // Log the request body for admin verification attempts
    };

    // Log the admin access attempt
    logger.info('Admin access attempt', logData);

    // Add the log data to the request for potential use in the controller
    req.adminLogData = logData;

    next();
}; 