// server/controllers/userController.js
import mongoose from 'mongoose';
import User from '../models/User.js';
// import logger from '../config/logger.js'; // Use console if logger not set up

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
    const logPrefix = ">>> getUserProfile:"; // Log prefix
    console.log(`${logPrefix} CONTROLLER START <<<`);

    if (!req.user || !req.user._id) {
        console.error(`${logPrefix} ERROR - req.user or req.user._id is missing!`);
        throw Object.assign(new Error('Not authorized, user data missing.'), { statusCode: 401 });
    }
    const userId = req.user._id;
    console.log(`${logPrefix} User ID from req.user: ${userId}`);

    try {
        console.log(`${logPrefix} Preparing to query: User.findById("${userId}").lean()`);
        const freshUser = await User.findById(userId).lean(); // Refetch user data
        console.log(`${logPrefix} Database query FINISHED. User found: ${freshUser ? 'Yes' : 'No'}`);

        if (!freshUser) {
            console.warn(`${logPrefix} User with ID ${userId} not found in database during profile fetch.`);
            throw Object.assign(new Error('User not found'), { statusCode: 404 });
        }

        console.log(`${logPrefix} Constructing user profile response data...`);
        const userProfile = {
            _id: freshUser._id,
            name: freshUser.name,
            email: freshUser.email,
            phoneNumber: freshUser.phoneNumber || '',
            address: freshUser.address || '',
            createdAt: freshUser.createdAt,
            updatedAt: freshUser.updatedAt
        };
        console.log(`${logPrefix} Profile data constructed. Sending 200 response...`);

        res.status(200).json({ success: true, data: userProfile });
        console.log(`${logPrefix} Response successfully sent.`);

    } catch (error) {
        console.error(`${logPrefix} CAUGHT ERROR during DB query or processing:`, error);
        next(error); // Pass error to central handler
    }
     // console.log(`${logPrefix} CONTROLLER END <<<`);
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
    const logPrefix = ">>> updateUserProfile:";
    console.log(`${logPrefix} CONTROLLER START <<<`);
    if (!req.user || !req.user._id) { const error = new Error('Not authorized'); error.statusCode = 401; return next(error); }

    const { name, phoneNumber, address } = req.body;
    console.log(`${logPrefix} Received update data:`, { name, phoneNumber, address });

    try {
        const user = await User.findById(req.user._id);
        if (!user) { throw Object.assign(new Error('User not found.'), { statusCode: 404 }); }

        let updated = false;
        if (name !== undefined && name.trim() !== user.name) { user.name = name.trim(); updated = true; console.log(`${logPrefix} Name change detected.`);}
        if (phoneNumber !== undefined && phoneNumber.trim() !== (user.phoneNumber || '')) { user.phoneNumber = phoneNumber.trim(); updated = true; console.log(`${logPrefix} Phone change detected.`);}
        if (address !== undefined && address.trim() !== (user.address || '')) { user.address = address.trim(); updated = true; console.log(`${logPrefix} Address change detected.`);}

        if (!updated) {
             console.log(`${logPrefix} No actual changes detected.`);
        } else {
            console.log(`${logPrefix} User object BEFORE save:`, JSON.stringify(user.toObject()));
            console.log(`${logPrefix} Attempting to save updated user document...`);
            await user.save();
            console.log(`${logPrefix} User document potentially saved.`);
        }

        console.log(`${logPrefix} Refetching user data after save attempt...`);
        const updatedUser = await User.findById(user._id).lean();
        if (!updatedUser) { throw new Error("Failed to refetch user after update."); }
        console.log(`${logPrefix} User data refetched.`);

        const updatedProfile = { _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email, phoneNumber: updatedUser.phoneNumber || '', address: updatedUser.address || '', createdAt: updatedUser.createdAt, updatedAt: updatedUser.updatedAt };

        console.log(`${logPrefix} Sending response data:`, JSON.stringify(updatedProfile));
        res.status(200).json({ success: true, message: updated ? "Profile updated successfully!" : "No changes detected.", data: updatedProfile });

    } catch (error) {
        console.error(`${logPrefix} Error updating user profile:`, error);
        if (error.code === 11000 && error.keyValue?.phoneNumber) { error = Object.assign(new Error('Phone number is already in use.'), { statusCode: 409 }); }
        next(error);
    }
     // console.log(`${logPrefix} CONTROLLER END <<<`);
};

// --- REMOVED REDUNDANT EXPORT BLOCK ---
// export { getUserProfile, updateUserProfile }; // DELETE THIS LINE