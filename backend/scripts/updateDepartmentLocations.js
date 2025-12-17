/**
 * Script to update existing departments with site locations
 * Run with: node backend/scripts/updateDepartmentLocations.js
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgs-payroll';

async function updateDepartmentLocations() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const departmentsCollection = db.collection('departments');
    
    // Get all departments
    const departments = await departmentsCollection.find({}).toArray();
    console.log(`Found ${departments.length} departments`);
    
    // Update first department to Cebu
    if (departments.length >= 1) {
      const result1 = await departmentsCollection.updateOne(
        { _id: departments[0]._id },
        { $set: { siteLocation: 'Cebu', updatedAt: new Date() } }
      );
      console.log(`Updated ${departments[0].name} to Cebu: ${result1.modifiedCount} modified`);
    }
    
    // Update second department to Tuburan
    if (departments.length >= 2) {
      const result2 = await departmentsCollection.updateOne(
        { _id: departments[1]._id },
        { $set: { siteLocation: 'Tuburan', updatedAt: new Date() } }
      );
      console.log(`Updated ${departments[1].name} to Tuburan: ${result2.modifiedCount} modified`);
    }
    
    // Show updated departments
    const updatedDepts = await departmentsCollection.find({}).toArray();
    console.log('\nUpdated departments:');
    updatedDepts.forEach(dept => {
      console.log(`  - ${dept.name} (${dept.code}): ${dept.siteLocation || 'No location'}`);
    });
    
    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

updateDepartmentLocations();
