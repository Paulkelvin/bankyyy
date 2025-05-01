import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

router.get('/check-users', async (req, res) => {
  try {
    const users = await User.find();
    res.json({
      message: 'Users fetched successfully',
      users,
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

router.get('/check-db-status', (req, res) => {
  const connectionState = mongoose.connection.readyState;
  const statusMessages = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  res.json({
    message: 'Database connection status',
    status: statusMessages[connectionState] || 'Unknown',
  });
});

export default router;
