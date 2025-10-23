const { MongoClient } = require('mongodb');
const Department = require('./models/Department');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgs-payroll';

async function testEmployeeDepartmentLink() {
  let client;
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();
    
    console.log('✅ Connected to MongoDB successfully\n');
    
    // Get all departments
    console.log('📊 Getting all departments...');
    const departments = await db.collection('departments')
      .find({ isActive: true })
      .toArray();
    
    console.log(`Found ${departments.length} departments:\n`);
    
    // Check employees for each department
    for (const dept of departments) {
      console.log(`🏢 Department: ${dept.name} (${dept.code})`);
      console.log(`   ID: ${dept._id}`);
      
      // Get employees directly from collection
      const employees = await db.collection('employees')
        .find({ 
          departmentId: dept._id,
          isActive: true 
        })
        .toArray();
      
      console.log(`   Direct query employees: ${employees.length}`);
      
      // Test the Department.getDepartmentStats method
      const stats = await Department.getDepartmentStats(db, dept._id.toString());
      console.log(`   Stats method result: ${stats.employeeCount} employees, ${stats.payrollCount} payrolls`);
      
      if (employees.length > 0) {
        console.log('   Employee details:');
        employees.forEach(emp => {
          console.log(`     - ${emp.name} (${emp.position}) - Dept ID: ${emp.departmentId}`);
        });
      }
      
      console.log('---\n');
    }
    
    // Also check all employees to see their department assignments
    console.log('👥 All employees and their department assignments:');
    const allEmployees = await db.collection('employees')
      .find({ isActive: true })
      .toArray();
    
    allEmployees.forEach(emp => {
      console.log(`- ${emp.name}: departmentId = ${emp.departmentId} (type: ${typeof emp.departmentId})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

console.log('🧪 Testing Employee-Department Link\n');
testEmployeeDepartmentLink();
