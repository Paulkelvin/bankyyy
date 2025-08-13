// server/controllers/transactionController.js
import mongoose from 'mongoose';
import otpGenerator from 'otp-generator';
import bcrypt from 'bcryptjs';

import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import User from '../models/User.js';
import { sendOtpEmail } from '../config/emailConfig.js';

// Constants
const OTP_EXPIRY_MINUTES = 10;

// Utility function to format transaction data
const formatTransaction = (txn) => {
    if (!txn) {
        console.error("formatTransaction received null/undefined input");
        return null;
    }
    // Use .toObject() if it's a Mongoose doc, otherwise assume it's a plain object (from .lean())
    const obj = typeof txn.toObject === 'function' ? txn.toObject() : { ...txn };

    // Return a new object with all original fields plus formatted decimals as STRINGS
    return {
        ...obj,
        amount: obj.amount?.toString(), // Convert Decimal128 to string
        balanceAfter: obj.balanceAfter?.toString() // Convert Decimal128 to string
    };
};

// Helper for Decimal128 Arithmetic (keep as is)
const calculateNewBalance = (currentBalanceDec, amountDec, type) => {
    // ... (your existing calculateNewBalance logic - no changes needed here)
    console.log(`--- Inside calculateNewBalance ---`);
    console.log(`Type Arg: ${type}`);
    console.log(`currentBalanceDec Arg: Type=${typeof currentBalanceDec}, Value=${currentBalanceDec}`);
    console.log(`amountDec Arg: Type=${typeof amountDec}, Value=${amountDec}`);

    // Robust check for valid Decimal128 input or string representation
    let currentBalanceStr = currentBalanceDec?.toString();
    let amountStr = amountDec?.toString();

    if (currentBalanceStr === undefined || currentBalanceStr === null) {
        console.error("CALC_BALANCE FATAL: currentBalanceDec is invalid!", currentBalanceDec);
        throw Object.assign(new Error("Internal error: Invalid current balance for calculation."), { statusCode: 500 });
    }
    if (amountStr === undefined || amountStr === null) {
        console.error("CALC_BALANCE FATAL: amountDec is invalid!", amountDec);
        throw Object.assign(new Error("Internal error: Invalid amount for calculation."), { statusCode: 500 });
    }

    const current = parseFloat(currentBalanceStr);
    const amount = parseFloat(amountStr);

    if (isNaN(current) || isNaN(amount)) {
         console.error("CALC_BALANCE FATAL: Failed to parse balance/amount to float.", { currentBalanceStr, amountStr });
         throw Object.assign(new Error("Internal error: Invalid number format during calculation."), { statusCode: 500 });
    }

    console.log(`Parsed numbers: current=${current}, amount=${amount}`);
    let newBalance;

    if (type === 'withdrawal' || type === 'transfer-out') {
        if (amount <= 0) throw Object.assign(new Error('Withdrawal/Transfer amount must be positive.'), { statusCode: 400 });
        if (amount > current) { throw Object.assign(new Error('Insufficient funds.'), { statusCode: 400 }); }
        newBalance = current - amount;
    } else if (type === 'deposit' || type === 'transfer-in') {
         if (amount <= 0) throw Object.assign(new Error('Deposit amount must be positive.'), { statusCode: 400 });
        newBalance = current + amount;
    } else {
        throw Object.assign(new Error('Invalid calculation type provided.'), { statusCode: 500 });
    }

    console.log(`Calculated JS newBalance: ${newBalance} (Type: ${typeof newBalance})`);
    const balanceString = newBalance.toFixed(2);
    console.log(`Balance string after toFixed(2): "${balanceString}"`);

    let resultDecimal;
    try {
        resultDecimal = mongoose.Types.Decimal128.fromString(balanceString);
        console.log(`Resulting Decimal128: ${resultDecimal}`);
    } catch (conversionError) {
        console.error("!!! ERROR converting calculated balance string to Decimal128:", conversionError);
        console.error(`Failed on input string: "${balanceString}"`);
        throw Object.assign(new Error("Internal error: Failed to format new balance."), { statusCode: 500, originalError: conversionError });
    }
    console.log(`--- Exiting calculateNewBalance ---`);
    return resultDecimal;
};


// Make a deposit or withdrawal (keep as is)
export const createTransaction = async (req, res, next) => {
    // ... (your existing createTransaction logic - no changes needed here)
    console.log(">>> createTransaction CONTROLLER START");
    if (!req.user || !req.user._id) { const error = new Error('Not authorized'); error.statusCode=401; return next(error); }
    const userId = req.user._id;
    const { accountId, type, amount, description, transactionDate, withdrawalMethod } = req.body;

    let amountDecimal;
    console.log(`CREATE_TRANSACTION: Received type: ${type}, amount: "${amount}", withdrawalMethod: ${withdrawalMethod}, Custom Date: ${transactionDate}`);

    try {
        amountDecimal = mongoose.Types.Decimal128.fromString(amount);
        if (parseFloat(amountDecimal.toString()) <= 0) {
            const error = new Error('Amount must be positive'); error.statusCode=400; return next(error);
        }
    } catch (e) {
        const error = new Error('Invalid amount format'); error.statusCode=400; return next(error);
    }

    try {
        const account = await Account.findOne({ _id: accountId, userId });
        if (!account) { throw Object.assign(new Error('Account not found or access denied.'), { statusCode: 404 }); }

        const newBalanceDecimal = calculateNewBalance(account.balance, amountDecimal, type);
        if (newBalanceDecimal === undefined || newBalanceDecimal === null) { throw Object.assign(new Error("Internal calculation error."), { statusCode: 500 }); }

        account.balance = newBalanceDecimal;
        await account.save();
        console.log(`Account ${accountId} balance updated to ${newBalanceDecimal.toString()}`);

        const transactionData = {
            accountId: account._id,
            userId,
            type,
            amount: amountDecimal,
            description: description || `${type.charAt(0).toUpperCase() + type.slice(1)}`,
            balanceAfter: newBalanceDecimal,
            ...(transactionDate && !isNaN(new Date(transactionDate)) && { transactionDate: new Date(transactionDate) }),
            ...(type === 'withdrawal' && withdrawalMethod && { withdrawalMethod: withdrawalMethod })
        };

        console.log("Creating transaction record with data:", transactionData);
        const createdTransaction = await Transaction.create(transactionData);
        console.log("Transaction record created:", createdTransaction._id);

        const formattedResponseData = formatTransaction(createdTransaction); // Use formatter

        console.log(">>> createTransaction CONTROLLER SUCCESS - Sending 201");
        res.status(201).json(formattedResponseData); // Send formatted data

    } catch (error) {
        console.error("Error during createTransaction processing:", error);
        next(error);
    }
};


// --- OTP Related Functions (keep as is) ---
export const initiateTransfer = async (req, res, next) => {
    const logPrefix = ">>> initiateTransfer:";
    console.log(`${logPrefix} CONTROLLER START`);
    if (!req.user || !req.user._id) { throw Object.assign(new Error('Not authorized'), { statusCode: 401 }); }

    const userId = req.user._id;
    const { transferType, fromAccountId, toAccountId, recipientAccountNumber, amount, description } = req.body;

    console.log(`${logPrefix} Initiating transfer type: ${transferType} from user ${userId}`);

    if (!transferType || !fromAccountId || !amount || (transferType === 'internal' && !toAccountId) || (transferType === 'external' && !recipientAccountNumber)) {
        throw Object.assign(new Error('Missing required transfer details.'), { statusCode: 400 });
    }

    let amountDecimal;
    try {
        amountDecimal = mongoose.Types.Decimal128.fromString(amount);
        if (parseFloat(amountDecimal.toString()) <= 0) { throw new Error('Amount must be positive'); }
    } catch (e) { throw Object.assign(new Error('Invalid amount format'), { statusCode: 400 }); }

    try {
        console.log(`${logPrefix} Finding 'from' account ${fromAccountId} and checking funds...`);
        const fromAccount = await Account.findOne({ _id: fromAccountId, userId: userId });
        if (!fromAccount) { throw Object.assign(new Error('Sending account not found or access denied.'), { statusCode: 404 }); }
        const currentBalance = parseFloat(fromAccount.balance.toString());
        const transferAmount = parseFloat(amountDecimal.toString());
        if (transferAmount > currentBalance) { throw Object.assign(new Error('Insufficient funds.'), { statusCode: 400 }); }
        console.log(`${logPrefix} Funds check passed.`);

        console.log(`${logPrefix} Validating recipient account...`);
        if (transferType === 'internal') {
            if (fromAccountId === toAccountId) { throw Object.assign(new Error('Cannot transfer to the same account.'), { statusCode: 400 }); }
            const toAccountExists = await Account.exists({ _id: toAccountId, userId: userId });
            if (!toAccountExists) { throw Object.assign(new Error('Internal recipient account not found or not owned by user.'), { statusCode: 404 }); }
        } else if (transferType === 'external') {
            const recipientAccountExists = await Account.exists({ accountNumber: recipientAccountNumber.trim() });
            if (!recipientAccountExists) { throw Object.assign(new Error('Recipient account number not found.'), { statusCode: 404 }); }
        } else {
            throw Object.assign(new Error('Invalid transfer type specified.'), { statusCode: 400 });
        }
        console.log(`${logPrefix} Recipient check passed.`);

        const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, lowerCaseAlphabets: false, specialChars: false, digits: true });
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
        const salt = await bcrypt.genSalt(10);
        const hashedOtp = await bcrypt.hash(otp, salt);
        console.log(`${logPrefix} Generated OTP: ${otp} (VALID FOR ${OTP_EXPIRY_MINUTES} MINS)`);

        await User.findByIdAndUpdate(userId, { otpCode: hashedOtp, otpCodeExpires: otpExpiry });
        console.log(`${logPrefix} OTP hash and expiry saved for user ${userId}.`);

        console.log(`${logPrefix} CONTROLLER SUCCESS - Sending 200`);
        res.status(200).json({
            success: true,
            message: 'OTP generated successfully',
            otp: otp // Send the OTP directly to the frontend
        });

    } catch (error) {
        console.error(`${logPrefix} Error:`, error);
        next(error);
    }
};

export const executeTransfer = async (req, res, next) => {
    // ... (your existing executeTransfer logic - make sure it uses formatTransaction for the response)
    const logPrefix = ">>> executeTransfer:";
    console.log(`${logPrefix} CONTROLLER START`);
    if (!req.user || !req.user._id) { throw Object.assign(new Error('Not authorized'), { statusCode: 401 }); }

    const userId = req.user._id;
    const { transferType, fromAccountId, toAccountId, recipientAccountNumber, amount, description, otp } = req.body;

    console.log(`${logPrefix} Executing transfer type: ${transferType} from user ${userId} with OTP`);

    if (!transferType || !fromAccountId || !amount || !otp || (transferType === 'internal' && !toAccountId) || (transferType === 'external' && !recipientAccountNumber)) {
        throw Object.assign(new Error('Missing required transfer or OTP details.'), { statusCode: 400 });
    }

    let amountDecimal;
    try { amountDecimal = mongoose.Types.Decimal128.fromString(amount); if (parseFloat(amountDecimal.toString()) <= 0) { throw new Error(); } }
    catch (e) { throw Object.assign(new Error('Invalid amount format'), { statusCode: 400 }); }

    try {
        console.log(`${logPrefix} Finding user ${userId} and selecting OTP fields...`);
        const user = await User.findById(userId).select('+phoneNumber +otpCode +otpCodeExpires')
        if (!user) { throw Object.assign(new Error('User not found.'), { statusCode: 404 }); }

        console.log(`${logPrefix} Verifying OTP... Stored expiry: ${user.otpCodeExpires}`);
        if (!user.otpCode || !user.otpCodeExpires) { throw Object.assign(new Error('No OTP found or previously initiated for this user.'), { statusCode: 400 }); }
        if (Date.now() > user.otpCodeExpires) {
            await User.findByIdAndUpdate(userId, { $unset: { otpCode: "", otpCodeExpires: "" } })
            throw Object.assign(new Error('OTP has expired. Please initiate transfer again.'), { statusCode: 400 });
         }

        const isOtpMatch = await bcrypt.compare(otp, user.otpCode);
        if (!isOtpMatch) { throw Object.assign(new Error('Invalid OTP provided.'), { statusCode: 400 }); }
        console.log(`${logPrefix} OTP verified successfully.`);

        console.log(`${logPrefix} Clearing OTP fields for user ${userId}...`);
        await User.findByIdAndUpdate(userId, { $unset: { otpCode: "", otpCodeExpires: "" } })
        console.log(`${logPrefix} OTP fields cleared.`);

        let fromAccount, toAccount, recipientAccount;
        let createdOutTxn, createdInTxn;
        const commonDesc = description || `Transfer`;

        console.log(`${logPrefix} Finding 'from' account ${fromAccountId}...`);
        fromAccount = await Account.findOne({ _id: fromAccountId, userId: userId })
        if (!fromAccount) { throw Object.assign(new Error('Sending account not found or access denied.'), { statusCode: 404 }); }

        const newFromBalance = calculateNewBalance(fromAccount.balance, amountDecimal, 'transfer-out');

        if (transferType === 'internal') {
            if (fromAccountId === toAccountId) { throw Object.assign(new Error('Cannot transfer to the same account.'), { statusCode: 400 }); }
            console.log(`${logPrefix} Finding internal 'to' account ${toAccountId}...`);
            toAccount = await Account.findOne({ _id: toAccountId, userId: userId })
            if (!toAccount) { throw Object.assign(new Error('Internal recipient account not found or not owned by user.'), { statusCode: 404 }); }
            const newToBalance = calculateNewBalance(toAccount.balance, amountDecimal, 'transfer-in');

            fromAccount.balance = newFromBalance;
            toAccount.balance = newToBalance;
            console.log(`${logPrefix} Saving internal account balances...`);
            await Promise.all([ fromAccount.save(), toAccount.save() ]);
            console.log(`${logPrefix} Internal balances saved.`);

            console.log(`${logPrefix} Creating internal transaction records...`);
            [createdOutTxn, createdInTxn] = await Promise.all([
                Transaction.create([{ accountId: fromAccount._id, userId: userId, type: 'transfer-out', amount: amountDecimal, description: `${commonDesc} to Acc ${toAccount.accountNumber}`, balanceAfter: fromAccount.balance, relatedAccountId: toAccount.accountNumber }]),
                Transaction.create([{ accountId: toAccount._id, userId: userId, type: 'transfer-in', amount: amountDecimal, description: `${commonDesc} from Acc ${fromAccount.accountNumber}`, balanceAfter: toAccount.balance, relatedAccountId: fromAccount.accountNumber }])
            ]);
            createdOutTxn = createdOutTxn[0];
            createdInTxn = createdInTxn[0];

        } else if (transferType === 'external') {
            console.log(`${logPrefix} Finding external recipient account ${recipientAccountNumber}...`);
            recipientAccount = await Account.findOne({ accountNumber: recipientAccountNumber.trim() })
            if (!recipientAccount) { throw Object.assign(new Error('Recipient account number not found.'), { statusCode: 404 }); }
            if (fromAccount._id.equals(recipientAccount._id)) { throw Object.assign(new Error('Cannot perform external transfer to your own account number.'), { statusCode: 400 }); }
            const newToBalance = calculateNewBalance(recipientAccount.balance, amountDecimal, 'transfer-in');

            fromAccount.balance = newFromBalance;
            recipientAccount.balance = newToBalance;
            console.log(`${logPrefix} Saving external account balances...`);
            await Promise.all([ fromAccount.save(), recipientAccount.save() ]);
            console.log(`${logPrefix} External balances saved.`);

             console.log(`${logPrefix} Creating external transaction records...`);
             [createdOutTxn, createdInTxn] = await Promise.all([
                 Transaction.create([{ accountId: fromAccount._id, userId: userId, type: 'transfer-out', amount: amountDecimal, description: `${commonDesc} to Acc ${recipientAccount.accountNumber}`, balanceAfter: fromAccount.balance, relatedAccountId: recipientAccount.accountNumber }]),
                 Transaction.create([{ accountId: recipientAccount._id, userId: recipientAccount.userId, type: 'transfer-in', amount: amountDecimal, description: `${commonDesc} from Acc ${fromAccount.accountNumber}`, balanceAfter: recipientAccount.balance, relatedAccountId: fromAccount.accountNumber }])
             ]);
            createdOutTxn = createdOutTxn[0];
            createdInTxn = createdInTxn[0];

        } else {
            throw Object.assign(new Error('Invalid transfer type during execution.'), { statusCode: 400 });
        }

        console.log(`${logPrefix} Transfer executed successfully.`);
        res.status(201).json({
            success: true,
            message: 'Transfer completed successfully!',
            transferOut: formatTransaction(createdOutTxn), // Use formatter here too
        });

    } catch (error) {
        console.error(`${logPrefix} Error:`, error);
        next(error);
    } finally {
         console.log(`${logPrefix} CONTROLLER END`);
    }
};


// --- Existing Direct Transfer Functions (keep as is) ---
export const transferBetweenAccounts = async (req, res, next) => {
     console.warn(">>> WARNING: Direct transferBetweenAccounts called (bypassing OTP). Consider removing this endpoint.");
     const error = new Error('This transfer method is deprecated. Please use the OTP flow.'); error.statusCode = 400; return next(error);
};
export const transferToExternalAccount = async (req, res, next) => {
    console.warn(">>> WARNING: Direct transferToExternalAccount called (bypassing OTP). Consider removing this endpoint.");
    const error = new Error('This transfer method is deprecated. Please use the OTP flow.'); error.statusCode = 400; return next(error);
};
// --- End Deprecated Transfer Functions ---


// --- Read Functions ---
// Get user's transactions
export const getUserTransactions = async (req, res, next) => {
    console.log(">>> getUserTransactions CONTROLLER START");
    if (!req.user || !req.user._id) { const error = new Error('Not authorized'); error.statusCode=401; return next(error); }
    const userId = req.user._id;
    try {
        console.log("Finding transactions for user:", userId);
        // Use .lean() for performance, but we will format afterwards
        const transactions = await Transaction.find({ userId: userId }).sort({ createdAt: -1 }).lean();
        console.log("Found raw transactions:", transactions?.length);

        // --- FIX: Apply formatting ---
        console.log("Formatting transactions...");
        // Map through transactions and apply formatTransaction
        // Filter out any potential nulls if formatTransaction failed
        const formatted = transactions.map(formatTransaction).filter(tx => tx !== null); // <-- THIS LINE IS NOW ACTIVE
        console.log("Formatted transactions, sending response...");
        res.status(200).json(formatted); // <-- SEND FORMATTED DATA
        // --- End FIX ---

        /* --- REMOVE TEMPORARY DEBUG CODE ---
         console.log("Sending raw transactions response (for debugging)...");
         res.status(200).json(transactions); // Send raw data directly
        */

    } catch (error) {
        console.error("Error in getUserTransactions:", error);
        next(error);
    }
};

// Get transactions for specific account
export const getTransactionsForAccount = async (req, res, next) => {
    const logPrefix = ">>> getTransactionsForAccount:";
    console.log(`${logPrefix} CONTROLLER START`);
    if (!req.user || !req.user._id) { const error = new Error('Not authorized'); error.statusCode=401; return next(error); }
    const userId = req.user._id;
    const { accountId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(accountId)) { const error = new Error('Invalid account ID format'); error.statusCode=400; return next(error); }

    try {
        // Find the specific account first if needed for filtering logic
        const account = await Account.findOne({ _id: accountId, userId: userId }).select('_id accountNumber').lean();
        if (!account) { throw Object.assign(new Error('Account not found or access denied.'), { statusCode: 404 }); }

        console.log(`${logPrefix} Finding transactions for account ${accountId} (User: ${userId})...`);
        // Fetch transactions related to this account ID using .lean()
        const transactions = await Transaction.find({
            // Adjust $or based on how you link incoming transfers
            $or: [
                { accountId: accountId },
                // Example: { relatedAccountId: account.accountNumber, type: 'transfer-in' }
            ]
        }).sort({ createdAt: -1 }).lean();

        console.log(`${logPrefix} Found raw transactions: ${transactions?.length}`);

        if (!Array.isArray(transactions)) {
             console.error(`${logPrefix} Expected an array of transactions, but got:`, typeof transactions);
             throw new Error('Internal server error retrieving transaction data.');
        }

        // --- FIX: Apply formatting ---
        console.log(`${logPrefix} Formatting transactions...`);
        const formatted = transactions.map(formatTransaction).filter(tx => tx !== null); // <-- THIS LINE IS NOW ACTIVE
        console.log(`${logPrefix} Sending formatted transactions for account ${accountId}...`);
        res.status(200).json(formatted); // <-- SEND FORMATTED DATA
        // --- End FIX ---

        /* --- REMOVE TEMPORARY DEBUG CODE ---
         console.log(`${logPrefix} Sending raw transactions for account ${accountId}...`);
         res.status(200).json(transactions);
        */
     } catch (error) {
        console.error(`${logPrefix} CAUGHT ERROR:`, error);
        next(error);
     }
};

// Delete all transactions for the authenticated user
export const deleteAllUserTransactions = async (req, res, next) => {
    if (!req.user || !req.user._id) {
        const error = new Error('Not authorized');
        error.statusCode = 401;
        return next(error);
    }
    const userId = req.user._id;
    try {
        const result = await Transaction.deleteMany({ userId });
        res.status(200).json({ success: true, message: 'All transactions deleted successfully', deletedCount: result.deletedCount });
    } catch (error) {
        next(error);
    }
};

// Delete a specific transaction by ID (and adjust account balance)
export const deleteTransaction = async (req, res, next) => {
    const logPrefix = '>>> deleteTransaction:';
    try {
        if (!req.user || !req.user._id) { const error = new Error('Not authorized'); error.statusCode = 401; return next(error); }
        const userId = req.user._id;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const error = new Error('Invalid transaction ID'); error.statusCode = 400; return next(error);
        }

        // Find transaction and ensure it belongs to the user
        const txn = await Transaction.findOne({ _id: id, userId });
        if (!txn) { const error = new Error('Transaction not found'); error.statusCode = 404; return next(error); }

        // Find account
        const account = await Account.findOne({ _id: txn.accountId, userId });
        if (!account) { const error = new Error('Associated account not found or access denied'); error.statusCode = 404; return next(error); }

        // Determine reverse effect on balance
        const amount = parseFloat(txn.amount.toString());
        const type = txn.type;
        let current = parseFloat(account.balance.toString());

        if (['deposit', 'transfer-in', 'interest', 'refund'].includes(type)) {
            current -= amount; // reverse a credit
        } else if (['withdrawal', 'transfer-out', 'fee'].includes(type)) {
            current += amount; // reverse a debit
        } else {
            const error = new Error('Unsupported transaction type for deletion'); error.statusCode = 400; return next(error);
        }

        if (current < 0) { current = 0; }
        account.balance = mongoose.Types.Decimal128.fromString(current.toFixed(2));

        // Apply updates atomically where possible
        await Promise.all([
            account.save(),
            Transaction.deleteOne({ _id: txn._id })
        ]);

        return res.status(200).json({ success: true, message: 'Transaction deleted', newBalance: account.balance.toString(), deletedId: txn._id });
    } catch (error) {
        console.error(logPrefix, error);
        next(error);
    }
};

// Populate random transactions for a user within a date range (no account.balance changes)
export const populateTransactionsRange = async (req, res, next) => {
    const logPrefix = '>>> populateTransactionsRange:';
    try {
        if (!req.user || !req.user._id) { const error = new Error('Not authorized'); error.statusCode = 401; return next(error); }
        const userId = req.user._id;
        const { accountNumber, startDate, endDate, minPerMonth = 7, maxPerMonth = 13 } = req.body || {};

        if (!accountNumber || !startDate || !endDate) {
            const error = new Error('accountNumber, startDate and endDate are required'); error.statusCode = 400; return next(error);
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start) || isNaN(end) || start > end) {
            const error = new Error('Invalid date range'); error.statusCode = 400; return next(error);
        }
        if (minPerMonth > maxPerMonth || minPerMonth < 1) {
            const error = new Error('Invalid monthly range'); error.statusCode = 400; return next(error);
        }

        // Find the user's account by number
        const account = await Account.findOne({ userId, accountNumber: accountNumber.toString().trim() });
        if (!account) { const error = new Error('Account not found for current user'); error.statusCode = 404; return next(error); }

        // Description pool
        const descriptions = [
            'Salary', 'Groceries', 'Online Shopping', 'ATM Withdrawal', 'Bill Payment', 'Interest', 'Dining', 'Utilities',
            'Subscription', 'Bonus', 'Gift', 'Medical', 'Travel', 'Cashback', 'Fee', 'Gym Membership', 'Fuel', 'Ride Share', 'Streaming', 'Pharmacy'
        ];
        const pickDesc = (type) => type === 'deposit' ? ['Salary','Bonus','Refund','Interest','Gift','Cashback'][Math.floor(Math.random()*6)] : descriptions[Math.floor(Math.random()*descriptions.length)];
        const randTime = () => {
            const h = Math.floor(Math.random()*24).toString().padStart(2,'0');
            const m = Math.floor(Math.random()*60).toString().padStart(2,'0');
            return `${h}:${m}`;
        };
        const randAmt = (type) => {
            const v = type==='deposit' ? (Math.random()*5000+500) : (Math.random()*1500+50);
            return parseFloat(v.toFixed(2));
        };

        // Iterate month by month
        let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
        const endCursor = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

        // We'll start from a synthetic running balance baseline that does not affect account.balance
        let running = parseFloat(account.balance.toString());

        const toCreate = [];
        while (cursor <= endCursor) {
            const year = cursor.getUTCFullYear();
            const month = cursor.getUTCMonth();
            const isStartMonth = (year === start.getUTCFullYear() && month === start.getUTCMonth());
            const isEndMonth = (year === end.getUTCFullYear() && month === end.getUTCMonth());

            const firstDay = isStartMonth ? start.getUTCDate() : 1;
            const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
            const lastDay = isEndMonth ? end.getUTCDate() : lastDayOfMonth;

            const count = Math.floor(Math.random() * (maxPerMonth - minPerMonth + 1)) + minPerMonth;

            for (let i = 0; i < count; i++) {
                // Random day within the allowed range
                const day = Math.floor(Math.random() * (lastDay - firstDay + 1)) + firstDay;
                const type = Math.random() < 0.45 ? 'deposit' : 'withdrawal';
                let amt = randAmt(type);
                // Avoid negative running balance
                if (type === 'withdrawal' && running - amt < 0) {
                    if (running <= 0) {
                        // force deposit instead
                        amt = randAmt('deposit');
                    } else {
                        amt = Math.max(5, running * Math.random());
                    }
                }

                const desc = pickDesc(type);
                const dateStr = `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`;
                const timeStr = randTime();
                const txDate = new Date(`${dateStr}T${timeStr}:00Z`);
                if (txDate < start || txDate > end) continue;

                // Update synthetic running
                running = type === 'deposit' ? (running + amt) : (running - amt);

                toCreate.push({
                    accountId: account._id,
                    userId,
                    type,
                    amount: mongoose.Types.Decimal128.fromString(amt.toFixed(2)),
                    description: desc,
                    balanceAfter: mongoose.Types.Decimal128.fromString(running.toFixed(2)),
                    transactionDate: txDate,
                    // Ensure ordering: set createdAt/updatedAt to txDate
                    createdAt: txDate,
                    updatedAt: txDate,
                    ...(type === 'withdrawal' ? { withdrawalMethod: desc } : {})
                });
            }

            // Move to next month
            cursor = new Date(Date.UTC(year, month + 1, 1));
        }

        if (toCreate.length === 0) {
            return res.status(200).json({ success: true, message: 'No transactions to create in given range', created: 0 });
        }

        // Create all documents in one go; timestamps preserved because we pass createdAt
        const created = await Transaction.insertMany(toCreate, { ordered: false });
        return res.status(201).json({ success: true, message: 'Transactions populated', created: created.length });
    } catch (error) {
        console.error(logPrefix, error);
        next(error);
    }
};

// No default export needed if using named exports consistently
