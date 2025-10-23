const { MongoClient } = require('mongodb');
const Department = require('./models/Department');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgs-payroll';

async function testDepartmentHierarchy() {
  let client;
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    console.log('✅ Connected to MongoDB successfully\n');
    
    // Test the getDepartmentHierarchy method
    console.log('📊 Testing Department.getDepartmentHierarchy()...');
    const departments = await Department.getDepartmentHierarchy(db);
    
    console.log(`\n✅ Found ${departments.length} departments\n`);
    
    // Check each department
    departments.forEach((dept, index) => {
      console.log(`Department ${index + 1}:`);
      console.log('  ID:', dept.id);
      console.log('  Name:', dept.name);
      console.log('  Code:', dept.code);
      console.log('  Has ID?:', !!dept.id);
      console.log('  ID Type:', typeof dept.id);
      console.log('---');
    });
    
    // Test direct collection query
    console.log('\n📊 Testing direct collection query...');
    const directDepts = await db.collection('departments')
      .find({ isActive: true })
      .limit(1)
      .toArray();
    
    if (directDepts.length > 0) {
      console.log('\nDirect query result:');
      console.log('  _id:', directDepts[0]._id);
      console.log('  _id type:', typeof directDepts[0]._id);
      console.log('  name:', directDepts[0].name);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

console.log('🧪 Testing Department Hierarchy\n');
testDepartmentHierarchy();
