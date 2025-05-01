// middleware/validateRequest.js
import { validationResult } from 'express-validator'; // Changed to ES Module import

// Add 'export' keyword here for a named export
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// This middleware checks for validation errors in the request and sends a 400 response if any are found.