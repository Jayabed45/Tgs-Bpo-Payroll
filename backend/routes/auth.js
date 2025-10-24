const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { clientPromise } = require('../config/database');

const router = express.Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    // Find user by email
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return success response
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create admin route
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = {
      email,
      password: hashedPassword,
      name,
      role: 'admin',
      createdAt: new Date(),
      isActive: true
    };

    const result = await usersCollection.insertOne(adminUser);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: result.insertedId, 
        email: adminUser.email, 
        role: adminUser.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      token,
      user: {
        id: result.insertedId,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role
      }
    });

  } catch (error) {
    console.error('Admin creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Protected route example
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne(
      { _id: req.user.userId },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify admin token middleware
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Update user profile (email, password, name)
router.put('/update-profile', verifyAdminToken, async (req, res) => {
  try {
    const { email, currentPassword, newPassword, name } = req.body;
    const userId = req.user.userId;

    const db = global.db;
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }

    const usersCollection = db.collection('users');
    
    // Find the current user
    const user = await usersCollection.findOne({ _id: new (require('mongodb').ObjectId)(userId) });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const updateData = {};

    // Update name if provided
    if (name && name !== user.name) {
      updateData.name = name;
    }

    // Update email if provided and different
    if (email && email !== user.email) {
      // Check if new email already exists
      const existingUser = await usersCollection.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already in use by another account' 
        });
      }
      updateData.email = email;
    }

    // Update password if provided
    if (newPassword && currentPassword) {
      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Current password is incorrect' 
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }

    // If nothing to update
    if (Object.keys(updateData).length === 0) {
      return res.json({ 
        success: true, 
        message: 'No changes to update',
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      });
    }

    // Update user
    updateData.updatedAt = new Date();
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: updateData }
    );

    // Get updated user
    const updatedUser = await usersCollection.findOne({ _id: user._id });

    // Generate new token if email changed
    let newToken = null;
    if (updateData.email) {
      newToken = jwt.sign(
        { 
          userId: updatedUser._id, 
          email: updatedUser.email, 
          role: updatedUser.role 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name
      },
      token: newToken // Send new token if email changed
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

module.exports = { router, verifyAdminToken };