const { MongoClient } = require('mongodb');
const Department = require('../models/Department');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgs-payroll';

const sampleDepartments = [
  {
    name: 'Human Resources',
    code: 'HR',
    description: 'Manages employee relations, recruitment, and organizational development',
    isActive: true
  },
  {
    name: 'Information Technology',
    code: 'IT',
    description: 'Handles technology infrastructure, software development, and technical support',
    isActive: true
  },
  {
    name: 'Finance and Accounting',
    code: 'FIN',
    description: 'Manages financial operations, budgeting, and accounting processes',
    isActive: true
  },
  {
    name: 'Customer Service',
    code: 'CS',
    description: 'Provides customer support and manages client relationships',
    isActive: true
  },
  {
    name: 'Operations',
    code: 'OPS',
    description: 'Oversees daily business operations and process management',
    isActive: true
  },
  {
    name: 'Quality Assurance',
    code: 'QA',
    description: 'Ensures service quality and compliance with standards',
    isActive: true
  },
  {
    name: 'Business Development',
    code: 'BD',
    description: 'Focuses on business growth, partnerships, and market expansion',
    isActive: true
  },
  {
    name: 'Training and Development',
    code: 'TD',
    description: 'Provides employee training and professional development programs',
    isActive: true
  },
  {
    name: 'Administration',
    code: 'ADMIN',
    description: 'Handles administrative tasks and office management',
    isActive: true
  },
  {
    name: 'Marketing',
    code: 'MKT',
    description: 'Manages marketing campaigns and brand promotion',
    isActive: true
  }
];

async function seedDepartments() {
  let client;
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    const departmentsCollection = db.collection('departments');
    
    // Check if departments already exist
    const existingCount = await departmentsCollection.countDocuments();
    
    if (existingCount > 0) {
      console.log(`ℹ️  Found ${existingCount} existing departments. Skipping seed.`);
      console.log('💡 To force re-seed, delete existing departments first.');
      return;
    }
    
    console.log('📝 Creating sample departments...');
    
    // Create department documents
    const departmentDocs = sampleDepartments.map(deptData => {
      const department = new Department(deptData);
      return department.toMongoDoc();
    });
    
    // Insert departments
    const result = await departmentsCollection.insertMany(departmentDocs);
    
    console.log(`✅ Successfully created ${result.insertedCount} departments:`);
    
    // Display created departments
    const createdDepartments = await departmentsCollection
      .find({ _id: { $in: Object.values(result.insertedIds) } })
      .sort({ name: 1 })
      .toArray();
    
    createdDepartments.forEach((dept, index) => {
      console.log(`   ${index + 1}. ${dept.name} (${dept.code}) - ID: ${dept._id}`);
    });
    
    console.log('\n🎯 Department seeding completed successfully!');
    console.log('💼 You can now assign employees to these departments.');
    
  } catch (error) {
    console.error('❌ Error seeding departments:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Database connection closed.');
    }
  }
}

// Add department indexing for better performance
async function createIndexes() {
  let client;
  
  try {
    console.log('🔄 Creating department indexes...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    const departmentsCollection = db.collection('departments');
    
    // Create indexes
    await departmentsCollection.createIndex({ code: 1 }, { unique: true });
    await departmentsCollection.createIndex({ name: 1 });
    await departmentsCollection.createIndex({ isActive: 1 });
    await departmentsCollection.createIndex({ createdAt: -1 });
    
    console.log('✅ Department indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Function to update existing employees with default department
async function assignDefaultDepartment() {
  let client;
  
  try {
    console.log('🔄 Checking for employees without departments...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    const employeesCollection = db.collection('employees');
    const departmentsCollection = db.collection('departments');
    
    // Find employees without department
    const employeesWithoutDept = await employeesCollection
      .find({ departmentId: { $exists: false } })
      .toArray();
    
    if (employeesWithoutDept.length === 0) {
      console.log('ℹ️  All employees already have departments assigned.');
      return;
    }
    
    // Get default department (first one, usually HR)
    const defaultDepartment = await departmentsCollection.findOne({ code: 'HR' });
    
    if (!defaultDepartment) {
      console.log('⚠️  No HR department found. Please run seed first.');
      return;
    }
    
    // Update employees without department
    const updateResult = await employeesCollection.updateMany(
      { departmentId: { $exists: false } },
      { 
        $set: { 
          departmentId: defaultDepartment._id,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log(`✅ Assigned ${updateResult.modifiedCount} employees to HR department.`);
    
  } catch (error) {
    console.error('❌ Error assigning default departments:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 TGS BPO Department Seeding Script');
  console.log('=====================================\n');
  
  await seedDepartments();
  await createIndexes();
  await assignDefaultDepartment();
  
  console.log('\n🎉 All operations completed!');
  console.log('📋 Next steps:');
  console.log('   1. Start your backend server');
  console.log('   2. Test department endpoints: GET /api/departments');
  console.log('   3. Create/edit employees with department assignments');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  seedDepartments,
  createIndexes,
  assignDefaultDepartment,
  sampleDepartments
};
