const { MongoClient } = require('mongodb');
const path = require('path');

// Load env from repo root so scripts and routes get the shared .env
const envPath = path.resolve(__dirname, '../../.env');

require('dotenv').config({ path: envPath });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgs-payroll';

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global;

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Test the connection
async function testConnection() {
  try {
    const client = await clientPromise;
    await client.db().admin().ping();
    console.log(' MongoDB connected successfully');
  } catch (error) {
    console.error(' MongoDB connection failed:', error);
    process.exit(1);
  }
}

module.exports = { clientPromise, testConnection }; 