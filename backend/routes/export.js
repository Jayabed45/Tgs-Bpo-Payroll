const express = require('express');
const { ObjectId } = require('mongodb');
const { clientPromise } = require('../config/database');
const XLSX = require('xlsx');
const { processImportedPayroll } = require('../services/payrollImportProcessor');
const { logActivity } = require('../services/auditLogger');

const router = express.Router();

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// SSS Contribution Table (2024 rates)
const SSS_TABLE = [
  { min: 0, max: 4249.99, ee: 180, er: 390 },
  { min: 4250, max: 4749.99, ee: 202.5, er: 427.5 },
  { min: 4750, max: 5249.99, ee: 225, er: 465 },
  { min: 5250, max: 5749.99, ee: 247.5, er: 502.5 },
  { min: 5750, max: 6249.99, ee: 270, er: 540 },
  { min: 6250, max: 6749.99, ee: 292.5, er: 577.5 },
  { min: 6750, max: 7249.99, ee: 315, er: 615 },
  { min: 7250, max: 7749.99, ee: 337.5, er: 652.5 },
  { min: 7750, max: 8249.99, ee: 360, er: 720 },
  { min: 8250, max: 8749.99, ee: 382.5, er: 757.5 },
  { min: 8750, max: 9249.99, ee: 405, er: 795 },
  { min: 9250, max: 9749.99, ee: 427.5, er: 832.5 },
  { min: 9750, max: 10249.99, ee: 450, er: 870 },
  { min: 10250, max: 10749.99, ee: 472.5, er: 907.5 },
  { min: 10750, max: 11249.99, ee: 495, er: 945 },
  { min: 11250, max: 11749.99, ee: 517.5, er: 982.5 },
  { min: 11750, max: 12249.99, ee: 540, er: 1020 },
  { min: 12250, max: 12749.99, ee: 562.5, er: 1057.5 },
  { min: 12750, max: 13249.99, ee: 650, er: 1310 },
  { min: 13250, max: 13749.99, ee: 675, er: 1360 },
  { min: 13750, max: 14249.99, ee: 700, er: 1410 },
  { min: 14250, max: 14749.99, ee: 725, er: 1460 },
  { min: 14750, max: 15249.99, ee: 750, er: 1530 },
  { min: 15250, max: 15749.99, ee: 775, er: 1580 },
  { min: 15750, max: 16249.99, ee: 800, er: 1630 },
  { min: 16250, max: 16749.99, ee: 825, er: 1680 },
  { min: 16750, max: 17249.99, ee: 850, er: 1730 },
  { min: 17250, max: 17749.99, ee: 875, er: 1780 },
  { min: 17750, max: 18249.99, ee: 900, er: 1830 },
  { min: 18250, max: 18749.99, ee: 925, er: 1880 },
  { min: 18750, max: 19249.99, ee: 950, er: 1930 },
  { min: 19250, max: 19749.99, ee: 975, er: 1980 },
  { min: 19750, max: 20249.99, ee: 1000, er: 2030 },
  { min: 20250, max: 20749.99, ee: 1025, er: 2080 },
  { min: 20750, max: 21249.99, ee: 1050, er: 2130 },
  { min: 21250, max: 21749.99, ee: 1075, er: 2180 },
  { min: 21750, max: 22249.99, ee: 1100, er: 2230 },
  { min: 22250, max: 22749.99, ee: 1125, er: 2280 },
  { min: 22750, max: 23249.99, ee: 1150, er: 2330 },
  { min: 23250, max: 23749.99, ee: 1175, er: 2380 },
  { min: 23750, max: 24249.99, ee: 1200, er: 2430 },
  { min: 24250, max: 24749.99, ee: 1225, er: 2480 },
  { min: 24750, max: 25249.99, ee: 1250, er: 2530 },
  { min: 25250, max: 25749.99, ee: 1275, er: 2580 },
  { min: 25750, max: 26249.99, ee: 1300, er: 2630 },
  { min: 26250, max: 26749.99, ee: 1325, er: 2680 },
  { min: 26750, max: 27249.99, ee: 1350, er: 2730 },
  { min: 27250, max: 27749.99, ee: 1375, er: 2780 },
  { min: 27750, max: 28249.99, ee: 1400, er: 2830 },
  { min: 28250, max: 28749.99, ee: 1425, er: 2880 },
  { min: 28750, max: 29249.99, ee: 1450, er: 2930 },
  { min: 29250, max: 29749.99, ee: 1475, er: 2980 },
  { min: 29750, max: 99999999, ee: 1500, er: 3030 },
];

// Helper to get dates between cutoff
function getDatesBetween(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Helper to set column widths (wpx = width in pixels, wch = width in characters)
function setColumnWidths(sheet, widths) {
  if (!sheet['!cols']) sheet['!cols'] = [];
  widths.forEach((width, i) => {
    sheet['!cols'][i] = { wpx: width };
  });
}

// Sanitize strings: remove CR/LF and collapse spaces
function sanitizeText(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// Auto-fit column widths from AOA data; returns [{ wch, wpx }]
function autoFitColumns(aoa, opts = {}) {
  const min = opts.min ?? 8;
  const max = opts.max ?? 60;
  const pad = opts.pad ?? 2;
  const colCount = aoa.reduce((m, r) => Math.max(m, r.length), 0);
  const widths = new Array(colCount).fill(min);
  const strlen = (v) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'string') return v.length;
    if (typeof v === 'number') return String(v).length;
    return String(v).length;
  };
  for (const row of aoa) {
    for (let c = 0; c < colCount; c++) {
      widths[c] = Math.min(max, Math.max(widths[c], strlen(row[c]) + pad));
    }
  }
  return widths.map(w => ({ wch: Math.max(min, w), wpx: Math.round(Math.max(min, w) * 7 + 5) }));
}

// Normalize employee codes to numeric 5-digit IDs
function formatEmployeeCode(code, index) {
  if (code !== undefined && code !== null) {
    const str = String(code);
    const match = str.match(/(\d+)/);
    if (match) {
      return String(parseInt(match[1], 10)).padStart(5, '0');
    }
    return str; // fallback to original if no digits at all
  }
  // fallback if no code provided: use sequential index
  return String(index).padStart(5, '0');
}

function parseNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const cleaned = String(value).replace(/,/g, '').trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeEmployeeCode(value) {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits) {
    const normalized = String(parseInt(digits, 10));
    return normalized === 'NaN' ? raw.toLowerCase() : normalized;
  }
  return raw.toLowerCase();
}

function buildEmployeeCodeKeys(value) {
  const keys = new Set();
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (raw) keys.add(raw.toLowerCase());
  const normalized = normalizeEmployeeCode(value);
  if (normalized) keys.add(normalized);
  return Array.from(keys);
}

function excelSerialToDate(serial) {
  const serialNum = parseNumber(serial, NaN);
  if (!Number.isFinite(serialNum)) return null;
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + Math.round(serialNum * 24 * 60 * 60 * 1000);
  return new Date(ms);
}

function toISODate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

function parseHeaderToISODate(headerValue, fallbackYear) {
  if (typeof headerValue === 'number') {
    return toISODate(excelSerialToDate(headerValue));
  }

  if (typeof headerValue !== 'string') return null;
  const text = headerValue.trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const dmyMatch = text.match(/^(\d{1,2})-([A-Za-z]{3,})-?$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const monthToken = dmyMatch[2].slice(0, 3).toLowerCase();
    const monthMap = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const month = monthMap[monthToken];
    if (!month) return null;
    const year = fallbackYear || new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(text);
  return toISODate(parsed);
}

function inferCutoffFromSummaryHeaders(headers, fallbackYear) {
  const dates = [];
  for (let i = 2; i < headers.length; i++) {
    const isoDate = parseHeaderToISODate(headers[i], fallbackYear);
    if (isoDate) dates.push(isoDate);
  }

  if (dates.length === 0) {
    return { cutoffStart: null, cutoffEnd: null };
  }

  dates.sort();
  return {
    cutoffStart: dates[0],
    cutoffEnd: dates[dates.length - 1]
  };
}

function calculateSSSContribution(monthlySalary) {
  const salary = parseNumber(monthlySalary);
  const bracket = SSS_TABLE.find(row => salary >= row.min && salary <= row.max);
  return bracket ? parseNumber(bracket.ee) : 0;
}

function calculatePhilHealthContribution(monthlySalary) {
  const salary = parseNumber(monthlySalary);
  if (salary <= 10000) return 250;
  if (salary <= 99999.99) return Math.min((salary * 0.05) / 2, 2500);
  return 2500;
}

function calculatePagibigContribution(monthlySalary) {
  const salary = parseNumber(monthlySalary);
  if (salary <= 1500) return salary * 0.01;
  return Math.min(salary * 0.02, 100);
}

// Export template with ALL employees (regardless of payroll records)
router.get('/template', verifyAdminToken, async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const employeesCollection = db.collection('employees');
    const departmentsCollection = db.collection('departments');

    // Get ALL active employees
    const employees = await employeesCollection.find({ isActive: true }).toArray();
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'No employees found' });
    }

    // Get all departments for site location lookup
    const departments = await departmentsCollection.find({}).toArray();
    const departmentMap = new Map(departments.map(d => [d._id.toString(), d]));

    // Sort employees alphabetically
    const sortedEmployees = employees.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // Create employee code mapping
    const employeeCodeMap = new Map();
    sortedEmployees.forEach((emp, index) => {
      const employeeCode = formatEmployeeCode(emp.employeeCode, index + 1);
      employeeCodeMap.set(emp._id.toString(), employeeCode);
    });

    // Use current month as default date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dates = getDatesBetween(startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);

    // Create workbook
    const wb = XLSX.utils.book_new();
    // Removed: SSS Contribution Table (per requirements)

    // ========== Sheet 2: Total Hours - Summary ==========
    const summaryHeader = ['Emp ID', 'Employee Name'];
    dates.forEach(d => {
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      summaryHeader.push(`${day}-${month}-`);
    });
    summaryHeader.push('Grand Total');

    const summaryData = [summaryHeader];
    
    sortedEmployees.forEach((emp) => {
      const employeeCode = employeeCodeMap.get(emp._id.toString()) || '';
      const row = [employeeCode, sanitizeText(emp.name || '')];
      
      // Add empty cells for each date
      dates.forEach(() => row.push(null));
      
      // Grand Total - empty for template
      row.push(null);
      summaryData.push(row);
    });
    
    // Add Grand Total row
    const grandTotalRow = ['', 'Grand Total'];
    dates.forEach(() => grandTotalRow.push(null));
    grandTotalRow.push(null);
    summaryData.push(grandTotalRow);
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    const summaryWidths = [80, 180];
    dates.forEach(() => summaryWidths.push(65));
    summaryWidths.push(85);
    setColumnWidths(summarySheet, summaryWidths);
    // Auto-fit and enforce minimums for Emp ID and Name, and taller header
    summarySheet['!cols'] = autoFitColumns(summaryData);
    if (Array.isArray(summarySheet['!cols'])) {
      summarySheet['!cols'][0] = { ...(summarySheet['!cols'][0] || {}), wch: Math.max(12, summarySheet['!cols'][0]?.wch || 0), wpx: Math.max(90, summarySheet['!cols'][0]?.wpx || 0) };
      // Force Employee Name column to a compact width
      summarySheet['!cols'][1] = { ...(summarySheet['!cols'][1] || {}), wch: 28, wpx: 220 };
    }
    summarySheet['!rows'] = [{ hpx: 36 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Total Hours - Summary');

    // Removed: Hourly (Payroll Breakdown) sheet (per requirements)

    // ========== Sheet 4: OT ==========
    const otData = [['Emp ID', "Employee's Name", 'Overtime Hours', 'RD OT (within first 8hrs)', 'Regular OT', 'Special Non Working Holiday OT', 'Grand Total']];
    
    sortedEmployees.forEach((emp) => {
      const employeeCode = employeeCodeMap.get(emp._id.toString()) || '';
      otData.push([employeeCode, sanitizeText(emp.name || ''), null, null, null, null, null]);
    });
    
    otData.push(['', 'Grand Total', null, null, null, null, null]);
    
    const otSheet = XLSX.utils.aoa_to_sheet(otData);
    setColumnWidths(otSheet, [80, 180, 110, 170, 90, 220, 85]);
    otSheet['!cols'] = autoFitColumns(otData);
    if (Array.isArray(otSheet['!cols'])) {
      otSheet['!cols'][0] = { ...(otSheet['!cols'][0] || {}), wch: Math.max(12, otSheet['!cols'][0]?.wch || 0), wpx: Math.max(90, otSheet['!cols'][0]?.wpx || 0) };
      otSheet['!cols'][1] = { ...(otSheet['!cols'][1] || {}), wch: Math.max(28, otSheet['!cols'][1]?.wch || 0), wpx: Math.max(220, otSheet['!cols'][1]?.wpx || 0) };
    }
    otSheet['!rows'] = [{ hpx: 36 }];
    XLSX.utils.book_append_sheet(wb, otSheet, 'OT');

    // ========== Sheet 5: Special Holiday ==========
    const shHeader = ['Emp ID', "Employee's Name", 'Site Location', 'Total SH'];
    const shData = [shHeader];
    
    sortedEmployees.forEach((emp) => {
      const employeeCode = employeeCodeMap.get(emp._id.toString()) || '';
      let siteLocation = '';
      const deptId = emp.departmentId?.toString ? emp.departmentId.toString() : emp.departmentId;
      if (deptId) {
        const dept = departmentMap.get(deptId);
        if (dept) {
          siteLocation = dept.siteLocation || '';
        }
      }
      shData.push([employeeCode, sanitizeText(emp.name || ''), sanitizeText(siteLocation), null]);
    });
    
    shData.push(['', 'Grand Total', '', null]);
    
    const shSheet = XLSX.utils.aoa_to_sheet(shData);
    setColumnWidths(shSheet, [80, 180, 100, 80]);
    shSheet['!cols'] = autoFitColumns(shData);
    if (Array.isArray(shSheet['!cols'])) {
      shSheet['!cols'][0] = { ...(shSheet['!cols'][0] || {}), wch: Math.max(12, shSheet['!cols'][0]?.wch || 0), wpx: Math.max(90, shSheet['!cols'][0]?.wpx || 0) };
      shSheet['!cols'][1] = { ...(shSheet['!cols'][1] || {}), wch: Math.max(28, shSheet['!cols'][1]?.wch || 0), wpx: Math.max(220, shSheet['!cols'][1]?.wpx || 0) };
    }
    shSheet['!rows'] = [{ hpx: 36 }];
    XLSX.utils.book_append_sheet(wb, shSheet, 'Special Holiday');

    // ========== Sheet 6: SIL_Offset ==========
    const silData = [['Employee ID', 'Employee Name', 'Compensatory Time Off (CTO)', 'PH Holidays _ Not Working on a Regular holiday', 'SIL Credit (Additional based on Tenure)', 'SIL Credits', 'Grand Total']];
    
    sortedEmployees.forEach((emp) => {
      const employeeCode = employeeCodeMap.get(emp._id.toString()) || '';
      silData.push([employeeCode, sanitizeText(emp.name || ''), null, null, null, null, null]);
    });
    
    silData.push([null, 'Grand Total', null, null, null, null, null]);
    
    const silSheet = XLSX.utils.aoa_to_sheet(silData);
    setColumnWidths(silSheet, [90, 180, 180, 280, 240, 80, 85]);
    silSheet['!cols'] = autoFitColumns(silData);
    if (Array.isArray(silSheet['!cols'])) {
      silSheet['!cols'][0] = { ...(silSheet['!cols'][0] || {}), wch: Math.max(12, silSheet['!cols'][0]?.wch || 0), wpx: Math.max(90, silSheet['!cols'][0]?.wpx || 0) };
      silSheet['!cols'][1] = { ...(silSheet['!cols'][1] || {}), wch: Math.max(28, silSheet['!cols'][1]?.wch || 0), wpx: Math.max(220, silSheet['!cols'][1]?.wpx || 0) };
    }
    silSheet['!rows'] = [{ hpx: 36 }];
    XLSX.utils.book_append_sheet(wb, silSheet, 'SIL_Offset');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `Payroll-Template_${now.toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    logActivity(req, {
      actionType: 'export',
      module: 'export',
      entity: 'template',
      status: 'success',
      user: req.user,
      metadata: { fileType: 'xlsx', filename, employees: employees.length },
    });
    res.send(buffer);

  } catch (error) {
    console.error('Export template error:', error);
    logActivity(req, {
      actionType: 'export',
      module: 'export',
      entity: 'template',
      status: 'failure',
      user: req.user,
      errorDetails: error.message,
      errorStack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export timekeeping data as Excel (matching the template format)
router.get('/timekeeping', verifyAdminToken, async (req, res) => {
  try {
    const { cutoffStart, cutoffEnd } = req.query;

    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');
    const employeesCollection = db.collection('employees');

    // Get payroll records - filter by cutoff if provided, otherwise get all
    let query = {};
    if (cutoffStart && cutoffEnd) {
      // Find payroll records where the cutoff period overlaps with the selected date range
      // A payroll overlaps if: payroll.cutoffStart <= filterEnd AND payroll.cutoffEnd >= filterStart
      query = {
        $and: [
          { cutoffStart: { $lte: cutoffEnd } },
          { cutoffEnd: { $gte: cutoffStart } }
        ]
      };
    }
    const payrolls = await payrollCollection.find(query).toArray();
    
    console.log(`Export query:`, JSON.stringify(query));
    console.log(`Found ${payrolls.length} payroll records`);
    
    if (payrolls.length === 0) {
      return res.status(404).json({ error: 'No payroll records found for the selected date range' });
    }

    // Get all employees for reference (include inactive too for payroll lookup)
    const employees = await employeesCollection.find({}).toArray();
    const employeeMap = new Map(employees.map(e => [e._id.toString(), e]));

    // Get all departments for site location lookup
    const departmentsCollection = db.collection('departments');
    const departments = await departmentsCollection.find({}).toArray();
    const departmentMap = new Map(departments.map(d => [d._id.toString(), d]));
    
    // Debug: Log department data
    console.log(`Found ${departments.length} departments`);
    departments.forEach(d => {
      console.log(`  Department: ${d.name} (${d._id.toString()}) - siteLocation: "${d.siteLocation || 'N/A'}"`);
    });

    // Determine date range from payrolls if not provided
    let effectiveStartDate = cutoffStart;
    let effectiveEndDate = cutoffEnd;
    
    if (!cutoffStart || !cutoffEnd) {
      // Find min/max dates from payroll records
      const allDates = payrolls.flatMap(p => [p.cutoffStart, p.cutoffEnd]).filter(Boolean);
      if (allDates.length > 0) {
        effectiveStartDate = allDates.sort()[0];
        effectiveEndDate = allDates.sort().reverse()[0];
      } else {
        // Default to current month if no dates found
        const now = new Date();
        effectiveStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        effectiveEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      }
    }

    // Get dates in the cutoff period
    const dates = getDatesBetween(effectiveStartDate, effectiveEndDate);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Removed: SSS Contribution Table (per requirements)

    // Helper function to get employee from map (handles both string and ObjectId)
    const getEmployee = (employeeId) => {
      const empId = employeeId?.toString ? employeeId.toString() : employeeId;
      return employeeMap.get(empId) || {};
    };

    // ========== Create consistent employee code mapping ==========
    // Sort payrolls alphabetically by employee name first
    const sortedPayrolls = [...payrolls].sort((a, b) => {
      const empA = getEmployee(a.employeeId);
      const empB = getEmployee(b.employeeId);
      const nameA = (a.employeeName || empA.name || '').toLowerCase();
      const nameB = (b.employeeName || empB.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    // Create a map of employeeId -> employeeCode for consistent codes across all sheets
    const employeeCodeMap = new Map();
    sortedPayrolls.forEach((p, index) => {
      const emp = getEmployee(p.employeeId);
      const employeeCode = formatEmployeeCode(p.employeeCode || emp.employeeCode, index + 1);
      const empId = p.employeeId?.toString ? p.employeeId.toString() : p.employeeId;
      employeeCodeMap.set(empId, employeeCode);
    });

    // ========== Sheet 2: Total Hours - Summary ==========
    // Build header: Emp ID, Employee Name, date columns formatted as "16-Oct-", Grand Total
    const summaryHeader = ['Emp ID', 'Employee Name'];
    dates.forEach(d => {
      // Format date as "16-Oct-" (day-month abbreviation with trailing dash)
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      summaryHeader.push(`${day}-${month}-`);
    });
    summaryHeader.push('Grand Total');

    const summaryData = [summaryHeader];
    let overallGrandTotal = 0; // Track total of all worked hours
    
    sortedPayrolls.forEach((p) => {
      const emp = getEmployee(p.employeeId);
      const employeeName = sanitizeText(p.employeeName || emp.name || '');
      const empId = p.employeeId?.toString ? p.employeeId.toString() : p.employeeId;
      
      // Get employee code from the consistent mapping
      const employeeCode = employeeCodeMap.get(empId) || '';
      
      // Start row with Emp ID and Employee Name
      const row = [employeeCode, employeeName];
      
      // Add daily hours for each date (empty if not available)
      let totalHours = 0;
      dates.forEach(d => {
        const dateKey = d.toISOString().split('T')[0];
        const hours = p.dailyHours?.[dateKey];
        if (hours !== undefined && hours !== null && hours !== '') {
          row.push(hours);
          totalHours += parseFloat(hours) || 0;
        } else {
          row.push(null); // Empty cell
        }
      });
      
      // Grand Total - use workedHours from payroll, or totalWorkedHours, or calculated total
      let grandTotal = null;
      
      // Try different field names that might contain worked hours
      // Note: 0 is a valid value, so check for undefined/null specifically
      const workedHoursValue = parseFloat(p.workedHours);
      const totalWorkedHoursValue = parseFloat(p.totalWorkedHours);
      
      if (!isNaN(workedHoursValue)) {
        grandTotal = workedHoursValue;
      } else if (!isNaN(totalWorkedHoursValue)) {
        grandTotal = totalWorkedHoursValue;
      } else if (totalHours > 0) {
        grandTotal = totalHours;
      }
      
      // Add to overall grand total
      if (grandTotal !== null && !isNaN(grandTotal)) {
        overallGrandTotal += grandTotal;
      }
      
      row.push(grandTotal);
      summaryData.push(row);
    });
    
    // Add Grand Total row at the bottom (no empty row, directly after last employee)
    const grandTotalRow = ['', 'Grand Total'];
    // Add empty cells for each date column (since we don't have daily totals)
    dates.forEach(() => grandTotalRow.push(null));
    // Add the overall grand total in the last column
    grandTotalRow.push(overallGrandTotal);
    summaryData.push(grandTotalRow);
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    // Set column widths for Summary sheet (in pixels)
    const summaryWidths = [80, 180]; // Emp ID, Employee Name
    dates.forEach(() => summaryWidths.push(65)); // Date columns
    summaryWidths.push(85); // Grand Total
    setColumnWidths(summarySheet, summaryWidths);
    // Auto-fit and enforce larger minimums for first two columns
    summarySheet['!cols'] = autoFitColumns(summaryData);
    if (Array.isArray(summarySheet['!cols'])) {
      summarySheet['!cols'][0] = { ...(summarySheet['!cols'][0] || {}), wch: Math.max(12, summarySheet['!cols'][0]?.wch || 0), wpx: Math.max(84, summarySheet['!cols'][0]?.wpx || 0) };
      // Force Employee Name column to a compact width
      summarySheet['!cols'][1] = { ...(summarySheet['!cols'][1] || {}), wch: 28, wpx: 220 };
    }
    summarySheet['!rows'] = [{ hpx: 36 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Total Hours - Summary');

    // Removed: Hourly (Payroll Breakdown) sheet (per requirements)

    // ========== Sheet 4: OT ==========
    const otData = [['Emp ID', "Employee's Name", 'Overtime Hours', 'RD OT (within first 8hrs)', 'Regular OT', 'Special Non Working Holiday OT', 'Grand Total']];
    
    // Track totals for Grand Total row
    let totalOvertimeHours = 0, totalRestDayOT = 0, totalRegularOT = 0, totalSpecialHolidayOT = 0, totalOTGrand = 0;
    
    // Include ALL employees, sorted alphabetically (using same order as Total Hours - Summary)
    sortedPayrolls.forEach((p) => {
      const emp = getEmployee(p.employeeId);
      const empId = p.employeeId?.toString ? p.employeeId.toString() : p.employeeId;
      
      // Get employee code from the consistent mapping
      const employeeCode = employeeCodeMap.get(empId) || '';
      
      const overtimeHours = parseFloat(p.overtimeHours) || 0;
      const restDayOT = parseFloat(p.restDayOT) || 0;
      const regularOT = parseFloat(p.regularOT) || 0;
      const specialHolidayOT = parseFloat(p.specialHolidayOT) || 0;
      const rowTotal = overtimeHours + restDayOT + regularOT + specialHolidayOT;
      
      // Accumulate totals
      totalOvertimeHours += overtimeHours;
      totalRestDayOT += restDayOT;
      totalRegularOT += regularOT;
      totalSpecialHolidayOT += specialHolidayOT;
      totalOTGrand += rowTotal;
      
      otData.push([
        employeeCode,
        sanitizeText(p.employeeName || emp.name || ''),
        overtimeHours || null,
        restDayOT || null,
        regularOT || null,
        specialHolidayOT || null,
        rowTotal || null
      ]);
    });
    
    // Add Grand Total row at the bottom
    otData.push([
      '',
      'Grand Total',
      totalOvertimeHours || null,
      totalRestDayOT || null,
      totalRegularOT || null,
      totalSpecialHolidayOT || null,
      totalOTGrand || null
    ]);
    
    const otSheet = XLSX.utils.aoa_to_sheet(otData);
    // Set column widths for OT sheet (in pixels)
    setColumnWidths(otSheet, [80, 180, 110, 170, 90, 220, 85]);
    otSheet['!cols'] = autoFitColumns(otData);
    if (Array.isArray(otSheet['!cols'])) {
      otSheet['!cols'][0] = { ...(otSheet['!cols'][0] || {}), wch: Math.max(12, otSheet['!cols'][0]?.wch || 0), wpx: Math.max(84, otSheet['!cols'][0]?.wpx || 0) };
      otSheet['!cols'][1] = { ...(otSheet['!cols'][1] || {}), wch: Math.max(28, otSheet['!cols'][1]?.wch || 0), wpx: Math.max(220, otSheet['!cols'][1]?.wpx || 0) };
    }
    otSheet['!rows'] = [{ hpx: 36 }];
    XLSX.utils.book_append_sheet(wb, otSheet, 'OT');

    // ========== Sheet 5: Special Holiday ==========
    // Collect all unique special holiday dates from payroll records
    const specialHolidayDates = new Set();
    sortedPayrolls.forEach((p) => {
      if (p.specialHolidayDates && typeof p.specialHolidayDates === 'object') {
        Object.keys(p.specialHolidayDates).forEach(date => specialHolidayDates.add(date));
      }
    });
    
    // Sort dates chronologically
    const sortedSHDates = Array.from(specialHolidayDates).sort();
    
    // Build header: Emp ID, Employee's Name, Site Location, [date columns], Total SH
    const shHeader = ['Emp ID', "Employee's Name", 'Site Location'];
    
    // Add date columns - convert to Excel serial numbers for proper date display
    sortedSHDates.forEach(dateStr => {
      const date = new Date(dateStr);
      const excelSerial = excelDateSerial(date);
      shHeader.push(excelSerial);
    });
    shHeader.push('Total SH');
    
    const shData = [shHeader];
    
    // Track column totals
    const columnTotals = new Array(sortedSHDates.length).fill(0);
    let totalSH = 0;
    
    // Include ALL employees, sorted alphabetically
    sortedPayrolls.forEach((p) => {
      const emp = getEmployee(p.employeeId);
      const empId = p.employeeId?.toString ? p.employeeId.toString() : p.employeeId;
      const employeeCode = employeeCodeMap.get(empId) || '';
      
      // Get site location from department
      let siteLocation = '';
      const deptId = emp.departmentId?.toString ? emp.departmentId.toString() : emp.departmentId;
      if (deptId) {
        const dept = departmentMap.get(deptId);
        if (dept) {
          siteLocation = dept.siteLocation || '';
        }
      }
      // Fallback to payroll or employee siteLocation if department lookup fails
      if (!siteLocation) {
        siteLocation = p.siteLocation || emp.siteLocation || '';
      }
      
      // Debug log for first few employees
      if (shData.length <= 3) {
        console.log(`Special Holiday - Employee: ${p.employeeName}, empId: ${empId}, deptId: ${deptId}, siteLocation: "${siteLocation}"`);
      }
      
      const row = [
        employeeCode,
        sanitizeText(p.employeeName || emp.name || ''),
        sanitizeText(siteLocation)
      ];
      
      // Add hours for each special holiday date
      let employeeTotalSH = 0;
      sortedSHDates.forEach((dateStr, idx) => {
        const hours = p.specialHolidayDates?.[dateStr];
        const hoursValue = parseFloat(hours) || 0;
        row.push(hoursValue > 0 ? hoursValue : null);
        employeeTotalSH += hoursValue;
        columnTotals[idx] += hoursValue;
      });
      
      // If no specific dates, use the total specialHolidayHours field
      if (sortedSHDates.length === 0 && p.specialHolidayHours) {
        employeeTotalSH = parseFloat(p.specialHolidayHours) || 0;
      }
      
      row.push(employeeTotalSH > 0 ? employeeTotalSH : null);
      totalSH += employeeTotalSH;
      
      shData.push(row);
    });
    
    // Add Grand Total row
    const grandTotalSHRow = ['', 'Grand Total', ''];
    columnTotals.forEach(total => grandTotalSHRow.push(total > 0 ? total : null));
    grandTotalSHRow.push(totalSH > 0 ? totalSH : null);
    shData.push(grandTotalSHRow);
    
    const shSheet = XLSX.utils.aoa_to_sheet(shData);
    
    // Set column widths for Special Holiday sheet (in pixels)
    const shWidths = [80, 180, 100]; // Emp ID, Name, Site Location
    sortedSHDates.forEach(() => shWidths.push(70)); // Date columns
    shWidths.push(80); // Total SH
    setColumnWidths(shSheet, shWidths);
    shSheet['!cols'] = autoFitColumns(shData);
    if (Array.isArray(shSheet['!cols'])) {
      shSheet['!cols'][0] = { ...(shSheet['!cols'][0] || {}), wch: Math.max(12, shSheet['!cols'][0]?.wch || 0), wpx: Math.max(84, shSheet['!cols'][0]?.wpx || 0) };
      shSheet['!cols'][1] = { ...(shSheet['!cols'][1] || {}), wch: Math.max(28, shSheet['!cols'][1]?.wch || 0), wpx: Math.max(220, shSheet['!cols'][1]?.wpx || 0) };
    }
    shSheet['!rows'] = [{ hpx: 36 }];
    
    // Format date columns as dates (columns starting from index 3)
    if (sortedSHDates.length > 0) {
      // Set the cell format for header date cells to display as dates
      sortedSHDates.forEach((_, idx) => {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: 3 + idx });
        if (shSheet[cellRef]) {
          shSheet[cellRef].t = 'n'; // number type
          shSheet[cellRef].z = 'D-MMM'; // date format like "16-Oct"
        }
      });
    }
    
    XLSX.utils.book_append_sheet(wb, shSheet, 'Special Holiday');

    // ========== Sheet 6: SIL_Offset ==========
    // Header matches template format exactly
    const silData = [['Employee ID', 'Employee Name', 'Compensatory Time Off (CTO)', 'PH Holidays _ Not Working on a Regular holiday', 'SIL Credit (Additional based on Tenure)', 'SIL Credits', 'Grand Total']];
    let totalCTO = 0, totalPHHoliday = 0, totalSILTenure = 0, totalSILCredits = 0, totalSILGrand = 0;
    
    // Only include employees who have SIL/Offset data (at least one non-zero value)
    sortedPayrolls.forEach((p) => {
      const emp = getEmployee(p.employeeId);
      const empId = p.employeeId?.toString ? p.employeeId.toString() : p.employeeId;
      const employeeCode = employeeCodeMap.get(empId) || '';
      
      const cto = parseFloat(p.ctoHours) || 0;
      const phHoliday = parseFloat(p.phHolidayNotWorking) || 0;
      const silTenure = parseFloat(p.silTenureCredits) || 0;
      const silCredits = parseFloat(p.silCredits) || 0;
      const rowTotal = cto + phHoliday + silTenure + silCredits;
      
      // Accumulate totals
      totalCTO += cto;
      totalPHHoliday += phHoliday;
      totalSILTenure += silTenure;
      totalSILCredits += silCredits;
      totalSILGrand += rowTotal;
      
      // Include ALL employees (show null for zero values)
      silData.push([
        employeeCode,
        sanitizeText(p.employeeName || emp.name || ''),
        cto > 0 ? cto : null,
        phHoliday > 0 ? phHoliday : null,
        silTenure > 0 ? silTenure : null,
        silCredits > 0 ? silCredits : null,
        rowTotal > 0 ? rowTotal : null
      ]);
    });
    
    // Add Grand Total row
    silData.push([
      null,
      'Grand Total',
      totalCTO > 0 ? totalCTO : null,
      totalPHHoliday > 0 ? totalPHHoliday : null,
      totalSILTenure > 0 ? totalSILTenure : null,
      totalSILCredits > 0 ? totalSILCredits : null,
      totalSILGrand > 0 ? totalSILGrand : null
    ]);
    
    const silSheet = XLSX.utils.aoa_to_sheet(silData);
    // Set column widths for SIL_Offset sheet (in pixels)
    setColumnWidths(silSheet, [90, 180, 180, 280, 240, 80, 85]);
    silSheet['!cols'] = autoFitColumns(silData);
    if (Array.isArray(silSheet['!cols'])) {
      silSheet['!cols'][0] = { ...(silSheet['!cols'][0] || {}), wch: Math.max(12, silSheet['!cols'][0]?.wch || 0), wpx: Math.max(84, silSheet['!cols'][0]?.wpx || 0) };
      silSheet['!cols'][1] = { ...(silSheet['!cols'][1] || {}), wch: Math.max(28, silSheet['!cols'][1]?.wch || 0), wpx: Math.max(220, silSheet['!cols'][1]?.wpx || 0) };
    }
    silSheet['!rows'] = [{ hpx: 36 }];
    XLSX.utils.book_append_sheet(wb, silSheet, 'SIL_Offset');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `Timekeeping-Data_${effectiveStartDate}_to_${effectiveEndDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    logActivity(req, {
      actionType: 'export',
      module: 'export',
      entity: 'timekeeping',
      status: 'success',
      user: req.user,
      metadata: {
        fileType: 'xlsx',
        filename,
        cutoffStart: effectiveStartDate,
        cutoffEnd: effectiveEndDate,
        payrollCount: payrolls.length,
      },
    });
    res.send(buffer);

  } catch (error) {
    console.error('Export timekeeping error:', error);
    logActivity(req, {
      actionType: 'export',
      module: 'export',
      entity: 'timekeeping',
      status: 'failure',
      user: req.user,
      errorDetails: error.message,
      errorStack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper to convert JS Date to Excel serial number
function excelDateSerial(date) {
  const epoch = new Date(1899, 11, 30);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((date - epoch) / msPerDay);
}

// Import timekeeping data from Excel - parse and return data for preview
router.post('/import-preview', verifyAdminToken, async (req, res) => {
  try {
    if (!req.body || !req.body.fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    // Decode base64 file data
    const buffer = Buffer.from(req.body.fileData, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const result = {
      sheets: {},
      sheetNames: workbook.SheetNames
    };

    // Parse each sheet
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      // Get headers (first row)
      const headers = jsonData[0] || [];
      
      // Get data rows (skip header)
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));
      
      result.sheets[sheetName] = {
        headers,
        rows,
        rowCount: rows.length
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Import preview error:', error);
    res.status(500).json({ error: 'Failed to parse Excel file: ' + error.message });
  }
});

// Import timekeeping data and create/update payroll records
router.post('/import', verifyAdminToken, async (req, res) => {
  try {
    const { fileData, cutoffStart, cutoffEnd, fileName } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const client = await clientPromise;
    const db = client.db();
    const importedPayrollsCollection = db.collection('importedPayrolls');

    // First, save the imported payroll file
    const buffer = Buffer.from(fileData, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Parse all sheets
    const sheets = {};
    const sheetNames = workbook.SheetNames;
    let employeeCount = 0;

    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      const headers = jsonData[0] || [];
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));
      
      sheets[sheetName] = {
        headers,
        rows,
        rowCount: rows.length
      };
      
      // Count employees from Total Hours - Summary sheet
      if (sheetName === 'Total Hours - Summary') {
        employeeCount = rows.filter(row => row[1] && row[1] !== 'Grand Total').length;
      }
    });

    // Infer cutoff from the Summary sheet when available
    const summaryHeaders = sheets['Total Hours - Summary']?.headers || [];
    const fallbackYear = cutoffStart ? parseInt(String(cutoffStart).split('-')[0], 10) : undefined;
    const inferredCutoff = inferCutoffFromSummaryHeaders(summaryHeaders, fallbackYear);
    const effectiveCutoffStart = inferredCutoff.cutoffStart || cutoffStart;
    const effectiveCutoffEnd = inferredCutoff.cutoffEnd || cutoffEnd;

    if (!effectiveCutoffStart || !effectiveCutoffEnd) {
      return res.status(400).json({ error: 'Cutoff dates are required' });
    }

    // Create the imported payroll record
    const importedPayroll = {
      fileName: fileName || `Payroll_${effectiveCutoffStart}_to_${effectiveCutoffEnd}`,
      cutoffStart: effectiveCutoffStart,
      cutoffEnd: effectiveCutoffEnd,
      sheets,
      sheetNames,
      employeeCount,
      status: 'imported',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const importResult = await importedPayrollsCollection.insertOne(importedPayroll);
    const importedPayrollFileId = importResult.insertedId.toString();

    // Return success without processing - user must click "Process All" button
    res.status(201).json({
      success: true,
      message: `File "${importedPayroll.fileName}" saved successfully with ${employeeCount} employees. Click "Process All" to process the payroll.`,
      importedPayroll: {
        id: importedPayrollFileId,
        ...importedPayroll
      }
    });
    
    logActivity(req, {
      actionType: 'import',
      module: 'payroll',
      entity: 'importedPayroll',
      status: 'success',
      user: req.user,
      metadata: {
        cutoffStart: effectiveCutoffStart,
        cutoffEnd: effectiveCutoffEnd,
        importedPayrollFileId: importedPayrollFileId,
        fileName: importedPayroll.fileName,
        employeeCount: employeeCount,
        httpStatus: 201
      },
      errorDetails: null,
    });
  } catch (error) {
    console.error('Import error:', error);
    logActivity(req, {
      actionType: 'import',
      module: 'payroll',
      entity: 'importedPayroll',
      status: 'failure',
      user: req.user,
      errorDetails: error.message,
      errorStack: error.stack,
    });
    res.status(500).json({ error: 'Failed to import data: ' + error.message });
  }
});

// ========== IMPORTED PAYROLL FILES MANAGEMENT ==========

// Save imported Excel file as a payroll record (stores all sheets)
router.post('/imported-payrolls', verifyAdminToken, async (req, res) => {
  try {
    const { fileData, cutoffStart, cutoffEnd, fileName } = req.body;
    
    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }
    
    const client = await clientPromise;
    const db = client.db();
    const importedPayrollsCollection = db.collection('importedPayrolls');

    // Decode base64 file data and parse Excel
    const buffer = Buffer.from(fileData, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Parse all sheets
    const sheets = {};
    const sheetNames = workbook.SheetNames;
    let employeeCount = 0;

    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      
      const headers = jsonData[0] || [];
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== ''));
      
      sheets[sheetName] = {
        headers,
        rows,
        rowCount: rows.length
      };
      
      // Count employees from Total Hours - Summary sheet
      if (sheetName === 'Total Hours - Summary') {
        employeeCount = rows.filter(row => row[1] && row[1] !== 'Grand Total').length;
      }
    });

    // Infer cutoff from the Summary sheet when available.
    const summaryHeaders = sheets['Total Hours - Summary']?.headers || [];
    const fallbackYear = cutoffStart ? parseInt(String(cutoffStart).split('-')[0], 10) : undefined;
    const inferredCutoff = inferCutoffFromSummaryHeaders(summaryHeaders, fallbackYear);
    const effectiveCutoffStart = inferredCutoff.cutoffStart || cutoffStart;
    const effectiveCutoffEnd = inferredCutoff.cutoffEnd || cutoffEnd;

    if (!effectiveCutoffStart || !effectiveCutoffEnd) {
      return res.status(400).json({ error: 'Cutoff dates are required' });
    }

    // Create the imported payroll record
    const importedPayroll = {
      fileName: fileName || `Payroll_${effectiveCutoffStart}_to_${effectiveCutoffEnd}`,
      cutoffStart: effectiveCutoffStart,
      cutoffEnd: effectiveCutoffEnd,
      sheets,
      sheetNames,
      employeeCount,
      status: 'imported',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await importedPayrollsCollection.insertOne(importedPayroll);
    
    res.json({
      success: true,
      message: `Payroll file saved successfully with ${employeeCount} employees`,
      importedPayroll: {
        id: result.insertedId.toString(),
        ...importedPayroll
      }
    });
    logActivity(req, {
      actionType: 'create',
      module: 'payroll',
      entity: 'importedPayroll',
      status: 'success',
      user: req.user,
      recordId: result.insertedId.toString(),
      metadata: {
        fileName: importedPayroll.fileName,
        employeeCount,
        cutoffStart: effectiveCutoffStart,
        cutoffEnd: effectiveCutoffEnd,
      },
    });
  } catch (error) {
    console.error('Save imported payroll error:', error);
    logActivity(req, {
      actionType: 'create',
      module: 'payroll',
      entity: 'importedPayroll',
      status: 'failure',
      user: req.user,
      errorDetails: error.message,
      errorStack: error.stack,
    });
    res.status(500).json({ error: 'Failed to save imported payroll: ' + error.message });
  }
});

// Get all imported payroll files
router.get('/imported-payrolls', verifyAdminToken, async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const importedPayrollsCollection = db.collection('importedPayrolls');

    // Get all imported payrolls, sorted by creation date (newest first)
    // Don't include the full sheets data in the list (too large)
    const importedPayrolls = await importedPayrollsCollection
      .find({})
      .project({
        fileName: 1,
        cutoffStart: 1,
        cutoffEnd: 1,
        sheetNames: 1,
        employeeCount: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Transform _id to id
    const transformed = importedPayrolls.map(p => ({
      id: p._id.toString(),
      fileName: p.fileName,
      cutoffStart: p.cutoffStart,
      cutoffEnd: p.cutoffEnd,
      sheetNames: p.sheetNames,
      employeeCount: p.employeeCount,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    res.json({ success: true, importedPayrolls: transformed });
  } catch (error) {
    console.error('Get imported payrolls error:', error);
    res.status(500).json({ error: 'Failed to get imported payrolls: ' + error.message });
  }
});

// Get a single imported payroll file with all sheets data
router.get('/imported-payrolls/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid payroll ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const importedPayrollsCollection = db.collection('importedPayrolls');

    const importedPayroll = await importedPayrollsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!importedPayroll) {
      return res.status(404).json({ error: 'Imported payroll not found' });
    }

    res.json({
      success: true,
      importedPayroll: {
        id: importedPayroll._id.toString(),
        fileName: importedPayroll.fileName,
        cutoffStart: importedPayroll.cutoffStart,
        cutoffEnd: importedPayroll.cutoffEnd,
        sheets: importedPayroll.sheets,
        sheetNames: importedPayroll.sheetNames,
        employeeCount: importedPayroll.employeeCount,
        status: importedPayroll.status,
        createdAt: importedPayroll.createdAt,
        updatedAt: importedPayroll.updatedAt
      }
    });
  } catch (error) {
    console.error('Get imported payroll error:', error);
    res.status(500).json({ error: 'Failed to get imported payroll: ' + error.message });
  }
});

// Delete an imported payroll file
router.delete('/imported-payrolls/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid payroll ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const importedPayrollsCollection = db.collection('importedPayrolls');

    const result = await importedPayrollsCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Imported payroll not found' });
    }

    res.json({ success: true, message: 'Imported payroll deleted successfully' });
    logActivity(req, {
      actionType: 'delete',
      module: 'payroll',
      entity: 'importedPayroll',
      status: 'success',
      user: req.user,
      recordId: id,
    });
  } catch (error) {
    console.error('Delete imported payroll error:', error);
    logActivity(req, {
      actionType: 'delete',
      module: 'payroll',
      entity: 'importedPayroll',
      status: 'failure',
      user: req.user,
      recordId: req.params?.id || null,
      errorDetails: error.message,
      errorStack: error.stack,
    });
    res.status(500).json({ error: 'Failed to delete imported payroll: ' + error.message });
  }
});

// Export a specific imported payroll back to Excel
router.get('/imported-payrolls/:id/export', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid payroll ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const importedPayrollsCollection = db.collection('importedPayrolls');

    const importedPayroll = await importedPayrollsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!importedPayroll) {
      return res.status(404).json({ error: 'Imported payroll not found' });
    }

    // Create workbook from stored sheets
    const wb = XLSX.utils.book_new();
    
    // Helper: auto-fit columns from AOA data
    const autoFitFromData = (aoa) => {
      const colCount = aoa.reduce((m, r) => Math.max(m, r.length), 0);
      const min = 8, max = 60, pad = 2;
      const widths = new Array(colCount).fill(min);
      const strlen = (v) => {
        if (v === null || v === undefined) return 0;
        if (typeof v === 'string') return v.length;
        if (typeof v === 'number') return String(v).length;
        return String(v).length;
      };
      for (const row of aoa) {
        for (let c = 0; c < colCount; c++) {
          widths[c] = Math.min(max, Math.max(widths[c], strlen(row[c]) + pad));
        }
      }
      // Provide both character and pixel widths for best compatibility
      return widths.map(w => ({ wch: w, wpx: Math.round(w * 7 + 5) }));
    };

    // Helper: sanitize AOA, remove embedded newlines that cause wrapped cells
    const sanitizeAOA = (aoa) => aoa.map(row => row.map(val => {
      if (typeof val === 'string') {
        // Replace CR/LF with space and collapse multiple spaces
        return val.replace(/\r?\n/g, ' ').replace(/\s{2,}/g, ' ').trim();
      }
      return val;
    }));

    importedPayroll.sheetNames
      .filter(name => name !== 'SSS Contribution Table' && name !== 'Hourly')
      .forEach(sheetName => {
      const sheetData = importedPayroll.sheets[sheetName];
      if (sheetData) {
        // Combine headers and rows
        const dataRaw = [sheetData.headers, ...sheetData.rows];
        const data = sanitizeAOA(dataRaw);
        const ws = XLSX.utils.aoa_to_sheet(data);
        // Auto-fit columns and make header taller for readability
        ws['!cols'] = autoFitFromData(data);
        // Ensure first two columns have reasonable minimums (Emp ID, Employee Name)
        if (Array.isArray(ws['!cols'])) {
          ws['!cols'][0] = { ...(ws['!cols'][0] || {}), wch: Math.max(12, ws['!cols'][0]?.wch || 0), wpx: Math.max(90, ws['!cols'][0]?.wpx || 0) };
          // Force Employee Name column to a compact width like other exports
          ws['!cols'][1] = { ...(ws['!cols'][1] || {}), wch: 28, wpx: 220 };
        }
        ws['!rows'] = [{ hpx: 36 }];
        // If Special Holiday sheet, format header date columns as dates
        if (sheetName === 'Special Holiday' && Array.isArray(sheetData.headers)) {
          for (let i = 3; i < sheetData.headers.length - 1; i++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
            const headerVal = sheetData.headers[i];
            if (ws[cellRef] && typeof headerVal === 'number') {
              ws[cellRef].t = 'n';
              ws[cellRef].z = 'D-MMM';
            }
          }
        }
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `${importedPayroll.fileName}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    logActivity(req, {
      actionType: 'export',
      module: 'payroll',
      entity: 'importedPayroll',
      status: 'success',
      user: req.user,
      recordId: id,
      metadata: { fileType: 'xlsx', filename },
    });
    res.send(buffer);
  } catch (error) {
    console.error('Export imported payroll error:', error);
    logActivity(req, {
      actionType: 'export',
      module: 'payroll',
      entity: 'importedPayroll',
      status: 'failure',
      user: req.user,
      recordId: req.params?.id || null,
      errorDetails: error.message,
      errorStack: error.stack,
    });
    res.status(500).json({ error: 'Failed to export imported payroll: ' + error.message });
  }
});

module.exports = router;
