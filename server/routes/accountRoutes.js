// server/routes/accountRoutes.js
import express from 'express';
import { body, param } from 'express-validator'; // Ensure body is imported for nickname validation
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';
import {
    createAccount,
    getUserAccounts,
    getAccountById,
    getAccountTransactions,
    deleteAccount,
    renameAccount // --- Import renameAccount ---
} from '../controllers/accountController.js'; // Make sure renameAccount is exported from controller

const router = express.Router();

// Protected routes - Apply protect middleware to all routes defined in this file
router.use(protect);

// POST /api/accounts - Create Account
router.post(
    '/',
    [ // Add validation for create account if needed, e.g.:
      body('accountType').isIn(['checking', 'savings']).withMessage('Invalid account type')
    ],
    validateRequest,
    createAccount
);

// GET /api/accounts - Get all accounts for logged-in user
router.get('/', getUserAccounts);

// GET /api/accounts/:id - Get specific account by ID
router.get(
    '/:id', // Ensure param name matches usage if different from accountId
    [
        param('id', 'Valid account ID required in URL parameter').isMongoId()
    ],
    validateRequest,
    getAccountById
);

// GET /api/accounts/:accountId/transactions - Get transactions for a specific account
router.get(
    '/:accountId/transactions',
    [
        param('accountId', 'Valid account ID required in URL parameter').isMongoId()
    ],
    validateRequest,
    getAccountTransactions
);

// DELETE /api/accounts/:accountId - Delete specific account
router.delete(
    '/:accountId',
    [
        param('accountId', 'Valid account ID required in URL parameter').isMongoId()
    ],
    validateRequest,
    deleteAccount
);

// PUT /api/accounts/:accountId/rename - Rename specific account (Add/Update Nickname)
router.put(
    '/:accountId/rename', // The route path
    [ // Validation rules for this route
        param('accountId', 'Valid account ID required in URL parameter').isMongoId(),
        // Validate the nickname: optional (allows empty string/null to remove), trim, max length
        body('accountNickname')
          .optional({ checkFalsy: true }) // Allows null, undefined, empty string
          .trim()
          .isLength({ max: 50 }).withMessage('Nickname cannot exceed 50 characters.')
    ],
    validateRequest, // Middleware to check validation results
    renameAccount      // Controller function to handle the rename logic
);

export default router;