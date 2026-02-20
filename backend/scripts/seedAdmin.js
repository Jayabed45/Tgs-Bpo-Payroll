const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgs-payroll';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@tgsbpo.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function seedAdmin() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const usersCollection = db.collection('users');
    
    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ email: ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);
    
    // Create admin user
    const adminUser = {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(adminUser);
    console.log(`Admin user created with ID: ${result.insertedId}`);
    
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
if (require.main === module) {
  seedAdmin()
    .then(() => console.log('Admin seeding completed'))
    .catch(console.error);
}

module.exports = { seedAdmin };
