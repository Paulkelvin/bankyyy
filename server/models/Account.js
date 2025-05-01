// server/models/Account.js
import mongoose from 'mongoose';

// Helper Function to Generate Account Number (keep as is)
function generateAccountNumber() {
    let num = Math.floor(Math.random() * 10000000000);
    let numStr = num.toString().padStart(10, '0');
    console.log(`Generated Account Number: ${numStr}`);
    return numStr;
}

const AccountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    accountNumber: {
        type: String,
        required: true,
        unique: true,
        default: generateAccountNumber
    },
    accountType: {
        type: String,
        required: true,
        enum: ['checking', 'savings'],
        default: 'checking'
    },
    balance: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        default: mongoose.Types.Decimal128.fromString('0.00')
    },
    // --- NEW FIELD ---
    accountNickname: {
        type: String,
        trim: true,
        required: false // Optional field
        // You could add a maxLength validator if desired:
        // maxLength: [50, 'Nickname cannot exceed 50 characters']
    }
    // --- END NEW FIELD ---
}, {
    timestamps: true // Keep timestamps
});

// Indexes (remain the same)
AccountSchema.index({ userId: 1 });

const Account = mongoose.model('Account', AccountSchema);

export default Account;