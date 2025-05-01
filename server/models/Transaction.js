// server/models/Transaction.js
import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: ['deposit', 'withdrawal', 'transfer-out', 'transfer-in', 'fee', 'interest']
    },
    withdrawalMethod: {
        type: String,
        required: false,
        trim: true,
    },
    amount: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    relatedAccountId: { // Store related account NUMBER or ID for transfers
        type: String, // Keep as String if storing account number, ObjectId if storing _id
        required: false
    },
    balanceAfter: {
        type: mongoose.Schema.Types.Decimal128,
        required: true
    },
    transactionDate: { // User-specified date/time (optional override)
        type: Date,
        required: false
    },
    // --- REMOVED manual timestamp field ---
    // timestamp: {
    //  type: Date,
    //  default: Date.now
    // }
    // ------------------------------------
}, {
    // --- ENABLE standard Mongoose timestamps ---
    timestamps: true // This automatically adds createdAt and updatedAt fields
    // -----------------------------------------
});

// Indexes
// Use createdAt provided by timestamps: true for sorting
TransactionSchema.index({ accountId: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', TransactionSchema);

export default Transaction;