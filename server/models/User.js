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
        console.log(`\n>>> PASSWORD HASHING START <<<`);
        console.log(`>>> User: ${this._id || this.email}`);
        
        if (!this.isModified('password')) {
            console.log(`>>> Password not modified, skipping hash`);
            console.log(`>>> PASSWORD HASHING END - SKIPPED <<<\n`);
            return next();
        }
        
        console.log(`>>> Password modified, generating salt...`);
        const salt = await bcrypt.genSalt(10);
        console.log(`>>> Salt generated, hashing password...`);
        
        this.password = await bcrypt.hash(this.password, salt);
        console.log(`>>> Password hashed successfully`);
        console.log(`>>> Hashed password length: ${this.password.length}`);
        console.log(`>>> PASSWORD HASHING END - SUCCESS <<<\n`);
        
        next();
    } catch (error) {
        console.error(`>>> Error hashing password:`, error);
        console.log(`>>> PASSWORD HASHING END - ERROR <<<\n`);
        next(error);
    }
});

// Instance method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
    try {
        console.log(`\n>>> PASSWORD COMPARISON START <<<`);
        console.log(`>>> User ID: ${this._id}`);
        console.log(`>>> Entered password length: ${enteredPassword.length}`);
        
        // Ensure 'this' context has the password field selected
        if (!this.password) {
            console.warn(`>>> Password field not selected for user ${this._id}`);
            console.log(`>>> Attempting to re-fetch user with password...`);
            
            // Try to re-fetch the user with password
            const userWithPassword = await this.constructor.findById(this._id).select('+password');
            
            if (!userWithPassword || !userWithPassword.password) {
                console.error(`>>> Could not retrieve password for user ${this._id}`);
                console.log(`>>> PASSWORD COMPARISON END - FAILED <<<\n`);
                return false;
            }
            
            console.log(`>>> Successfully retrieved password for user ${this._id}`);
            console.log(`>>> Stored password length: ${userWithPassword.password.length}`);
            
            const isMatch = await bcrypt.compare(enteredPassword, userWithPassword.password);
            console.log(`>>> Password comparison result: ${isMatch}`);
            console.log(`>>> PASSWORD COMPARISON END - ${isMatch ? 'SUCCESS' : 'FAILED'} <<<\n`);
            return isMatch;
        }
        
        console.log(`>>> Stored password length: ${this.password.length}`);
        console.log(`>>> Comparing passwords...`);
        
        const isMatch = await bcrypt.compare(enteredPassword, this.password);
        console.log(`>>> Password comparison result: ${isMatch}`);
        console.log(`>>> PASSWORD COMPARISON END - ${isMatch ? 'SUCCESS' : 'FAILED'} <<<\n`);
        return isMatch;
    } catch (error) {
        console.error(`>>> Error in matchPassword for user ${this._id}:`, error);
        console.log(`>>> PASSWORD COMPARISON END - ERROR <<<\n`);
        return false;
    }
};

const User = mongoose.model('User', UserSchema);

export default User;