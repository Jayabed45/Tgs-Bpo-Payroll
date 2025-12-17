const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb://localhost:27017/tgs-payroll');
  await client.connect();
  const db = client.db();
  
  const payrolls = await db.collection('payroll').find({}).limit(5).toArray();
  
  console.log('Sample payroll records:');
  payrolls.forEach((p, i) => {
    console.log(`\nPayroll ${i+1}:`);
    console.log('  employeeName:', p.employeeName);
    console.log('  workedHours:', p.workedHours);
    console.log('  totalWorkedHours:', p.totalWorkedHours);
    console.log('  basicSalary:', p.basicSalary);
    console.log('  cutoffStart:', p.cutoffStart);
    console.log('  cutoffEnd:', p.cutoffEnd);
  });
  
  await client.close();
}

check().catch(console.error);
