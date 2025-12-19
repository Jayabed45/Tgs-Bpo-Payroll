const express = require('express');
const { ObjectId } = require('mongodb');
const { clientPromise } = require('../config/database');
const XLSX = require('xlsx');

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

    // ========== Sheet 1: SSS Contribution Table ==========
    const sssData = [['Range of Compensation', '', 'EE Contribution', 'ER']];
    SSS_TABLE.forEach(row => {
      sssData.push([row.min, row.max, row.ee, row.er]);
    });
    const sssSheet = XLSX.utils.aoa_to_sheet(sssData);
    // Set column widths for SSS sheet (in pixels)
    setColumnWidths(sssSheet, [140, 100, 110, 80]);
    XLSX.utils.book_append_sheet(wb, sssSheet, 'SSS Contribution Table');

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
      let employeeCode = p.employeeCode || emp.employeeCode || '';
      if (!employeeCode) {
        // Generate a code like "EMP001", "EMP002", etc. based on sorted order
        employeeCode = `EMP${String(index + 1).padStart(3, '0')}`;
      }
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
      const employeeName = p.employeeName || emp.name || '';
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
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Total Hours - Summary');

    // ========== Sheet 3: Hourly (Payroll Breakdown) ==========
    // Build header row with employee names
    const hourlyHeader = ['TGS BPO', ''];
    payrolls.forEach(p => {
      const emp = getEmployee(p.employeeId);
      hourlyHeader.push(p.employeeName || emp.name || '');
    });
    
    const hourlyData = [hourlyHeader];
    
    // Row 2: Position/Role
    const roleRow = ['', 'Official Role:'];
    payrolls.forEach(p => {
      const emp = getEmployee(p.employeeId);
      roleRow.push(emp.position || '');
    });
    hourlyData.push(roleRow);
    
    // Row 3: Site Location
    const siteRow = ['', 'Site Location:'];
    payrolls.forEach(p => {
      const emp = getEmployee(p.employeeId);
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
      siteRow.push(siteLocation);
    });
    hourlyData.push(siteRow);
    
    // Row 4: Cutoff Period
    const cutoffRow = ['', 'Cutoff Period:'];
    payrolls.forEach(p => {
      cutoffRow.push(`${p.cutoffStart || ''} to ${p.cutoffEnd || ''}`);
    });
    hourlyData.push(cutoffRow);
    
    // Empty row
    hourlyData.push([]);
    
    // Payroll breakdown rows
    const basicSalaryRow = ['Basic Salary', 'Php'];
    payrolls.forEach(p => basicSalaryRow.push(p.basicSalary || 0));
    hourlyData.push(basicSalaryRow);
    
    const workedHoursRow = ['Worked Hours', 'hrs'];
    payrolls.forEach(p => workedHoursRow.push(p.workedHours || 0));
    hourlyData.push(workedHoursRow);
    
    const overtimeRow = ['Overtime Hours', 'hrs'];
    payrolls.forEach(p => overtimeRow.push(p.overtimeHours || 0));
    hourlyData.push(overtimeRow);
    
    const holidayPayRow = ['Holiday Pay', 'Php'];
    payrolls.forEach(p => holidayPayRow.push(p.holidayPay || 0));
    hourlyData.push(holidayPayRow);
    
    const nightDiffRow = ['Night Differential', 'Php'];
    payrolls.forEach(p => nightDiffRow.push(p.nightDifferential || 0));
    hourlyData.push(nightDiffRow);
    
    const salaryAdjRow = ['Salary Adjustment', 'Php'];
    payrolls.forEach(p => salaryAdjRow.push(p.salaryAdjustment || 0));
    hourlyData.push(salaryAdjRow);
    
    // Empty row before deductions
    hourlyData.push([]);
    hourlyData.push(['DEDUCTIONS', '']);
    
    const absencesRow = ['Absences', 'Php'];
    payrolls.forEach(p => absencesRow.push(p.absences || 0));
    hourlyData.push(absencesRow);
    
    const lateRow = ['Late Deductions', 'Php'];
    payrolls.forEach(p => lateRow.push(p.lateDeductions || 0));
    hourlyData.push(lateRow);
    
    const sssRow = ['SSS Contribution', 'Php'];
    payrolls.forEach(p => sssRow.push(p.sssContribution || 0));
    hourlyData.push(sssRow);
    
    const philhealthRow = ['PhilHealth', 'Php'];
    payrolls.forEach(p => philhealthRow.push(p.philhealthContribution || 0));
    hourlyData.push(philhealthRow);
    
    const pagibigRow = ['Pag-IBIG', 'Php'];
    payrolls.forEach(p => pagibigRow.push(p.pagibigContribution || 0));
    hourlyData.push(pagibigRow);
    
    const taxRow = ['Withholding Tax', 'Php'];
    payrolls.forEach(p => taxRow.push(p.withholdingTax || 0));
    hourlyData.push(taxRow);
    
    // Empty row before totals
    hourlyData.push([]);
    hourlyData.push(['SUMMARY', '']);
    
    const grossPayRow = ['Gross Pay', 'Php'];
    payrolls.forEach(p => grossPayRow.push(p.grossPay || 0));
    hourlyData.push(grossPayRow);
    
    const totalDeductionsRow = ['Total Deductions', 'Php'];
    payrolls.forEach(p => totalDeductionsRow.push(p.totalDeductions || 0));
    hourlyData.push(totalDeductionsRow);
    
    const netPayRow = ['Net Pay', 'Php'];
    payrolls.forEach(p => netPayRow.push(p.netPay || 0));
    hourlyData.push(netPayRow);
    
    const statusRow = ['Status', ''];
    payrolls.forEach(p => statusRow.push(p.status || 'pending'));
    hourlyData.push(statusRow);
    
    const hourlySheet = XLSX.utils.aoa_to_sheet(hourlyData);
    // Set column widths for Hourly sheet (in pixels)
    const hourlyWidths = [140, 50]; // Row label, Unit
    payrolls.forEach(() => hourlyWidths.push(120)); // Employee columns
    setColumnWidths(hourlySheet, hourlyWidths);
    XLSX.utils.book_append_sheet(wb, hourlySheet, 'Hourly');

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
        p.employeeName || emp.name || '',
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
        p.employeeName || emp.name || '',
        siteLocation
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
        p.employeeName || emp.name || '',
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
    XLSX.utils.book_append_sheet(wb, silSheet, 'SIL_Offset');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `Timekeeping-Data_${effectiveStartDate}_to_${effectiveEndDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Export timekeeping error:', error);
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
    const { fileData, cutoffStart, cutoffEnd } = req.body;
    
    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');
    const employeesCollection = db.collection('employees');

    // Decode base64 file data
    const buffer = Buffer.from(fileData, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get all employees for matching
    const employees = await employeesCollection.find({}).toArray();
    const employeeByName = new Map();
    const employeeByCode = new Map();
    employees.forEach(emp => {
      employeeByName.set(emp.name?.toLowerCase(), emp);
      if (emp.employeeCode) {
        employeeByCode.set(emp.employeeCode, emp);
      }
    });

    const results = {
      created: 0,
      updated: 0,
      errors: [],
      processed: []
    };

    // Process "Total Hours - Summary" sheet for daily hours
    const summarySheet = workbook.Sheets['Total Hours - Summary'];
    if (summarySheet) {
      const summaryData = XLSX.utils.sheet_to_json(summarySheet, { header: 1, defval: '' });
      const headers = summaryData[0] || [];
      
      // Find date columns (columns between Employee Name and Grand Total)
      const dateColumns = [];
      for (let i = 2; i < headers.length - 1; i++) {
        const header = headers[i];
        if (header && typeof header === 'string' && header.match(/^\d+-[A-Za-z]+-?$/)) {
          dateColumns.push({ index: i, header });
        }
      }

      // Process each employee row
      for (let rowIdx = 1; rowIdx < summaryData.length; rowIdx++) {
        const row = summaryData[rowIdx];
        if (!row || !row[1] || row[1] === 'Grand Total') continue;

        const empCode = row[0];
        const empName = row[1];
        
        // Find employee
        let employee = employeeByCode.get(empCode) || employeeByName.get(empName?.toLowerCase());
        
        if (!employee) {
          results.errors.push(`Employee not found: ${empName} (${empCode})`);
          continue;
        }

        // Build daily hours object
        const dailyHours = {};
        let totalWorkedHours = 0;
        dateColumns.forEach(col => {
          const hours = parseFloat(row[col.index]) || 0;
          if (hours > 0) {
            // Parse date from header (e.g., "16-Oct-" -> "2025-10-16")
            const dateMatch = col.header.match(/^(\d+)-([A-Za-z]+)/);
            if (dateMatch) {
              const day = dateMatch[1].padStart(2, '0');
              const monthName = dateMatch[2];
              const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
              const month = monthMap[monthName] || '01';
              const year = cutoffStart ? cutoffStart.split('-')[0] : new Date().getFullYear();
              const dateKey = `${year}-${month}-${day}`;
              dailyHours[dateKey] = hours;
              totalWorkedHours += hours;
            }
          }
        });

        // Grand Total from last column
        const grandTotal = parseFloat(row[headers.length - 1]) || totalWorkedHours;

        results.processed.push({
          employeeId: employee._id.toString(),
          employeeName: employee.name,
          employeeCode: empCode,
          dailyHours,
          workedHours: grandTotal
        });
      }
    }

    // Process "OT" sheet for overtime data
    const otSheet = workbook.Sheets['OT'];
    if (otSheet) {
      const otData = XLSX.utils.sheet_to_json(otSheet, { header: 1, defval: '' });
      
      for (let rowIdx = 1; rowIdx < otData.length; rowIdx++) {
        const row = otData[rowIdx];
        if (!row || !row[1] || row[1] === 'Grand Total') continue;

        const empCode = row[0];
        const empName = row[1];
        
        // Find in processed array
        const processed = results.processed.find(p => 
          p.employeeCode === empCode || p.employeeName?.toLowerCase() === empName?.toLowerCase()
        );
        
        if (processed) {
          processed.overtimeHours = parseFloat(row[2]) || 0;
          processed.restDayOT = parseFloat(row[3]) || 0;
          processed.regularOT = parseFloat(row[4]) || 0;
          processed.specialHolidayOT = parseFloat(row[5]) || 0;
        }
      }
    }

    // Process "Special Holiday" sheet
    const shSheet = workbook.Sheets['Special Holiday'];
    if (shSheet) {
      const shData = XLSX.utils.sheet_to_json(shSheet, { header: 1, defval: '' });
      const headers = shData[0] || [];
      
      // Find date columns (after Site Location, before Total SH)
      const dateColumns = [];
      for (let i = 3; i < headers.length - 1; i++) {
        const header = headers[i];
        // Check if it's a date (could be Excel serial number or string)
        if (header && (typeof header === 'number' || (typeof header === 'string' && header.match(/^\d/)))) {
          dateColumns.push({ index: i, header });
        }
      }

      for (let rowIdx = 1; rowIdx < shData.length; rowIdx++) {
        const row = shData[rowIdx];
        if (!row || !row[1] || row[1] === 'Grand Total') continue;

        const empCode = row[0];
        const empName = row[1];
        
        const processed = results.processed.find(p => 
          p.employeeCode === empCode || p.employeeName?.toLowerCase() === empName?.toLowerCase()
        );
        
        if (processed) {
          processed.siteLocation = row[2] || '';
          processed.specialHolidayDates = {};
          
          dateColumns.forEach(col => {
            const hours = parseFloat(row[col.index]) || 0;
            if (hours > 0) {
              // Convert Excel serial to date if needed
              let dateKey;
              if (typeof col.header === 'number') {
                const date = new Date((col.header - 25569) * 86400 * 1000);
                dateKey = date.toISOString().split('T')[0];
              } else {
                dateKey = col.header;
              }
              processed.specialHolidayDates[dateKey] = hours;
            }
          });
          
          processed.specialHolidayHours = parseFloat(row[headers.length - 1]) || 0;
        }
      }
    }

    // Process "SIL_Offset" sheet
    const silSheet = workbook.Sheets['SIL_Offset'];
    if (silSheet) {
      const silData = XLSX.utils.sheet_to_json(silSheet, { header: 1, defval: '' });
      
      for (let rowIdx = 1; rowIdx < silData.length; rowIdx++) {
        const row = silData[rowIdx];
        if (!row || !row[1] || row[1] === 'Grand Total') continue;

        const empCode = row[0];
        const empName = row[1];
        
        const processed = results.processed.find(p => 
          p.employeeCode === empCode || p.employeeName?.toLowerCase() === empName?.toLowerCase()
        );
        
        if (processed) {
          processed.ctoHours = parseFloat(row[2]) || 0;
          processed.phHolidayNotWorking = parseFloat(row[3]) || 0;
          processed.silTenureCredits = parseFloat(row[4]) || 0;
          processed.silCredits = parseFloat(row[5]) || 0;
        }
      }
    }

    // Create or update payroll records
    for (const data of results.processed) {
      try {
        // Check if payroll exists for this employee and cutoff period
        const existingPayroll = await payrollCollection.findOne({
          employeeId: data.employeeId,
          cutoffStart: cutoffStart,
          cutoffEnd: cutoffEnd
        });

        const payrollData = {
          employeeId: data.employeeId,
          employeeName: data.employeeName,
          employeeCode: data.employeeCode,
          cutoffStart,
          cutoffEnd,
          dailyHours: data.dailyHours || {},
          workedHours: data.workedHours || 0,
          totalWorkedHours: data.workedHours || 0,
          overtimeHours: data.overtimeHours || 0,
          restDayOT: data.restDayOT || 0,
          regularOT: data.regularOT || 0,
          specialHolidayOT: data.specialHolidayOT || 0,
          specialHolidayHours: data.specialHolidayHours || 0,
          specialHolidayDates: data.specialHolidayDates || {},
          siteLocation: data.siteLocation || '',
          ctoHours: data.ctoHours || 0,
          phHolidayNotWorking: data.phHolidayNotWorking || 0,
          silTenureCredits: data.silTenureCredits || 0,
          silCredits: data.silCredits || 0,
          status: 'pending',
          updatedAt: new Date()
        };

        if (existingPayroll) {
          await payrollCollection.updateOne(
            { _id: existingPayroll._id },
            { $set: payrollData }
          );
          results.updated++;
        } else {
          payrollData.createdAt = new Date();
          await payrollCollection.insertOne(payrollData);
          results.created++;
        }
      } catch (err) {
        results.errors.push(`Failed to save payroll for ${data.employeeName}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import completed: ${results.created} created, ${results.updated} updated`,
      results
    });
  } catch (error) {
    console.error('Import error:', error);
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
    
    if (!cutoffStart || !cutoffEnd) {
      return res.status(400).json({ error: 'Cutoff dates are required' });
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

    // Create the imported payroll record
    const importedPayroll = {
      fileName: fileName || `Payroll_${cutoffStart}_to_${cutoffEnd}`,
      cutoffStart,
      cutoffEnd,
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
  } catch (error) {
    console.error('Save imported payroll error:', error);
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
  } catch (error) {
    console.error('Delete imported payroll error:', error);
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
    
    importedPayroll.sheetNames.forEach(sheetName => {
      const sheetData = importedPayroll.sheets[sheetName];
      if (sheetData) {
        // Combine headers and rows
        const data = [sheetData.headers, ...sheetData.rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    });

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `${importedPayroll.fileName}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Export imported payroll error:', error);
    res.status(500).json({ error: 'Failed to export imported payroll: ' + error.message });
  }
});

module.exports = router;
