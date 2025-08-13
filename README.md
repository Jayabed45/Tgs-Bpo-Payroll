# TGS BPO PAYROLL SYSTEM

A complete payroll management system built with Next.js frontend and Express.js backend, featuring user authentication, admin dashboard, and MongoDB database integration.

## 🛡️ How Backend Handles Account Creation

### Endpoint
- **POST** `/api/auth/create-admin`

### File(s) Involved
- `backend/routes/auth.js` — Handles the route logic
- `backend/config/database.js` — Handles MongoDB connection

### How It Works
1. **Receives a POST request** with `name`, `email`, and `password`.
2. **Validates input** (all fields required, password length).
3. **Checks if the email already exists** in the `users` collection.
4. **Hashes the password** using bcrypt.
5. **Creates a new user** with the role `admin` in the database.
6. **Returns a success response** (and a JWT token if needed).

---

## 📁 Project Structure

```
tgs-bpo-payroll/
├── src/                          # Frontend (Next.js)
│   ├── app/
│   │   ├── page.tsx             # Login page with admin creation
│   │   ├── admin/
│   │   │   └── page.tsx         # Admin dashboard
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css          # Global styles
│   │   └── favicon.ico          # Site icon
│   └── lib/                     # Frontend utilities
├── backend/                      # Backend (Express.js)
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── routes/
│   │   └── auth.js              # Authentication routes
│   ├── server.js                # Main Express server
│   ├── package.json             # Backend dependencies
│   └── README.md                # Backend documentation
├── public/                       # Static assets
├── package.json                  # Frontend dependencies
├── next.config.ts               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS config
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone and Setup
```bash
# Navigate to project directory
cd tgs-bpo-payroll

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 2. Environment Setup

#### Frontend (.env.local in root)
```env
# Not needed for basic setup - uses backend API
```

#### Backend (.env in backend folder)
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

### 3. Start the Application

#### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
Backend will run on: http://localhost:5000

#### Terminal 2 - Frontend
```bash
# In root directory
npm run dev
```
Frontend will run on: http://localhost:3000

## 👤 Account Creation & Authentication

### Creating Your First Admin Account

1. **Open the application**: http://localhost:3000
2. **Click "Create admin account"** button at the bottom
3. **Fill in the form**:
   - **Full Name**: Your name
   - **Email**: admin@tgs.com (or any email)
   - **Password**: Choose a strong password (min 6 characters)
4. **Click "Create Admin"**
5. **Success message** will appear: "✅ Admin created successfully! You can now login."
6. **Switch back to login** and use your credentials

### Login Process

1. **Enter your credentials**:
   - Email: The email you used during creation
   - Password: The password you set
2. **Click "Sign in"**
3. **You'll be redirected** to the admin dashboard

### Features

- ✅ **Show/Hide Password**: Eye icon to toggle password visibility
- ✅ **Form Validation**: Real-time validation and error messages
- ✅ **Loading States**: Visual feedback during authentication
- ✅ **Secure Storage**: JWT tokens for session management
- ✅ **Auto-redirect**: Automatic navigation after successful login

## 🔌 API Endpoints

### Authentication Routes
- `POST /api/auth/login` - User login
- `POST /api/auth/create-admin` - Create admin account
- `GET /api/auth/profile` - Get user profile (protected)

### Health Check
- `GET /api/health` - Server health check

## 🛠️ File Descriptions

### Frontend Files

#### `src/app/page.tsx`
- **Purpose**: Main login page with admin creation
- **Features**:
  - Login form with email/password
  - Admin creation form with name/email/password
  - Toggle between login and admin creation
  - Show/hide password functionality
  - Loading animations and error handling
  - Form validation and success messages

#### `src/app/admin/page.tsx`
- **Purpose**: Admin dashboard after successful login
- **Features**:
  - User authentication check
  - Welcome message with user info
  - Logout functionality
  - Basic dashboard stats (Employees, Payroll, Reports)
  - Clean, simple design

#### `src/app/layout.tsx`
- **Purpose**: Root layout wrapper
- **Features**: Global styling and metadata

### Backend Files

#### `backend/server.js`
- **Purpose**: Main Express server
- **Features**:
  - Security middleware (Helmet, CORS, Rate limiting)
  - Route configuration
  - Error handling
  - Health check endpoint

#### `backend/routes/auth.js`
- **Purpose**: Authentication API routes
- **Features**:
  - User login with password verification
  - Admin account creation with password hashing
  - JWT token generation
  - Protected route middleware
  - Input validation

#### `backend/config/database.js`
- **Purpose**: MongoDB connection management
- **Features**:
  - Connection pooling
  - Development/production configurations
  - Connection testing

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure session management
- **CORS Protection**: Configured for frontend only
- **Rate Limiting**: 100 requests per 15 minutes
- **Security Headers**: Helmet.js protection
- **Input Validation**: Server-side validation
- **Error Handling**: Secure error messages

## 🎨 UI/UX Features

- **Loading Animation**: TGS branding with spinner
- **Responsive Design**: Works on all screen sizes
- **Clean Interface**: Minimal, professional design
- **Form Validation**: Real-time feedback
- **Success/Error Messages**: Clear user feedback
- **Password Toggle**: Show/hide password functionality

## 📱 Responsive Design

- **Mobile**: Optimized for phones and tablets
- **Desktop**: Full-featured interface
- **Tablet**: Adaptive layout
- **All browsers**: Cross-browser compatibility

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
npm start
```

### Backend (Heroku/Railway)
```bash
cd backend
npm start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure production MongoDB URI
- Set proper `FRONTEND_URL`

## 🔧 Development

### Available Scripts

#### Frontend
```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
```

#### Backend
```bash
npm run dev      # Development with auto-reload
npm start        # Production server
```

### Database Collections
- `users` - User accounts and authentication data

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **CORS Errors**
   - Check `FRONTEND_URL` in backend `.env`
   - Ensure frontend and backend ports match

3. **JWT Token Issues**
   - Verify `JWT_SECRET` is set
   - Check token expiration

4. **Port Conflicts**
   - Frontend: 3000
   - Backend: 5000
   - Change ports in `.env` if needed

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Verify all environment variables
3. Ensure MongoDB is running
4. Check console logs for errors

## 🔄 Version History

- **v1.0.0**: Initial release with authentication and admin dashboard
- Separate frontend/backend architecture
- MongoDB integration
- JWT authentication
- Responsive design

---

**Built with ❤️ for TGS BPO Payroll System**
