// server/routes/userRoutes.js
import express from 'express';
import { body } from 'express-validator'; // For validation
import { protect } from '../middleware/authMiddleware.js'; // Protect routes
import { validateRequest } from '../middleware/validateRequest.js'; // Handle validation errors
import {
  getUserProfile,
  updateUserProfile,
} from '../controllers/userController.js'; // Import controller functions

const router = express.Router();

// All routes below are protected
router.use(protect);

// GET /api/users/profile - Get logged-in user's profile
router.get('/profile', getUserProfile);

// PUT /api/users/profile - Update logged-in user's profile
router.put(
  '/profile',
  [
    // Keep name validation
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name cannot be empty if provided')
      .isLength({ min: 2 }).withMessage('Name must be at least 2 characters long')
      .escape(),

    // --- ADD Validation for Phone (optional) ---
    body('phoneNumber')
      .optional({ checkFalsy: true }) // Treat empty string as optional
      .trim()
      // Add specific phone validation if needed (e.g., using isMobilePhone from validator)
      // .isMobilePhone('en-NG') // Example for Nigerian numbers (requires 'validator' package)
      .escape(),
    // -------------------------------------------

    // --- ADD Validation for Address (optional) ---
     body('address')
      .optional({ checkFalsy: true }) // Treat empty string as optional
      .trim()
      .isLength({ min: 5 }).withMessage('Address should be at least 5 characters if provided')
      .escape(),
    // -------------------------------------------
  ],
  validateRequest, // Check validation results
  updateUserProfile // Call controller function
);

export default router;