// server/models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email'
        ],
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false // Keep password hidden by default
    },
    phoneNumber: {
        type: String,
        required: false,
        unique: true,
        sparse: true // Allow null/undefined for multiple users
    },
    address: {
        type: String,
        required: false,
        trim: true
    },
    // --- NEW OTP FIELDS ---
    otpCode: {
        type: String,
        required: false,
        select: false // Hide OTP hash by default
    },
    otpCodeExpires: {
        type: Date,
        required: false,
        select: false // Hide expiry by default
    }
    // --- END NEW OTP FIELDS ---
}, {
    timestamps: true // Keep timestamps
});

// Pre-save hook for hashing passwords
UserSchema.pre('save', async function(next) {
    try {
        if (!this.isModified('password')) {
            console.log(`>>> Password not modified for user ${this._id || this.email}, skipping hash`);
            return next();
        }
        console.log(`>>> Hashing password for user ${this._id || this.email}...`);
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log(`>>> Password hashed successfully for user ${this._id || this.email}`);
        next();
    } catch (error) {
        console.error(`>>> Error hashing password for user ${this._id || this.email}:`, error);
        next(error);
    }
});

// Instance method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
    try {
        console.log(`>>> matchPassword called for user ${this._id}`);
        // Ensure 'this' context has the password field selected
        if (!this.password) {
            console.warn(`>>> matchPassword: Password field not selected for user ${this._id}`);
            // Try to re-fetch the user with password
            const userWithPassword = await this.constructor.findById(this._id).select('+password');
            if (!userWithPassword || !userWithPassword.password) {
                console.error(`>>> matchPassword: Could not retrieve password for user ${this._id}`);
                return false;
            }
            console.log(`>>> matchPassword: Successfully retrieved password for user ${this._id}`);
            return await bcrypt.compare(enteredPassword, userWithPassword.password);
        }
        console.log(`>>> matchPassword: Comparing passwords for user ${this._id}`);
        const isMatch = await bcrypt.compare(enteredPassword, this.password);
        console.log(`>>> matchPassword: Password comparison result: ${isMatch}`);
        return isMatch;
    } catch (error) {
        console.error(`>>> Error in matchPassword for user ${this._id}:`, error);
        return false;
    }
};

const User = mongoose.model('User', UserSchema);

export default User;