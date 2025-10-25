const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tgs-payroll';

async function createAllIndexes() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    
    console.log('Creating optimized indexes for department integration...\n');
    
    // Department Collection Indexes
    console.log('1️Creating Department indexes...');
    const departmentsCollection = db.collection('departments');
    
    await departmentsCollection.createIndex(
      { code: 1 }, 
      { unique: true, name: 'idx_department_code_unique' }
    );
    
    await departmentsCollection.createIndex(
      { name: 1 }, 
      { name: 'idx_department_name' }
    );
    
    await departmentsCollection.createIndex(
      { isActive: 1 }, 
      { name: 'idx_department_active' }
    );
    
    await departmentsCollection.createIndex(
      { createdAt: -1 }, 
      { name: 'idx_department_created_desc' }
    );
    
    console.log('Department indexes created');
    
    // Employee Collection Indexes
    console.log('Creating Employee indexes...');
    const employeesCollection = db.collection('employees');
    
    // Department-based filtering (most important for BPO)
    await employeesCollection.createIndex(
      { departmentId: 1, isActive: 1 }, 
      { name: 'idx_employee_dept_active' }
    );
    
    // Department + position filtering
    await employeesCollection.createIndex(
      { departmentId: 1, position: 1 }, 
      { name: 'idx_employee_dept_position' }
    );
    
    // Email uniqueness
    await employeesCollection.createIndex(
      { email: 1 }, 
      { unique: true, name: 'idx_employee_email_unique' }
    );
    
    // Name search
    await employeesCollection.createIndex(
      { name: 1 }, 
      { name: 'idx_employee_name' }
    );
    
    // Hire date for reporting
    await employeesCollection.createIndex(
      { hireDate: -1 }, 
      { name: 'idx_employee_hire_date_desc' }
    );
    
    // Compound index for department reports
    await employeesCollection.createIndex(
      { departmentId: 1, hireDate: -1, isActive: 1 }, 
      { name: 'idx_employee_dept_hire_active' }
    );
    
    console.log('Employee indexes created');
    
    // Payroll Collection Indexes
    console.log('Creating Payroll indexes...');
    const payrollCollection = db.collection('payroll');
    
    // Department-based payroll filtering
    await payrollCollection.createIndex(
      { departmentId: 1, cutoffStart: -1 }, 
      { name: 'idx_payroll_dept_cutoff' }
    );
    
    // Employee payroll history
    await payrollCollection.createIndex(
      { employeeId: 1, cutoffStart: -1 }, 
      { name: 'idx_payroll_employee_cutoff' }
    );
    
    // Department + status filtering
    await payrollCollection.createIndex(
      { departmentId: 1, status: 1 }, 
      { name: 'idx_payroll_dept_status' }
    );
    
    // Cutoff period queries
    await payrollCollection.createIndex(
      { cutoffStart: 1, cutoffEnd: 1 }, 
      { name: 'idx_payroll_cutoff_period' }
    );
    
    // Department payroll reports
    await payrollCollection.createIndex(
      { departmentId: 1, cutoffStart: -1, status: 1 }, 
      { name: 'idx_payroll_dept_cutoff_status' }
    );
    
    console.log('Payroll indexes created');
    
    // Payslips Collection Indexes (if exists)
    console.log('Creating Payslip indexes...');
    const payslipsCollection = db.collection('payslips');
    
    // Department-based payslip filtering
    await payslipsCollection.createIndex(
      { departmentId: 1, generatedAt: -1 }, 
      { name: 'idx_payslip_dept_generated' }
    );
    
    // Employee payslip history
    await payslipsCollection.createIndex(
      { employeeId: 1, generatedAt: -1 }, 
      { name: 'idx_payslip_employee_generated' }
    );
    
    console.log('Payslip indexes created');
    
    // Performance Analysis
    console.log('\n Index Performance Analysis:');
    console.log('=================================');
    
    const collections = ['departments', 'employees', 'payroll', 'payslips'];
    
    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      const stats = await collection.stats().catch(() => ({ count: 0, size: 0 }));
      
      console.log(`\n ${collectionName.toUpperCase()} Collection:`);
      console.log(`   Documents: ${stats.count || 0}`);
      console.log(`   Size: ${Math.round((stats.size || 0) / 1024)} KB`);
      console.log(`   Indexes: ${indexes.length}`);
      
      indexes.forEach(index => {
        if (index.name !== '_id_') {
          console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
        }
      });
    }
    
    console.log('\n Recommended Query Patterns:');
    console.log('===============================');
    console.log(' Fast: db.employees.find({ departmentId: ObjectId("..."), isActive: true })');
    console.log(' Fast: db.payroll.find({ departmentId: ObjectId("...") }).sort({ cutoffStart: -1 })');
    console.log(' Fast: db.departments.find({ isActive: true }).sort({ name: 1 })');
    console.log(' Fast: db.employees.find({ departmentId: ObjectId("..."), position: "Manager" })');
    
    console.log('\n  Avoid These Patterns:');
    console.log(' Slow: db.employees.find({ salary: { $gt: 50000 } }) // No salary index');
    console.log(' Slow: db.payroll.find({ netPay: { $gt: 30000 } }) // No netPay index');
    
    console.log('\n All indexes created successfully!');
    
  } catch (error) {
    console.error(' Error creating indexes:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log(' Database connection closed.');
    }
  }
}

// Function to analyze query performance
async function analyzeQueryPerformance() {
  let client;
  
  try {
    console.log(' Analyzing query performance...');
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db();
    
    // Sample performance tests
    const testQueries = [
      {
        collection: 'employees',
        query: { departmentId: { $exists: true }, isActive: true },
        description: 'Find active employees by department'
      },
      {
        collection: 'payroll',
        query: { departmentId: { $exists: true } },
        sort: { cutoffStart: -1 },
        description: 'Get recent payroll by department'
      },
      {
        collection: 'departments',
        query: { isActive: true },
        sort: { name: 1 },
        description: 'List active departments'
      }
    ];
    
    for (const test of testQueries) {
      const collection = db.collection(test.collection);
      const explain = await collection.find(test.query)
        .sort(test.sort || {})
        .explain('executionStats');
      
      console.log(`\n ${test.description}:`);
      console.log(`   Execution time: ${explain.executionStats.executionTimeMillis}ms`);
      console.log(`   Documents examined: ${explain.executionStats.totalDocsExamined}`);
      console.log(`   Documents returned: ${explain.executionStats.totalDocsReturned}`);
      console.log(`   Index used: ${explain.executionStats.winningPlan.inputStage?.indexName || 'Collection scan'}`);
    }
    
  } catch (error) {
    console.error(' Error analyzing performance:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Main execution
async function main() {
  console.log(' TGS BPO Database Indexing Script');
  console.log('====================================\n');
  
  await createAllIndexes();
  
  // Uncomment to run performance analysis
  // await analyzeQueryPerformance();
  
  console.log('\n Database optimization completed!');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createAllIndexes,
  analyzeQueryPerformance
};
