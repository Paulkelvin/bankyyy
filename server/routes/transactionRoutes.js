// server/routes/transactionRoutes.js
import express from 'express';
import { body, param } from 'express-validator';
import {
    createTransaction,         // Deposit/Withdrawal
    // transferBetweenAccounts, // Comment out or remove old direct transfers
    // transferToExternalAccount,
    getUserTransactions,
    getTransactionsForAccount,
    initiateTransfer,          // NEW: Initiate OTP flow
    executeTransfer            // NEW: Execute after OTP
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = express.Router();

// Apply protect middleware to all transaction routes
router.use(protect);

// POST /api/transactions - Create Deposit/Withdrawal (No OTP needed)
router.post(
    '/',
    [ // Validation rules
        body('accountId', 'Account ID is required').isMongoId(),
        body('type', 'Transaction type is required').isIn(['deposit', 'withdrawal']),
        body('amount', 'Amount must be a positive number string').isString().matches(/^\d+(\.\d{1,2})?$/).custom(v => parseFloat(v) > 0),
        body('description').optional().trim().escape(),
        body('transactionDate').optional().isISO8601().toDate(), // Validate if date is provided
        body('withdrawalMethod').optional().if(body('type').equals('withdrawal')).isString().trim().escape()
    ],
    // --- ADD LOGGING ---
    (req, res, next) => {
        console.log(">>> Route POST /api/transactions - BEFORE validateRequest");
        next();
    },
    validateRequest, // Check validation results
    (req, res, next) => {
        console.log(">>> Route POST /api/transactions - AFTER validateRequest");
        next();
    },
    // --- END LOGGING ---
    createTransaction // Call controller function
);


// --- NEW: OTP Transfer Flow ---

// POST /api/transactions/transfer/initiate - Start transfer, send OTP
router.post(
    '/transfer/initiate',
    [ // Validation for initiation request
        body('transferType', 'Transfer type is required').isIn(['internal', 'external']),
        body('fromAccountId', 'From Account ID required').isMongoId(),
        body('toAccountId', 'To Account ID required for internal transfer').if(body('transferType').equals('internal')).isMongoId(),
        body('recipientAccountNumber', 'Recipient account number required for external transfer').if(body('transferType').equals('external')).isString().trim().notEmpty().escape(),
        body('amount', 'Amount must be a positive number string').isString().matches(/^\d+(\.\d{1,2})?$/).custom(v => parseFloat(v) > 0),
        body('description').optional().trim().escape(),
    ],
    validateRequest,
    initiateTransfer
);

// POST /api/transactions/transfer/execute - Verify OTP and execute transfer
router.post(
    '/transfer/execute',
    [ // Validation for execution request
        body('transferType', 'Transfer type is required').isIn(['internal', 'external']),
        body('fromAccountId', 'From Account ID required').isMongoId(),
        body('toAccountId', 'To Account ID required for internal transfer').if(body('transferType').equals('internal')).isMongoId(),
        body('recipientAccountNumber', 'Recipient account number required for external transfer').if(body('transferType').equals('external')).isString().trim().notEmpty().escape(),
        body('amount', 'Amount must be a positive number string').isString().matches(/^\d+(\.\d{1,2})?$/).custom(v => parseFloat(v) > 0),
        body('description').optional().trim().escape(),
        body('otp', 'OTP is required').isString().isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'), // Improved OTP validation
    ],
    validateRequest,
    executeTransfer
);

// --- END: OTP Transfer Flow ---


// --- Old Direct Transfer Routes (Commented out - Use OTP flow) ---
/*
router.post(
    '/transfer',
    protect,
    [ // Validation rules
        body('fromAccountId', 'From Account ID required').isMongoId(),
        body('toAccountId', 'To Account ID required').isMongoId(),
        body('amount', 'Amount must be a positive number string').isString().matches(/^\d+(\.\d{1,2})?$/).custom(v => parseFloat(v) > 0),
        body('description').optional().trim().escape(),
    ],
    validateRequest,
    transferBetweenAccounts // Calls the old controller directly
);

router.post(
    '/external-transfer',
    protect,
    [ // Validation rules
        body('fromAccountId', 'From Account ID required').isMongoId(),
        body('recipientAccountNumber', 'Recipient account number required').isString().trim().notEmpty().isLength({ min: 5, max: 20 }).escape(),
        body('amount', 'Amount must be a positive number string').isString().matches(/^\d+(\.\d{1,2})?$/).custom(v => parseFloat(v) > 0),
        body('description').optional().trim().escape(),
    ],
    validateRequest,
    transferToExternalAccount // Calls the old controller directly
);
*/
// --- End Old Direct Transfer Routes ---


// --- Read Routes ---

// GET /api/transactions - Get all transactions for user
router.get('/', getUserTransactions);

// GET /api/transactions/account/:accountId - Get transactions for specific account
router.get(
    '/account/:accountId',
    [param('accountId', 'Valid accountId required').isMongoId()],
    validateRequest,
    getTransactionsForAccount
);


export default router;