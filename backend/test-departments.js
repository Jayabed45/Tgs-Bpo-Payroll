const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgs-payroll';

async function testDepartmentCreation() {
  let client;
  
  try {
    console.log('🔄 Testing department creation...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    const departmentsCollection = db.collection('departments');
    
    // Test creating a department directly
    const testDepartment = {
      name: 'Test Department',
      code: 'TEST',
      description: 'Test department for debugging',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await departmentsCollection.insertOne(testDepartment);
    console.log('✅ Department created successfully:', result.insertedId);
    
    // Fetch all departments
    const departments = await departmentsCollection.find({}).toArray();
    console.log('📋 All departments:', departments.length);
    
    departments.forEach(dept => {
      console.log(`   - ${dept.name} (${dept.code}) - ID: ${dept._id}`);
    });
    
    // Clean up test department
    await departmentsCollection.deleteOne({ _id: result.insertedId });
    console.log('🧹 Test department cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed');
    }
  }
}

testDepartmentCreation();
