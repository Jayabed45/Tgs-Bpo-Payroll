const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { MongoClient } = require('mongodb');
const path = require('path');

// Load env from repo root (one shared .env for frontend + backend)
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

// Require MongoDB URI from env (avoid falling back to local silently)
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error(`❌ MONGODB_URI is missing. Expected in ${envPath}`);
  process.exit(1);
}
const maskedMongoUri = MONGODB_URI.replace(/:\/\/([^@]*)@/, '://***@');

const { router: authRoutes } = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const payrollRoutes = require('./routes/payroll');
const payslipRoutes = require('./routes/payslips');
const departmentRoutes = require('./routes/departments');
const settingsRoutes = require('./routes/settings');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.API_PORT || process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Global variables for database connection
let db;
let client;

// MongoDB connection function
async function connectToDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`Using Mongo URI: ${maskedMongoUri}`);
    await client.connect();

    db = client.db();
    
    // Test the connection
    await db.admin().ping();
    console.log('✅ Connected to MongoDB successfully');
    
    // Make db available globally
    global.db = db;
    
    // Monitor connection events
    client.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    
    client.on('close', () => {
      console.warn('⚠️  MongoDB connection closed');
      global.db = null;
    });
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n Shutting down gracefully...');
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n Shutting down gracefully...');
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

// Security middleware

// Helmet security headers - configurable
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting - configurable via environment variables
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX) || (NODE_ENV === 'production' ? 100 : 1000),
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration - secure and configurable
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000').split(',');
    if (allowedOrigins.includes(origin) || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// Body parsing middleware - increased limit for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection check middleware
app.use((req, res, next) => {
  if (!global.db) {
    console.error('❌ Database connection lost');
    return res.status(503).json({ 
      error: 'Database connection unavailable',
      message: 'Please restart the server'
    });
  }
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/export', exportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'TGS Payroll Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server with database connection
async function startServer() {
  try {
    // Connect to database first
    await connectToDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`TGS Payroll Backend running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Frontend URL: ${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`Database: ${MONGODB_URI}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();