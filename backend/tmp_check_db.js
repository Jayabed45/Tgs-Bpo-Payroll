const { clientPromise } = require('./config/database');
(async()=>{
  const client = await clientPromise;
  const db = client.db();
  const payroll = db.collection('payroll');
  const employees = db.collection('employees');
  const cutoffStart='2025-10-16';
  const cutoffEnd='2025-10-31';
  const pr = await payroll.find({cutoffStart, cutoffEnd}).toArray();
  console.log('Payroll records for cutoff:', pr.length);
  const ids = new Set(pr.map(p=>String(p.employeeId||'')));
  const emps = await employees.find({}).project({name:1,employeeCode:1}).toArray();
  console.log('Total employees in DB:', emps.length);
  // show records without netPay/gross
  const bad = pr.filter(p=>p.netPay===undefined || p.grossPay===undefined);
  console.log('Records missing net/gross:', bad.length);
  if(bad.length){
    console.log('Sample missing:', bad.slice(0,10).map(b=>({name:b.employeeName,code:b.employeeCode,id:b.employeeId,netPay:b.netPay,grossPay:b.grossPay})));
  }
  process.exit(0);
})();
