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

// Instance method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
    // Ensure 'this' context has the password field selected
    if (!this.password) {
         console.warn(`matchPassword called on user ${this._id} without password field selected!`);
         // Optionally re-fetch the user with password if needed, or handle error
         // For now, return false as we cannot compare
         return false;
    }
    return await bcrypt.compare(enteredPassword, this.password);
};

// Optional: Pre-save hook for hashing NEW/MODIFIED passwords
// If you handle hashing manually during registration/password change, keep this commented
UserSchema.pre('save', async function(next) {
   if (!this.isModified('password')) {
       return next();
   }
   console.log(`Hashing password for user ${this._id || this.email}...`);
   const salt = await bcrypt.genSalt(10);
   this.password = await bcrypt.hash(this.password, salt);
   console.log(`Password hashed for user ${this._id || this.email}.`);
   next();
});


const User = mongoose.model('User', UserSchema);

export default User;