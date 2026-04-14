const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');

const { processImportedPayroll } = require('../services/payrollImportProcessor');

function buildBase64Workbook(sheets) {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
}

function createMockDb(initialEmployees = []) {
  const state = {
    employees: initialEmployees.map((emp, i) => ({ _id: `emp-${i + 1}`, ...emp })),
    departments: [],
    payroll: [],
    payrollProcessingAudits: [],
    settings: [
      {
        _id: 'settings-1',
        type: 'system',
        data: {
          defaultAllowances: {
            foodAllowance: 0,
            transportationAllowance: 0,
            complexityAllowance: 0,
            observationalAllowance: 0,
            communicationsAllowance: 0,
            internetAllowance: 0,
            riceSubsidyAllowance: 0,
            clothingAllowance: 0,
            laundryAllowance: 0,
          },
        },
      },
    ],
  };
  let idCounter = 1000;

  function matchQuery(doc, query) {
    return Object.entries(query).every(([key, value]) => doc[key] === value);
  }

  function collection(name) {
    const store = state[name];
    if (!store) {
      throw new Error(`Unknown collection: ${name}`);
    }
    return {
      find() {
        return {
          async toArray() {
            return [...store];
          },
        };
      },
      async findOne(query) {
        return store.find((doc) => matchQuery(doc, query)) || null;
      },
      async insertOne(doc) {
        const insertedId = doc._id || `${name}-${idCounter++}`;
        store.push({ _id: insertedId, ...doc });
        return { insertedId };
      },
      async updateOne(query, update) {
        const doc = store.find((item) => matchQuery(item, query));
        if (!doc) return { matchedCount: 0, modifiedCount: 0 };

        if (update.$set) {
          Object.assign(doc, update.$set);
        }
        if (update.$push) {
          for (const [field, value] of Object.entries(update.$push)) {
            if (!Array.isArray(doc[field])) doc[field] = [];
            doc[field].push(value);
          }
        }
        return { matchedCount: 1, modifiedCount: 1 };
      },
    };
  }

  return { db: { collection }, state };
}

function contributionStubs() {
  return {
    calculateSSSContribution: () => 100,
    calculatePhilHealthContribution: () => 150,
    calculatePagibigContribution: () => 50,
  };
}

test('processes legacy summary + OT workbook and stores payroll', async () => {
  const base64 = buildBase64Workbook({
    'Total Hours - Summary': [
      ['Emp ID', "Employee's Name", '1-Feb', '2-Feb', 'Grand Total'],
      ['EMP001', 'John Doe', 8, 8, 16],
    ],
    'Hourly': [
      ['Emp ID', "Employee's Name", 'Hourly Rate', 'Base Salary'],
      ['EMP001', 'John Doe', 150, 15000],
    ],
    'OT': [
      ['Emp ID', "Employee's Name", 'Overtime Hours', 'Rest Day OT', 'Regular OT', 'Special Holiday OT', 'Bonus'],
      ['EMP001', 'John Doe', 2, 0, 2, 0, 500],
    ],
    'Special Holiday': [
      ['Emp ID', "Employee's Name", 'Location', '14-Feb', 'Grand Total'],
      ['EMP001', 'John Doe', 'Cebu', 8, 8],
    ],
    'SIL_Offset': [
      ['Emp ID', "Employee's Name", 'CTO', 'PH Not Working', 'SIL Tenure', 'SIL'],
      ['EMP001', 'John Doe', 0, 8, 2, 5],
    ],
  });
  const { db, state } = createMockDb([
    { employeeCode: 'EMP-001', name: 'John Doe', salary: 22000, hourlyRate: 125 },
  ]);

  const result = await processImportedPayroll(
    { fileData: base64, cutoffStart: '2026-04-01', cutoffEnd: '2026-04-15', initiatedBy: 'tester' },
    { db, ...contributionStubs(), logger: console }
  );

  assert.equal(result.httpStatus, 200);
  assert.equal(result.payload.success, true);
  assert.equal(result.payload.results.created, 1);
  assert.equal(state.payroll.length, 1);
  assert.equal(state.payrollProcessingAudits.length, 1);
  assert.equal(state.payrollProcessingAudits[0].status, 'success');
  assert.ok(state.payroll[0].grossPay > 0);

  const johnPayroll = state.payroll[0];
  assert.equal(johnPayroll.workedHours, 16);
  assert.equal(johnPayroll.overtimeHours, 2);
  assert.equal(johnPayroll.hourlyRate, 150);
  assert.equal(johnPayroll.basicSalary, 16 * 150); // 2400
  assert.equal(johnPayroll.salaryAdjustment, 2 * 150 * 1.25); // 375
  assert.equal(johnPayroll.holidayPay, 8 * 150 * 0.3); // 360
  assert.equal(johnPayroll.specialHolidayHours, 8);
  assert.equal(johnPayroll.phHolidayNotWorking, 8);
  assert.equal(johnPayroll.silCredits, 5);
});

test('processes flexible Excel format with bonuses and deductions', async () => {
  const base64 = buildBase64Workbook({
    PayrollData: [
      ['Employee ID', 'Employee Name', 'Base Salary', 'Regular Hours', 'Overtime Hours', 'Allowances', 'Deductions', 'Withholding Tax', 'Bonuses'],
      ['EMP-100', 'Jane Smith', 20000, 80, 10, 2500, 500, 1000, 750],
    ],
  });
  const { db, state } = createMockDb([]);

  const result = await processImportedPayroll(
    { fileData: base64, cutoffStart: '2026-04-01', cutoffEnd: '2026-04-15', initiatedBy: 'tester' },
    { db, ...contributionStubs(), logger: console }
  );

  assert.equal(result.httpStatus, 200);
  assert.equal(result.payload.success, true);
  assert.equal(result.payload.results.created, 1);
  assert.equal(result.payload.results.employeesCreated, 1);
  assert.equal(state.payroll.length, 1);
  assert.equal(state.payroll[0].employeeCode, 'EMP-100');
  assert.ok(state.payroll[0].netPay > 0);
});

test('returns failed status when workbook has no processable rows', async () => {
  const base64 = buildBase64Workbook({
    Sheet1: [['Notes'], ['No payroll data here']],
  });
  const { db, state } = createMockDb([]);

  const result = await processImportedPayroll(
    { fileData: base64, cutoffStart: '2026-04-01', cutoffEnd: '2026-04-15', initiatedBy: 'tester' },
    { db, ...contributionStubs(), logger: console }
  );

  assert.equal(result.httpStatus, 422);
  assert.equal(result.payload.success, false);
  assert.equal(result.payload.results.created, 0);
  assert.equal(state.payroll.length, 0);
  assert.equal(state.payrollProcessingAudits.length, 1);
  assert.equal(state.payrollProcessingAudits[0].status, 'failed');
});

test('returns partial success when some rows are invalid', async () => {
  const base64 = buildBase64Workbook({
    PayrollData: [
      ['Employee ID', 'Employee Name', 'Base Salary', 'Regular Hours', 'Allowances', 'Deductions', 'Withholding Tax'],
      ['EMP-300', 'Valid User', 15000, 80, 500, 200, 300],
      ['', '', -1000, -10, '', '', ''],
    ],
  });
  const { db, state } = createMockDb([]);

  const result = await processImportedPayroll(
    { fileData: base64, cutoffStart: '2026-04-01', cutoffEnd: '2026-04-15', initiatedBy: 'tester' },
    { db, ...contributionStubs(), logger: console }
  );

  assert.equal(result.httpStatus, 200);
  assert.equal(result.payload.success, true);
  assert.equal(result.payload.results.created, 1);
  assert.equal(result.payload.results.failed, 1);
  assert.equal(state.payroll.length, 1);
  assert.equal(state.payrollProcessingAudits[0].status, 'partial');
  assert.ok(result.payload.results.errors.length > 0);
});

test('matches employees across sheets using code-first and normalized-name fallback', async () => {
  const base64 = buildBase64Workbook({
    'Total Hours - Summary': [
      ['Emp ID', "Employee's Name", '1-Feb', '2-Feb', 'Grand Total'],
      ['EMP001', 'John A Doe', 8, 8, 16],
      ['EMP002', 'Jane B Smith', 8, 8, 16],
    ],
    Hourly: [
      ['Emp ID', "Employee's Name", 'Hourly Rate', 'Base Salary'],
      ['EMP001', 'John A Doe', 150, 15000],
      ['EMP002', 'Jane B Smith', 120, 12000],
    ],
    OT: [
      ['Emp ID', "Employee's Name", 'Overtime Hours', 'Rest Day OT', 'Regular OT', 'Special Holiday OT', 'Bonus'],
      ['EMP-001', 'john a. doe', 4, 0, 4, 0, 0],
      ['EMP-002', 'JANE B SMITH', 1, 0, 1, 0, 0],
    ],
    'Special Holiday': [
      ['Emp ID', "Employee's Name", 'Location', '14-Feb', 'Grand Total'],
      ['EMP001', 'John A. Doe', 'Cebu', 8, 8],
      ['EMP002', 'Jane B Smith', 'Cebu', 0, 0],
    ],
  });

  const { db, state } = createMockDb([
    { employeeCode: 'EMP-001', name: 'John A Doe', salary: 22000, hourlyRate: 125 },
    { employeeCode: 'EMP-002', name: 'Jane B Smith', salary: 22000, hourlyRate: 125 },
  ]);

  const result = await processImportedPayroll(
    { fileData: base64, cutoffStart: '2026-04-01', cutoffEnd: '2026-04-15', initiatedBy: 'tester' },
    { db, ...contributionStubs(), logger: console }
  );

  assert.equal(result.httpStatus, 200);
  assert.equal(result.payload.success, true);
  assert.equal(result.payload.results.created, 2);
  assert.equal(state.payroll.length, 2);

  const john = state.payroll.find((p) => p.employeeCode === 'EMP001');
  const jane = state.payroll.find((p) => p.employeeCode === 'EMP002');

  assert.ok(john);
  assert.ok(jane);
  assert.equal(john.overtimeHours, 4);
  assert.equal(jane.overtimeHours, 1);
  assert.equal(john.specialHolidayHours, 8);
  assert.equal(jane.specialHolidayHours, 0);
  assert.notEqual(john.netPay, jane.netPay);
});

test('syncs employee and department master data from template sheets', async () => {
  const base64 = buildBase64Workbook({
    Employee: [
      ['Emp ID', 'Employee Name', 'Position', 'Salary', 'Status', 'Site Location', 'Department Name', 'Department Code', 'Email'],
      ['EMP777', 'Master User', 'Analyst', 18000, 'Active', 'Cebu', 'People Operations', 'POPS', 'master.user@example.com'],
    ],
    Allowances: [
      ['Emp ID', 'Employee Name', 'FOOD ALLOWANCE', 'TRANSPORTATION ALLOWANCE', 'OTHER ALLOWANCE'],
      ['EMP777', 'Master User', 1000, 500, 250],
    ],
    'Goverment Contirbution': [
      ['Emp ID', 'Employee Name', 'SSS Number', 'Philhealth Number', 'Pag-ibig Number'],
      ['EMP777', 'Master User', 'SSS-001', 'PH-001', 'PAG-001'],
    ],
    'Total Hours - Summary': [
      ['Emp ID', "Employee's Name", '1-Feb', '2-Feb', 'Grand Total'],
      ['EMP777', 'Master User', 8, 8, 16],
    ],
  });

  const { db, state } = createMockDb([]);

  const result = await processImportedPayroll(
    { fileData: base64, cutoffStart: '2026-04-01', cutoffEnd: '2026-04-15', initiatedBy: 'tester' },
    { db, ...contributionStubs(), logger: console }
  );

  assert.equal(result.httpStatus, 200);
  assert.equal(result.payload.success, true);
  assert.equal(result.payload.results.created, 1);
  assert.equal(result.payload.results.employeesCreatedFromMaster, 1);
  assert.equal(result.payload.results.departmentsCreated, 1);
  assert.equal(state.departments.length, 1);
  assert.equal(state.employees.length, 1);
  assert.equal(state.payroll.length, 1);

  const employee = state.employees[0];
  const department = state.departments[0];
  assert.equal(employee.departmentName, 'People Operations');
  assert.equal(employee.departmentId, department._id);
  assert.equal(employee.foodAllowance, 1000);
  assert.equal(employee.transportationAllowance, 500);
  assert.equal(employee.allowance, 250);
  assert.equal(employee.sssNumber, 'SSS-001');
  assert.equal(employee.philhealthNumber, 'PH-001');
  assert.equal(employee.pagibigNumber, 'PAG-001');
});
