import logger from '../config/logger.js';

const adminLogger = (req, res, next) => {
    const logPrefix = ">>> Admin Access:";
    const ip = req.ip;
    const timestamp = new Date().toISOString();
    const userAgent = req.get('user-agent');

    // Log the attempt
    const logMessage = {
        timestamp,
        ip,
        userAgent,
        endpoint: req.originalUrl,
        method: req.method
    };

    // Use logger if available, otherwise console
    if (logger) {
        logger.info(`${logPrefix} Attempt`, logMessage);
    } else {
        console.log(`${logPrefix} Attempt`, logMessage);
    }

    // Add the log info to the request for use in the controller
    req.adminLogInfo = logMessage;

    next();
};

export default adminLogger; 