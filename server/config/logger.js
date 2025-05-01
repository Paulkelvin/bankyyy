// config/logger.js

// Define the logger object as before
const logger = {
  info: (msg) => console.log(`INFO: ${msg}`),
  error: (msg) => console.error(`ERROR: ${msg}`)
};

// Use 'export default' instead of 'module.exports'
export default logger;