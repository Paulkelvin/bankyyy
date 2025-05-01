// server/config/db.js
import mongoose from 'mongoose';
// Optional: import logger if you want to use it here
// import logger from './logger.js';

const connectDB = async () => {
  try {
    // Connect to MongoDB using the URI from environment variables
    // useNewUrlParser and useUnifiedTopology are default in Mongoose 6+ and can be removed
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // Log successful connection
    const logMessage = `MongoDB Connected: ${conn.connection.host}`;
    console.log(logMessage); // Keep console log for immediate feedback
    // if (logger) { logger.info(logMessage); } // Use logger if available
    console.log(`>>> MongoDB Connected: ${conn.connection.host} <<<`);

  } catch (error) {
    // Log connection error
    const errorMessage = `MongoDB Connection Error: ${error.message}`;
    console.error(errorMessage);
    // if (logger) { logger.error(errorMessage, { stack: error.stack }); } // Use logger if available
    console.error(`>>> MONGODB CONNECTION FAILED: ${error.message} <<<`, error);
    // Exit the process with failure code
    process.exit(1);
  }
};

// Export the function as the default export
export default connectDB;
