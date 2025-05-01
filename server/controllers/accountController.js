// server/controllers/accountController.js
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import User from '../models/User.js'; // Keep if needed by other functions potentially
import Transaction from '../models/Transaction.js'; // Import Transaction model

// @desc    Create a new bank account
// @route   POST /api/accounts
// @access  Private
export const createAccount = async (req, res, next) => {
    const { accountType } = req.body;
    if (!req.user || !req.user._id) { return next(new Error('User not authenticated')); }
    const userId = req.user._id;
    try {
        const account = await Account.create({ userId: userId, accountType: accountType });
        // Ensure balance exists before toString, using default from schema if needed
        const responseAccount = { ...account.toObject(), balance: account.balance?.toString() || '0.00' };
        res.status(201).json({ success: true, data: responseAccount });
    } catch (error) {
        if (error.code === 11000) { const customError = new Error('Account number conflict, please try again.'); customError.statusCode = 409; return next(customError); }
        next(error);
    }
};

// @desc    Get all accounts for the logged-in user
// @route   GET /api/accounts
// @access  Private
export const getUserAccounts = async (req, res, next) => {
    const logPrefix = ">>> getUserAccounts:";
    console.log(`${logPrefix} CONTROLLER START <<<`);
    if (!req.user || !req.user._id) { console.error(`${logPrefix} ERROR - req.user missing!`); throw Object.assign(new Error('Not authenticated'), { statusCode: 401 }); }
    const userId = req.user._id;
    console.log(`${logPrefix} User ID from req.user: ${userId}`);

    let accounts = null;
    try {
        console.log(`${logPrefix} Preparing to query: Account.find({ userId: "${userId}" }).lean()`);
        accounts = await Account.find({ userId: userId }).lean(); // THE QUERY
        console.log(`${logPrefix} Database query FINISHED. Found ${accounts?.length ?? 'null/undefined'} accounts.`);

        if (!Array.isArray(accounts)) {
             console.error(`${logPrefix} ERROR after query - 'accounts' is not an array! Type: ${typeof accounts}, Value:`, accounts);
             throw new Error('Internal server error retrieving account data.');
        }

        console.log(`${logPrefix} Mapping account balances to strings...`);
        const responseAccounts = accounts.map(acc => ({
            ...acc,
            balance: acc.balance ? acc.balance.toString() : '0.00' // Handle potential null/undefined balance
        }));
        console.log(`${logPrefix} Mapping complete. Sending 200 response...`);

        res.status(200).json({ success: true, count: responseAccounts.length, data: responseAccounts });
        console.log(`${logPrefix} Response successfully sent.`);

    } catch (error) {
        console.error(`${logPrefix} CAUGHT ERROR during DB query or processing:`, error);
        next(error); // Pass error via next
    }
};

// @desc    Get a single account by its ID
// @route   GET /api/accounts/:id
// @access  Private
export const getAccountById = async (req, res, next) => {
     if (!req.user || !req.user._id) { return next(new Error('Not authenticated')); }
     const userId = req.user._id;
     const accountId = req.params.id;
     if (!mongoose.Types.ObjectId.isValid(accountId)) { const error = new Error('Invalid account ID format'); error.statusCode = 400; return next(error); }
     try {
        const account = await Account.findById(accountId).lean();
        if (!account) { const error = new Error('Account not found'); error.statusCode = 404; return next(error); }
        if (account.userId.toString() !== userId.toString()) { const error = new Error('Not authorized to access this account'); error.statusCode = 403; return next(error); }
        const responseAccount = { ...account, balance: account.balance ? account.balance.toString() : '0.00' };
        res.status(200).json({ success: true, data: responseAccount });
     } catch (error) {
        next(error);
     }
};

// @desc    Get transaction history for a specific account
// @route   GET /api/accounts/:accountId/transactions
// @access  Private
export const getAccountTransactions = async (req, res, next) => {
     const log = console; // Use console if logger not set up
     log.info('>>> getAccountTransactions: Attempting...');
     if (!req.user || !req.user._id) { log.warn('>>> getAccountTransactions: User not authenticated'); return next(new Error('User not authenticated')); }
     const userId = req.user._id;
     const accountId = req.params.accountId;
     log.info(`>>> getAccountTransactions: User ID: ${userId}, Account ID: ${accountId}`);
     if (!mongoose.Types.ObjectId.isValid(accountId)) { log.warn(`>>> getAccountTransactions: Invalid account ID format: ${accountId}`); const error = new Error('Invalid account ID format'); error.statusCode = 400; return next(error); }
     try {
        log.info(`>>> getAccountTransactions: Finding account with ID: ${accountId}`);
        const account = await Account.findById(accountId).lean();
        if (!account) { log.warn(`>>> getAccountTransactions: Account not found with ID: ${accountId}`); const error = new Error('Account not found'); error.statusCode = 404; return next(error); }
        log.info(`>>> getAccountTransactions: Account found: ${account._id}, Owner: ${account.userId}`);
        if (account.userId.toString() !== userId.toString()) { log.warn(`>>> getAccountTransactions: Authorization failed. User ${userId} does not own account ${accountId}`); const error = new Error('Not authorized'); error.statusCode = 403; return next(error); }
        log.info(`>>> getAccountTransactions: Authorization successful for user ${userId} on account ${accountId}`);
        log.info(`>>> getAccountTransactions: Finding transactions for account ID: ${accountId}`);
        // Ensure field name matches Transaction model ('accountId')
        const transactions = await Transaction.find({ accountId: accountId })
            .sort({ timestamp: -1 })
            .lean();
        log.info(`>>> getAccountTransactions: Found ${transactions.length} transactions for account ${accountId}`);
        const responseTransactions = transactions.map(tx => ({ ...tx, amount: tx.amount ? tx.amount.toString() : '0.00', balanceAfter: tx.balanceAfter ? tx.balanceAfter.toString() : 'N/A' })); // Format balanceAfter too
        log.info(`>>> getAccountTransactions: Successfully retrieved transactions for account ${accountId}. Sending response.`);
        res.status(200).json({ success: true, count: responseTransactions.length, data: responseTransactions });
     } catch (error) {
        log.error(`>>> getAccountTransactions: Error for account ${accountId}: ${error.message}`, { stack: error.stack });
        next(error);
     }
};


// --- NEW: Delete Account Function ---
// @desc    Delete a bank account
// @route   DELETE /api/accounts/:accountId
// @access  Private
export const deleteAccount = async (req, res, next) => { // Exported individually
    const logPrefix = ">>> deleteAccount:";
    if (!req.user || !req.user._id) { console.error(`${logPrefix} ERROR - req.user missing!`); throw Object.assign(new Error('Not authenticated'), { statusCode: 401 }); }

    const userId = req.user._id;
    const { accountId } = req.params;
    console.log(`${logPrefix} User ${userId} attempting to delete account ${accountId}`);

    if (!mongoose.Types.ObjectId.isValid(accountId)) { console.warn(`${logPrefix} Invalid account ID format received: ${accountId}`); throw Object.assign(new Error('Invalid account ID format'), { statusCode: 400 }); }

    try {
        console.log(`${logPrefix} Finding account ${accountId} owned by user ${userId}...`);
        const account = await Account.findOne({ _id: accountId, userId: userId });

        if (!account) { console.warn(`${logPrefix} Account ${accountId} not found or not owned by user ${userId}.`); throw Object.assign(new Error('Account not found or access denied.'), { statusCode: 404 }); }
        console.log(`${logPrefix} Account found: ${account.accountNumber}, Balance: ${account.balance.toString()}`);

        // Check balance
        if (account.balance.toString() !== '0.00') { console.warn(`${logPrefix} Attempt to delete account ${accountId} with non-zero balance (${account.balance.toString()}).`); throw Object.assign(new Error('Account balance must be zero before deletion.'), { statusCode: 400 }); }
        console.log(`${logPrefix} Account balance is zero. Proceeding with deletion checks.`);

        // Delete associated transactions
        console.log(`${logPrefix} Deleting transactions associated with account ${accountId}...`);
        const deleteResult = await Transaction.deleteMany({ accountId: accountId });
        console.log(`${logPrefix} Deleted ${deleteResult.deletedCount} transactions.`);

        // Delete the account
        console.log(`${logPrefix} Deleting account document ${accountId}...`);
        await Account.findByIdAndDelete(accountId);
        console.log(`${logPrefix} Account ${accountId} deleted successfully.`);

        // Send success response
        res.status(200).json({ success: true, message: 'Account deleted successfully' });

    } catch (error) {
        console.error(`${logPrefix} Error deleting account ${accountId}:`, error);
        next(error);
    }
};



export const renameAccount = async (req, res, next) => {
    const logPrefix = ">>> renameAccount:";
    if (!req.user || !req.user._id) {
        console.error(`${logPrefix} ERROR - req.user missing!`);
        throw Object.assign(new Error('Not authenticated'), { statusCode: 401 });
    }

    const userId = req.user._id;
    const { accountId } = req.params;
    // Get nickname from request body, trim whitespace
    const { accountNickname } = req.body;
    const nicknameToSave = accountNickname ? accountNickname.trim() : null; // Store null/undefined if empty to remove nickname

    console.log(`${logPrefix} User ${userId} attempting to rename account ${accountId} to "${nicknameToSave || '(remove nickname)'}"`);

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
        console.warn(`${logPrefix} Invalid account ID format received: ${accountId}`);
        throw Object.assign(new Error('Invalid account ID format'), { statusCode: 400 });
    }

    // Optional: Add length validation here if not done in model
    if (nicknameToSave && nicknameToSave.length > 50) { // Example limit
         console.warn(`${logPrefix} Nickname too long for account ${accountId}.`);
         throw Object.assign(new Error('Nickname cannot exceed 50 characters.'), { statusCode: 400 });
    }

    try {
        console.log(`${logPrefix} Finding account ${accountId} owned by user ${userId}...`);
        const account = await Account.findOne({ _id: accountId, userId: userId });

        if (!account) {
            console.warn(`${logPrefix} Account ${accountId} not found or not owned by user ${userId}.`);
            throw Object.assign(new Error('Account not found or access denied.'), { statusCode: 404 });
        }
        console.log(`${logPrefix} Account found: ${account.accountNumber}. Current nickname: "${account.accountNickname || ''}"`);

        // Update the nickname
        account.accountNickname = nicknameToSave; // Assign trimmed value or null

        console.log(`${logPrefix} Saving updated account ${accountId}...`);
        const updatedAccount = await account.save();
        console.log(`${logPrefix} Account ${accountId} saved successfully with nickname: "${updatedAccount.accountNickname || ''}"`);

        // Format balance for response
        const responseAccount = {
             ...updatedAccount.toObject(),
             balance: updatedAccount.balance ? updatedAccount.balance.toString() : '0.00'
        };


        // Send success response with updated account data
        res.status(200).json({ success: true, data: responseAccount });

    } catch (error) {
        console.error(`${logPrefix} Error renaming account ${accountId}:`, error);
        next(error);
    }
};
