const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { clientPromise } = require('../config/database');
const { logActivity } = require('../services/auditLogger');

const router = express.Router();

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // In development/test, allow more requests to prevent blocking valid tests
  max: process.env.NODE_ENV === 'development' ? 100 : 5, 
  message: { error: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Test endpoint to check auth
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working' });
});

// Login route
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      logActivity(req, {
        actionType: 'login',
        module: 'auth',
        entity: 'user',
        status: 'failure',
        errorDetails: 'Email and password are required',
        metadata: { email: email || null },
      });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    // Find user by email
    const user = await usersCollection.findOne({ email });

    if (!user) {
      logActivity(req, {
        actionType: 'login',
        module: 'auth',
        entity: 'user',
        status: 'failure',
        username: email,
        errorDetails: 'Invalid credentials',
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logActivity(req, {
        actionType: 'login',
        module: 'auth',
        entity: 'user',
        status: 'failure',
        userId: user._id?.toString?.(),
        username: user.email,
        errorDetails: 'Invalid credentials',
      });
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
    logActivity(req, {
      actionType: 'login',
      module: 'auth',
      entity: 'user',
      status: 'success',
      user: {
        userId: user._id?.toString?.(),
        email: user.email,
        role: user.role,
        name: user.name,
      },
      recordId: user._id?.toString?.(),
      metadata: {
        email: user.email,
      },
    });

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
    logActivity(req, {
      actionType: 'login',
      module: 'auth',
      entity: 'user',
      status: 'failure',
      errorDetails: error.message,
      errorStack: error.stack,
      metadata: { email: req.body?.email || null },
    });
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

    logActivity(req, {
      actionType: 'create',
      module: 'auth',
      entity: 'user',
      status: 'success',
      recordId: result.insertedId.toString(),
      username: adminUser.email,
      newValues: {
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
      },
      metadata: { operation: 'create-admin' },
    });

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
    logActivity(req, {
      actionType: 'create',
      module: 'auth',
      entity: 'user',
      status: 'failure',
      errorDetails: error.message,
      errorStack: error.stack,
      metadata: { operation: 'create-admin' },
    });
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

    logActivity(req, {
      actionType: 'update',
      module: 'settings',
      entity: 'profile',
      status: 'success',
      recordId: user._id.toString(),
      user: req.user,
      oldValues: {
        email: user.email,
        name: user.name,
      },
      newValues: {
        email: updatedUser.email,
        name: updatedUser.name,
      },
      metadata: {
        passwordChanged: Boolean(updateData.password),
        emailChanged: Boolean(updateData.email),
      },
    });

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
    logActivity(req, {
      actionType: 'update',
      module: 'settings',
      entity: 'profile',
      status: 'failure',
      user: req.user,
      errorDetails: error.message,
      errorStack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

// Forgot Password route
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 3600000; // 1 hour

    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { 
          resetPasswordToken: resetToken,
          resetPasswordExpires: resetTokenExpires
        } 
      }
    );

    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    // Configure Email Transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Email Options
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"TGS Payroll" <noreply@tgs-payroll.com>',
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your TGS Payroll account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        </div>
      `
    };

    // Try to send email, but don't fail if SMTP is not configured
    try {
      if (process.env.SMTP_USER && process.env.SMTP_USER !== 'your-email@gmail.com') {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email}`);
      } else {
        console.log('SMTP not configured or using default values. Skipping email send.');
        console.log(`[DEV ONLY] Reset Link: ${resetLink}`);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Fallback for dev environment if email fails
      console.log(`[DEV ONLY] Reset Link: ${resetLink}`);
    }
    
    res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password route
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" }
      }
    );

    res.json({ success: true, message: 'Password has been reset successfully' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, verifyAdminToken };
