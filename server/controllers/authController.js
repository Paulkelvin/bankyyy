// @desc    Verify admin password for registration
// @route   POST /api/auth/verify-admin
// @access  Public
export const verifyAdmin = async (req, res, next) => {
    const logPrefix = ">>> verifyAdmin:";
    console.log(`${logPrefix} Attempting admin verification...`);

    try {
        const { adminPassword } = req.body;
        
        if (!adminPassword) {
            console.warn(`${logPrefix} No admin password provided`);
            return res.status(400).json({ 
                success: false, 
                message: 'Admin password is required' 
            });
        }

        // Get admin password from environment variable
        const correctPassword = process.env.ADMIN_PASSWORD || 'qwerty';
        
        if (adminPassword !== correctPassword) {
            console.warn(`${logPrefix} Invalid admin password attempt`);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid admin password' 
            });
        }

        console.log(`${logPrefix} Admin verification successful`);
        res.status(200).json({ 
            success: true, 
            message: 'Admin verification successful' 
        });

    } catch (error) {
        console.error(`${logPrefix} Error during admin verification:`, error);
        next(error);
    }
};
