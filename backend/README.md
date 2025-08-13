# TGS BPO Payroll System - Backend

Express.js backend for the TGS BPO Payroll System.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Setup
Create a `.env` file in the backend directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/tgs-payroll

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 3. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

## 📁 Project Structure
```
backend/
├── config/
│   └── database.js      # MongoDB connection
├── routes/
│   └── auth.js          # Authentication routes
├── server.js            # Main server file
├── package.json         # Dependencies
└── .env                 # Environment variables
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/create-admin` - Create admin account
- `GET /api/auth/profile` - Get user profile (protected)

### Health Check
- `GET /api/health` - Server health check

## 🔒 Security Features
- ✅ Helmet.js for security headers
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ JWT authentication
- ✅ Password hashing with bcrypt
- ✅ Input validation

## 🛠️ Development
- **Port**: 5000 (default)
- **Auto-reload**: nodemon
- **Database**: MongoDB
- **Authentication**: JWT tokens

## 📊 Database Collections
- `users` - User accounts and authentication data 