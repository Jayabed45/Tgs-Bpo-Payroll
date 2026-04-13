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
    payroll: [],
    payrollProcessingAudits: [],
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
