const XLSX = require('xlsx');
const Payroll = require('../models/Payroll');

class PayrollProcessingValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'PayrollProcessingValidationError';
    this.details = details;
  }
}

function parseNumber(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const cleaned = String(value).replace(/[,\s]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeEmployeeCode(value) {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw.toLowerCase();
  const normalized = String(parseInt(digits, 10));
  return normalized === 'NaN' ? raw.toLowerCase() : normalized;
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

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const dmyMatch = text.match(/^(\d{1,2})-([A-Za-z]{3,})-?$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const monthToken = dmyMatch[2].slice(0, 3).toLowerCase();
    const monthMap = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const month = monthMap[monthToken];
    if (!month) return null;
    const year = fallbackYear || new Date().getFullYear();
    return `${year}-${month}-${day}`;
  }

  return toISODate(new Date(text));
}

function inferCutoffFromSummaryHeaders(headers, fallbackYear) {
  const dates = [];
  for (let i = 2; i < headers.length; i++) {
    const isoDate = parseHeaderToISODate(headers[i], fallbackYear);
    if (isoDate) dates.push(isoDate);
  }
  if (dates.length === 0) return { cutoffStart: null, cutoffEnd: null };
  dates.sort();
  return { cutoffStart: dates[0], cutoffEnd: dates[dates.length - 1] };
}

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getHeaderIndex(headers, aliases) {
  const normalized = headers.map(normalizeHeader);
  return normalized.findIndex((header) => {
    return aliases.some((alias) => {
      // Use word boundaries or exact matches for strictness to avoid "overtime hours" matching "hours"
      if (alias === 'hours') return header === 'hours';
      return header.includes(alias);
    });
  });
}

function findSheetName(sheetNames, candidates) {
  const sheetNameMap = new Map(sheetNames.map((name) => [normalizeHeader(name), name]));
  for (const candidate of candidates) {
    const exact = sheetNameMap.get(normalizeHeader(candidate));
    if (exact) return exact;
  }
  for (const name of sheetNames) {
    const normalized = normalizeHeader(name);
    if (candidates.some((candidate) => normalized.includes(normalizeHeader(candidate)))) {
      return name;
    }
  }
  return null;
}

function extractLegacyRows(workbook, requestedCutoffStart, requestedCutoffEnd) {
  const sheetNames = workbook.SheetNames || [];
  const summaryName = findSheetName(sheetNames, ['Total Hours - Summary', 'Total Hours', 'Summary']);
  const otName = findSheetName(sheetNames, ['OT', 'Overtime']);

  const rows = [];
  const warnings = [];
  let effectiveCutoffStart = requestedCutoffStart || null;
  let effectiveCutoffEnd = requestedCutoffEnd || null;

  if (!summaryName) {
    return { rows, warnings: ['No summary sheet found. Falling back to flexible row parser.'], cutoffStart: effectiveCutoffStart, cutoffEnd: effectiveCutoffEnd };
  }

  const summarySheet = workbook.Sheets[summaryName];
  const summaryData = XLSX.utils.sheet_to_json(summarySheet, { header: 1, defval: '' });
  const headers = summaryData[0] || [];
  const fallbackYear = effectiveCutoffStart ? parseInt(String(effectiveCutoffStart).split('-')[0], 10) : undefined;
  const inferredCutoff = inferCutoffFromSummaryHeaders(headers, fallbackYear);
  if (inferredCutoff.cutoffStart && inferredCutoff.cutoffEnd) {
    effectiveCutoffStart = inferredCutoff.cutoffStart;
    effectiveCutoffEnd = inferredCutoff.cutoffEnd;
  }

  const grandTotalIndex = headers.findIndex((h) => normalizeHeader(h) === 'grand total');
  const dateColumns = [];
  for (let i = 2; i < headers.length; i++) {
    if (grandTotalIndex >= 0 && i >= grandTotalIndex) break;
    const dateKey = parseHeaderToISODate(headers[i], fallbackYear);
    if (dateKey) dateColumns.push({ index: i, dateKey });
  }

  for (let rowIdx = 1; rowIdx < summaryData.length; rowIdx++) {
    const row = summaryData[rowIdx];
    const employeeCode = String(row[0] || '').trim();
    const employeeName = String(row[1] || '').trim();
    if (!employeeCode && !employeeName) continue;
    if (normalizeHeader(employeeName) === 'grand total') continue;

    const dailyHours = {};
    let totalWorkedHours = 0;
    for (const col of dateColumns) {
      const hours = parseNumber(row[col.index], 0);
      if (hours > 0) {
        dailyHours[col.dateKey] = hours;
        totalWorkedHours += hours;
      }
    }

    const workedHours = grandTotalIndex >= 0 ? parseNumber(row[grandTotalIndex], totalWorkedHours) : totalWorkedHours;
    rows.push({
      source: `${summaryName}#${rowIdx + 1}`,
      employeeCode,
      employeeName,
      dailyHours,
      regularHours: workedHours,
      workedHours,
    });
  }

  if (otName) {
    const otData = XLSX.utils.sheet_to_json(workbook.Sheets[otName], { header: 1, defval: '' });
    const headersOT = (otData[0] || []).map(normalizeHeader);
    const findIdx = (aliases) => headersOT.findIndex((header) => aliases.some((alias) => header.includes(alias)));
    const codeIdx = findIdx(['employee id', 'employee code', 'emp id', 'emp code']);
    const nameIdx = findIdx(['employee name', 'name']);
    const overtimeIdx = findIdx(['overtime hours', 'ot hours', 'overtime']);
    const rdIdx = findIdx(['rd ot', 'rest day ot']);
    const regOtIdx = findIdx(['regular ot', 'reg ot']);
    const shOtIdx = findIdx(['special non working holiday ot', 'sh ot']);
    const bonusIdx = findIdx(['bonus', 'bonuses', 'incentive']);

    for (let rowIdx = 1; rowIdx < otData.length; rowIdx++) {
      const row = otData[rowIdx];
      const employeeCode = String(codeIdx >= 0 ? row[codeIdx] : row[0] || '').trim();
      const employeeName = String(nameIdx >= 0 ? row[nameIdx] : row[1] || '').trim();
      if (!employeeCode && !employeeName) continue;
      if (normalizeHeader(employeeName) === 'grand total') continue;

      const match = rows.find((item) => {
        const sameCode =
          normalizeEmployeeCode(item.employeeCode) &&
          normalizeEmployeeCode(item.employeeCode) === normalizeEmployeeCode(employeeCode);
        const sameName =
          item.employeeName &&
          employeeName &&
          item.employeeName.toLowerCase() === employeeName.toLowerCase();
        return sameCode || sameName;
      });

      if (match) {
        match.overtimeHours = parseNumber(overtimeIdx >= 0 ? row[overtimeIdx] : row[2], 0);
        match.restDayOT = parseNumber(rdIdx >= 0 ? row[rdIdx] : row[3], 0);
        match.regularOT = parseNumber(regOtIdx >= 0 ? row[regOtIdx] : row[4], 0);
        match.specialHolidayOT = parseNumber(shOtIdx >= 0 ? row[shOtIdx] : row[5], 0);
        match.bonuses = parseNumber(bonusIdx >= 0 ? row[bonusIdx] : 0, 0);
      }
    }
  } else {
    warnings.push('No OT sheet found. Overtime defaults to 0.');
  }

  const shName = findSheetName(sheetNames, ['Special Holiday', 'SH']);
  if (shName) {
    const shData = XLSX.utils.sheet_to_json(workbook.Sheets[shName], { header: 1, defval: '' });
    const headers = shData[0] || [];
    
    const dateColumns = [];
    for (let i = 3; i < headers.length - 1; i++) {
      const header = headers[i];
      if (header && (typeof header === 'number' || (typeof header === 'string' && header.match(/^\d/)))) {
        dateColumns.push({ index: i, header });
      }
    }

    for (let rowIdx = 1; rowIdx < shData.length; rowIdx++) {
      const row = shData[rowIdx];
      const employeeCode = String(row[0] || '').trim();
      const employeeName = String(row[1] || '').trim();
      if (!employeeCode && !employeeName) continue;
      if (normalizeHeader(employeeName) === 'grand total') continue;

      const match = rows.find((item) => {
        const sameCode =
          normalizeEmployeeCode(item.employeeCode) &&
          normalizeEmployeeCode(item.employeeCode) === normalizeEmployeeCode(employeeCode);
        const sameName =
          item.employeeName &&
          employeeName &&
          item.employeeName.toLowerCase() === employeeName.toLowerCase();
        return sameCode || sameName;
      });

      if (match) {
        match.siteLocation = row[2] || match.siteLocation || '';
        match.specialHolidayDates = {};
        
        dateColumns.forEach(col => {
          const hours = parseNumber(row[col.index], 0);
          if (hours > 0) {
            let dateKey;
            if (typeof col.header === 'number') {
              const date = excelSerialToDate(col.header);
              dateKey = date ? toISODate(date) : String(col.header);
            } else {
              dateKey = col.header;
            }
            match.specialHolidayDates[dateKey] = hours;
          }
        });
        
        match.specialHolidayHours = parseNumber(row[headers.length - 1], 0);
      }
    }
  }

  const silName = findSheetName(sheetNames, ['SIL_Offset', 'SIL Offset', 'SIL']);
  if (silName) {
    const silData = XLSX.utils.sheet_to_json(workbook.Sheets[silName], { header: 1, defval: '' });
    
    for (let rowIdx = 1; rowIdx < silData.length; rowIdx++) {
      const row = silData[rowIdx];
      const employeeCode = String(row[0] || '').trim();
      const employeeName = String(row[1] || '').trim();
      if (!employeeCode && !employeeName) continue;
      if (normalizeHeader(employeeName) === 'grand total') continue;

      const match = rows.find((item) => {
        const sameCode =
          normalizeEmployeeCode(item.employeeCode) &&
          normalizeEmployeeCode(item.employeeCode) === normalizeEmployeeCode(employeeCode);
        const sameName =
          item.employeeName &&
          employeeName &&
          item.employeeName.toLowerCase() === employeeName.toLowerCase();
        return sameCode || sameName;
      });

      if (match) {
        match.ctoHours = parseNumber(row[2], 0);
        match.phHolidayNotWorking = parseNumber(row[3], 0);
        match.silTenureCredits = parseNumber(row[4], 0);
        match.silCredits = parseNumber(row[5], 0);
      }
    }
  }

  const hourlyName = findSheetName(sheetNames, ['Hourly', 'Hourly Rate', 'Rates']);
  if (hourlyName) {
    const hourlyData = XLSX.utils.sheet_to_json(workbook.Sheets[hourlyName], { header: 1, defval: '' });
    const headersHourly = (hourlyData[0] || []).map(normalizeHeader);
    const findIdx = (aliases) => headersHourly.findIndex((header) => aliases.some((alias) => header.includes(alias)));
    const codeIdx = findIdx(['employee id', 'employee code', 'emp id', 'emp code']);
    const nameIdx = findIdx(['employee name', 'name']);
    const hourlyRateIdx = findIdx(['hourly rate', 'rate per hour', 'hourly']);
    const baseSalaryIdx = findIdx(['base salary', 'basic salary', 'salary', 'basic monthly rate']);

    for (let rowIdx = 1; rowIdx < hourlyData.length; rowIdx++) {
      const row = hourlyData[rowIdx];
      const employeeCode = String(codeIdx >= 0 ? row[codeIdx] : row[0] || '').trim();
      const employeeName = String(nameIdx >= 0 ? row[nameIdx] : row[1] || '').trim();
      if (!employeeCode && !employeeName) continue;
      if (normalizeHeader(employeeName) === 'grand total') continue;

      const match = rows.find((item) => {
        const sameCode =
          normalizeEmployeeCode(item.employeeCode) &&
          normalizeEmployeeCode(item.employeeCode) === normalizeEmployeeCode(employeeCode);
        const sameName =
          item.employeeName &&
          employeeName &&
          item.employeeName.toLowerCase() === employeeName.toLowerCase();
        return sameCode || sameName;
      });

      if (match) {
        const hRate = hourlyRateIdx >= 0 ? parseNumber(row[hourlyRateIdx], NaN) : parseNumber(row[2], NaN);
        const bSalary = baseSalaryIdx >= 0 ? parseNumber(row[baseSalaryIdx], NaN) : parseNumber(row[3], NaN);
        if (!Number.isNaN(hRate)) match.hourlyRate = hRate;
        if (!Number.isNaN(bSalary)) match.baseSalary = bSalary;
      }
    }
  }

  return { rows, warnings, cutoffStart: effectiveCutoffStart, cutoffEnd: effectiveCutoffEnd };
}

function extractFlexibleRows(workbook) {
  const rows = [];
  const warnings = [];
  const aliases = {
    employeeCode: ['employee id', 'employee code', 'emp id', 'emp code', 'id'],
    employeeName: ['employee name', 'name'],
    baseSalary: ['base salary', 'basic salary', 'salary', 'basic monthly rate'],
    regularHours: ['regular hours', 'worked hours', 'hours worked', 'work hours', 'hours'],
    overtimeHours: ['overtime hours', 'ot hours', 'overtime'],
    bonuses: ['bonus', 'bonuses', 'incentive'],
    allowances: ['allowances', 'allowance', 'total allowance'],
    foodAllowance: ['food allowance'],
    transportationAllowance: ['transportation allowance'],
    complexityAllowance: ['complexity allowance'],
    observationalAllowance: ['observational allowance'],
    communicationsAllowance: ['communications allowance'],
    internetAllowance: ['internet allowance'],
    riceSubsidyAllowance: ['rice subsidy allowance'],
    clothingAllowance: ['clothing allowance'],
    laundryAllowance: ['laundry allowance'],
    deductions: ['deductions', 'deduction', 'total deduction'],
    withholdingTax: ['withholding tax', 'tax amount', 'tax deduction'],
    taxRate: ['tax rate'],
    hourlyRate: ['hourly rate'],
  };

  const legacySheets = new Set([
    findSheetName(workbook.SheetNames || [], ['Total Hours - Summary', 'Total Hours', 'Summary']),
    findSheetName(workbook.SheetNames || [], ['OT', 'Overtime']),
    findSheetName(workbook.SheetNames || [], ['Special Holiday', 'SH']),
    findSheetName(workbook.SheetNames || [], ['SIL_Offset', 'SIL Offset', 'SIL']),
    findSheetName(workbook.SheetNames || [], ['Hourly', 'Hourly Rate', 'Rates'])
  ]);

  for (const sheetName of workbook.SheetNames || []) {
    if (legacySheets.has(sheetName)) continue;
    
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
    const headers = data[0] || [];
    if (headers.length === 0) continue;

    const idx = {
      employeeCode: getHeaderIndex(headers, aliases.employeeCode),
      employeeName: getHeaderIndex(headers, aliases.employeeName),
      baseSalary: getHeaderIndex(headers, aliases.baseSalary),
      regularHours: getHeaderIndex(headers, aliases.regularHours),
      overtimeHours: getHeaderIndex(headers, aliases.overtimeHours),
      bonuses: getHeaderIndex(headers, aliases.bonuses),
      allowances: getHeaderIndex(headers, aliases.allowances),
      foodAllowance: getHeaderIndex(headers, aliases.foodAllowance),
      transportationAllowance: getHeaderIndex(headers, aliases.transportationAllowance),
      complexityAllowance: getHeaderIndex(headers, aliases.complexityAllowance),
      observationalAllowance: getHeaderIndex(headers, aliases.observationalAllowance),
      communicationsAllowance: getHeaderIndex(headers, aliases.communicationsAllowance),
      internetAllowance: getHeaderIndex(headers, aliases.internetAllowance),
      riceSubsidyAllowance: getHeaderIndex(headers, aliases.riceSubsidyAllowance),
      clothingAllowance: getHeaderIndex(headers, aliases.clothingAllowance),
      laundryAllowance: getHeaderIndex(headers, aliases.laundryAllowance),
      deductions: getHeaderIndex(headers, aliases.deductions),
      withholdingTax: getHeaderIndex(headers, aliases.withholdingTax),
      taxRate: getHeaderIndex(headers, aliases.taxRate),
      hourlyRate: getHeaderIndex(headers, aliases.hourlyRate),
    };

    const hasEmployee = idx.employeeCode >= 0 || idx.employeeName >= 0;
    const hasPayrollFields =
      idx.baseSalary >= 0 ||
      idx.regularHours >= 0 ||
      idx.overtimeHours >= 0 ||
      idx.allowances >= 0 ||
      idx.deductions >= 0 ||
      idx.withholdingTax >= 0 ||
      idx.taxRate >= 0;

    if (!hasEmployee || !hasPayrollFields) continue;

    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      if (!row || row.every((cell) => String(cell || '').trim() === '')) continue;

      const employeeCode = idx.employeeCode >= 0 ? String(row[idx.employeeCode] || '').trim() : '';
      const employeeName = idx.employeeName >= 0 ? String(row[idx.employeeName] || '').trim() : '';
      const isSummaryRow = normalizeHeader(employeeName) === 'grand total' || normalizeHeader(employeeCode) === 'grand total';
      if (isSummaryRow) continue;

      rows.push({
        source: `${sheetName}#${rowIdx + 1}`,
        employeeCode,
        employeeName,
        baseSalary: idx.baseSalary >= 0 ? parseNumber(row[idx.baseSalary], NaN) : undefined,
        regularHours: idx.regularHours >= 0 ? parseNumber(row[idx.regularHours], 0) : undefined,
        overtimeHours: idx.overtimeHours >= 0 ? parseNumber(row[idx.overtimeHours], 0) : undefined,
        bonuses: idx.bonuses >= 0 ? parseNumber(row[idx.bonuses], 0) : undefined,
        allowances: idx.allowances >= 0 ? parseNumber(row[idx.allowances], 0) : undefined,
        foodAllowance: idx.foodAllowance >= 0 ? parseNumber(row[idx.foodAllowance], 0) : undefined,
        transportationAllowance: idx.transportationAllowance >= 0 ? parseNumber(row[idx.transportationAllowance], 0) : undefined,
        complexityAllowance: idx.complexityAllowance >= 0 ? parseNumber(row[idx.complexityAllowance], 0) : undefined,
        observationalAllowance: idx.observationalAllowance >= 0 ? parseNumber(row[idx.observationalAllowance], 0) : undefined,
        communicationsAllowance: idx.communicationsAllowance >= 0 ? parseNumber(row[idx.communicationsAllowance], 0) : undefined,
        internetAllowance: idx.internetAllowance >= 0 ? parseNumber(row[idx.internetAllowance], 0) : undefined,
        riceSubsidyAllowance: idx.riceSubsidyAllowance >= 0 ? parseNumber(row[idx.riceSubsidyAllowance], 0) : undefined,
        clothingAllowance: idx.clothingAllowance >= 0 ? parseNumber(row[idx.clothingAllowance], 0) : undefined,
        laundryAllowance: idx.laundryAllowance >= 0 ? parseNumber(row[idx.laundryAllowance], 0) : undefined,
        deductions: idx.deductions >= 0 ? parseNumber(row[idx.deductions], 0) : undefined,
        withholdingTax: idx.withholdingTax >= 0 ? parseNumber(row[idx.withholdingTax], NaN) : undefined,
        taxRate: idx.taxRate >= 0 ? parseNumber(row[idx.taxRate], NaN) : undefined,
        hourlyRate: idx.hourlyRate >= 0 ? parseNumber(row[idx.hourlyRate], NaN) : undefined,
      });
    }
  }

  if (rows.length === 0) {
    warnings.push('No flexible payroll sheets with recognized headers were found.');
  }

  return { rows, warnings };
}

function mergeRecords(primaryRows, secondaryRows) {
  const merged = [];
  const keyIndex = new Map();

  const upsert = (row) => {
    const keyPartCode = normalizeEmployeeCode(row.employeeCode);
    const keyPartName = String(row.employeeName || '').toLowerCase().trim();
    const key = `${keyPartCode}::${keyPartName}`;

    if (!keyIndex.has(key)) {
      merged.push({ ...row });
      keyIndex.set(key, merged.length - 1);
      return;
    }

    const existing = merged[keyIndex.get(key)];
    const combined = { ...existing };
    for (const [field, value] of Object.entries(row)) {
      if (value !== undefined && value !== null && value !== '' && !(typeof value === 'number' && Number.isNaN(value))) {
        combined[field] = value;
      }
    }
    merged[keyIndex.get(key)] = combined;
  };

  primaryRows.forEach(upsert);
  secondaryRows.forEach(upsert);
  return merged;
}

function validateInputRow(row) {
  const errors = [];
  const warnings = [];

  if (!row.employeeCode && !row.employeeName) {
    errors.push('Missing employee ID and employee name');
  }
  if (row.regularHours !== undefined && row.regularHours < 0) {
    errors.push('Regular hours cannot be negative');
  }
  if (row.overtimeHours !== undefined && row.overtimeHours < 0) {
    errors.push('Overtime hours cannot be negative');
  }
  if (row.baseSalary !== undefined && Number.isFinite(row.baseSalary) && row.baseSalary < 0) {
    errors.push('Base salary cannot be negative');
  }
  if (row.allowances === undefined) {
    warnings.push('Allowance not provided. Defaulting to 0.');
  }
  if (row.deductions === undefined) {
    warnings.push('Deductions not provided. Defaulting to 0.');
  }
  if (
    row.withholdingTax === undefined &&
    row.taxRate === undefined
  ) {
    warnings.push('Tax info missing. Defaulting withholding tax to 0.');
  }

  return { errors, warnings };
}

async function processImportedPayroll(input, deps) {
  const { fileData, cutoffStart, cutoffEnd, initiatedBy } = input || {};
  const { db, logger = console, calculateSSSContribution, calculatePhilHealthContribution, calculatePagibigContribution } = deps || {};

  if (!db) {
    throw new Error('Database handle is required');
  }
  if (!fileData) {
    throw new PayrollProcessingValidationError('No file data provided');
  }

  const payrollCollection = db.collection('payroll');
  const employeesCollection = db.collection('employees');
  const auditCollection = db.collection('payrollProcessingAudits');

  const processingStartedAt = new Date();
  const processingAudit = {
    initiatedBy: initiatedBy || 'system',
    status: 'in_progress',
    cutoffStart: cutoffStart || null,
    cutoffEnd: cutoffEnd || null,
    startedAt: processingStartedAt,
    endedAt: null,
    summary: null,
    errors: [],
    warnings: [],
    sheetNames: [],
  };

  const insertedAudit = await auditCollection.insertOne(processingAudit);
  const auditId = insertedAudit.insertedId.toString();

  try {
    const buffer = Buffer.from(fileData, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    processingAudit.sheetNames = workbook.SheetNames || [];

    const legacy = extractLegacyRows(workbook, cutoffStart, cutoffEnd);
    const flexible = extractFlexibleRows(workbook);
    let effectiveCutoffStart = legacy.cutoffStart || cutoffStart || null;
    let effectiveCutoffEnd = legacy.cutoffEnd || cutoffEnd || null;

    if (!effectiveCutoffStart || !effectiveCutoffEnd) {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      effectiveCutoffStart = effectiveCutoffStart || monthStart.toISOString().split('T')[0];
      effectiveCutoffEnd = effectiveCutoffEnd || monthEnd.toISOString().split('T')[0];
    }

    const mergedRows = mergeRecords(legacy.rows, flexible.rows);
    if (mergedRows.length === 0) {
      throw new PayrollProcessingValidationError(
        'No payroll rows were detected in the imported workbook.',
        [...legacy.warnings, ...flexible.warnings]
      );
    }

    const employees = await employeesCollection.find({}).toArray();
    const employeeById = new Map();
    const employeeByName = new Map();
    const employeeByCode = new Map();
    employees.forEach((emp) => {
      const employeeId = emp._id.toString();
      employeeById.set(employeeId, emp);
      if (emp.name) employeeByName.set(String(emp.name).toLowerCase().trim(), emp);
      buildEmployeeCodeKeys(emp.employeeCode).forEach((key) => employeeByCode.set(key, emp));
    });

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      employeesCreated: 0,
      errors: [],
      warnings: [...legacy.warnings, ...flexible.warnings],
      processed: [],
    };

    for (const row of mergedRows) {
      const rowLabel = row.source || `${row.employeeCode || row.employeeName || 'Unknown Row'}`;
      try {
        const rowValidation = validateInputRow(row);
        if (rowValidation.errors.length > 0) {
          results.failed++;
          results.errors.push(`${rowLabel}: ${rowValidation.errors.join(', ')}`);
          continue;
        }
        if (rowValidation.warnings.length > 0) {
          results.warnings.push(`${rowLabel}: ${rowValidation.warnings.join(' ')}`);
        }

        let employee = null;
        const employeeCodeKeys = buildEmployeeCodeKeys(row.employeeCode);
        for (const key of employeeCodeKeys) {
          if (employeeByCode.has(key)) {
            employee = employeeByCode.get(key);
            break;
          }
        }
        if (!employee && row.employeeName) {
          employee = employeeByName.get(String(row.employeeName).toLowerCase().trim()) || null;
        }

        if (!employee) {
          const generatedCode = String(row.employeeCode || '').trim() || `IMPORTED-${Date.now()}-${results.employeesCreated + 1}`;
          const newEmployee = {
            employeeCode: generatedCode,
            name: String(row.employeeName || generatedCode),
            position: 'Imported Employee',
            salary: parseNumber(row.baseSalary, 0),
            basicMonthlyRate: parseNumber(row.baseSalary, 0),
            hourlyRate: parseNumber(row.hourlyRate, 0),
            siteLocation: '',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const insertedEmployee = await employeesCollection.insertOne(newEmployee);
          employee = { _id: insertedEmployee.insertedId, ...newEmployee };
          const employeeId = employee._id.toString();
          employeeById.set(employeeId, employee);
          employeeByName.set(String(employee.name || '').toLowerCase().trim(), employee);
          buildEmployeeCodeKeys(employee.employeeCode).forEach((key) => employeeByCode.set(key, employee));
          results.employeesCreated++;
        }

        const baseSalary = Number.isFinite(row.baseSalary)
          ? row.baseSalary
          : parseNumber(employee.biMonthlyRate, parseNumber(employee.salary, parseNumber(employee.basicMonthlyRate, NaN)));
        if (!Number.isFinite(baseSalary) || baseSalary < 0) {
          results.failed++;
          results.errors.push(`${rowLabel}: Missing valid base salary`);
          continue;
        }

        const regularHours = parseNumber(row.regularHours, parseNumber(row.workedHours, 0));
        const overtimeHours = parseNumber(row.overtimeHours, 0);
        const bonuses = parseNumber(row.bonuses, 0);
        const allowances =
          row.allowances !== undefined
            ? parseNumber(row.allowances, 0)
            : parseNumber(employee.allowance, 0);
        const deductions = parseNumber(row.deductions, 0);
        const hourlyRate = Number.isFinite(row.hourlyRate)
          ? row.hourlyRate
          : parseNumber(employee.hourlyRate, baseSalary > 0 ? baseSalary / 176 : 0);

        // Scenario handling:
        // - If regular hours exist, compute regular pay from hourly rate.
        // - Otherwise fallback to base salary as the regular pay amount.
        const regularPay = regularHours > 0 ? regularHours * hourlyRate : baseSalary;
        const overtimePay = overtimeHours > 0 ? overtimeHours * hourlyRate * 1.25 : 0;
        
        const specialHolidayHours = parseNumber(row.specialHolidayHours, 0);
        // Assuming special holiday rate is 1.3x (additional 30%)
        const holidayPay = specialHolidayHours > 0 ? specialHolidayHours * hourlyRate * 0.3 : 0;

        let withholdingTax = Number.isFinite(row.withholdingTax) ? row.withholdingTax : NaN;
        if (!Number.isFinite(withholdingTax) && Number.isFinite(row.taxRate)) {
          withholdingTax = (regularPay + overtimePay + bonuses + allowances) * (row.taxRate / 100);
        }
        if (!Number.isFinite(withholdingTax)) withholdingTax = 0;

        const salaryForContrib = regularPay > 0 ? regularPay : baseSalary;
        const sssContribution = Number.isFinite(row.sssContribution)
          ? parseNumber(row.sssContribution, 0)
          : (typeof calculateSSSContribution === 'function' ? parseNumber(calculateSSSContribution(salaryForContrib), 0) : 0);
        const philhealthContribution = Number.isFinite(row.philhealthContribution)
          ? parseNumber(row.philhealthContribution, 0)
          : (typeof calculatePhilHealthContribution === 'function' ? parseNumber(calculatePhilHealthContribution(salaryForContrib), 0) : 0);
        const pagibigContribution = Number.isFinite(row.pagibigContribution)
          ? parseNumber(row.pagibigContribution, 0)
          : (typeof calculatePagibigContribution === 'function' ? parseNumber(calculatePagibigContribution(salaryForContrib), 0) : 0);

        const payload = {
          employeeId: employee._id.toString(),
          employeeName: employee.name || row.employeeName || row.employeeCode,
          employeeCode: row.employeeCode || employee.employeeCode || '',
          cutoffStart: effectiveCutoffStart,
          cutoffEnd: effectiveCutoffEnd,
          siteLocation: employee.siteLocation || '',
          dailyHours: row.dailyHours || {},
          workedHours: regularHours,
          totalWorkedHours: regularHours,
          basicSalary: regularPay,
          hourlyRate,
          overtimeHours,
          restDayOT: parseNumber(row.restDayOT, 0),
          regularOT: parseNumber(row.regularOT, 0),
          specialHolidayOT: parseNumber(row.specialHolidayOT, 0),
          specialHolidayHours: parseNumber(row.specialHolidayHours, 0),
          specialHolidayDates: row.specialHolidayDates || {},
          holidayPay,
          ctoHours: parseNumber(row.ctoHours, 0),
          phHolidayNotWorking: parseNumber(row.phHolidayNotWorking, 0),
          silTenureCredits: parseNumber(row.silTenureCredits, 0),
          silCredits: parseNumber(row.silCredits, 0),
          referralBonus: bonuses,
          allowance: allowances,
          foodAllowance: parseNumber(row.foodAllowance, 0),
          transportationAllowance: parseNumber(row.transportationAllowance, 0),
          complexityAllowance: parseNumber(row.complexityAllowance, 0),
          observationalAllowance: parseNumber(row.observationalAllowance, 0),
          communicationsAllowance: parseNumber(row.communicationsAllowance, 0),
          internetAllowance: parseNumber(row.internetAllowance, 0),
          riceSubsidyAllowance: parseNumber(row.riceSubsidyAllowance, 0),
          clothingAllowance: parseNumber(row.clothingAllowance, 0),
          laundryAllowance: parseNumber(row.laundryAllowance, 0),
          salaryAdjustment: overtimePay,
          absences: deductions,
          lateDeductions: 0,
          sssContribution,
          philhealthContribution,
          pagibigContribution,
          withholdingTax,
          status: 'processed',
          processingAuditId: auditId,
          updatedAt: new Date(),
        };

        const payrollModel = new Payroll(payload);
        const validationErrors = payrollModel.validate();
        if (validationErrors.length > 0) {
          results.failed++;
          results.errors.push(`${rowLabel}: ${validationErrors.join(', ')}`);
          continue;
        }

        const calculations = payrollModel.calculateAll();
        const payrollData = {
          ...payload,
          grossPay: calculations.grossPay,
          totalDeductions: calculations.totalDeductions,
          netPay: calculations.netPay,
        };

        const existingPayroll = await payrollCollection.findOne({
          employeeId: payload.employeeId,
          cutoffStart: effectiveCutoffStart,
          cutoffEnd: effectiveCutoffEnd,
        });

        if (existingPayroll) {
          await payrollCollection.updateOne(
            { _id: existingPayroll._id },
            {
              $set: {
                ...payrollData,
                updatedAt: new Date(),
              },
              $push: {
                processingAttempts: {
                  auditId,
                  updatedAt: new Date(),
                  status: 'updated',
                },
              },
            }
          );
          results.updated++;
        } else {
          await payrollCollection.insertOne({
            ...payrollData,
            createdAt: new Date(),
            processingAttempts: [
              {
                auditId,
                createdAt: new Date(),
                status: 'created',
              },
            ],
          });
          results.created++;
        }

        results.processed.push({
          employeeId: payload.employeeId,
          employeeCode: payload.employeeCode,
          employeeName: payload.employeeName,
          regularHours,
          overtimeHours,
          grossPay: payrollData.grossPay,
          netPay: payrollData.netPay,
        });
      } catch (rowError) {
        results.failed++;
        results.errors.push(`${rowLabel}: ${rowError.message}`);
      }
    }

    const status =
      results.processed.length === 0
        ? 'failed'
        : results.failed > 0
          ? 'partial'
          : 'success';

    const responsePayload = {
      success: status !== 'failed',
      message:
        status === 'success'
          ? `Payroll processing complete: ${results.created} created, ${results.updated} updated.`
          : status === 'partial'
            ? `Payroll processing partially completed: ${results.created} created, ${results.updated} updated, ${results.failed} failed.`
            : 'Payroll processing failed: no records were successfully processed.',
      cutoffStart: effectiveCutoffStart,
      cutoffEnd: effectiveCutoffEnd,
      results,
      auditId,
    };

    await auditCollection.updateOne(
      { _id: insertedAudit.insertedId },
      {
        $set: {
          status,
          cutoffStart: effectiveCutoffStart,
          cutoffEnd: effectiveCutoffEnd,
          endedAt: new Date(),
          summary: {
            created: results.created,
            updated: results.updated,
            failed: results.failed,
            employeesCreated: results.employeesCreated,
          },
          errors: results.errors.slice(0, 200),
          warnings: results.warnings.slice(0, 200),
          sheetNames: processingAudit.sheetNames,
        },
      }
    );

    return {
      httpStatus: status === 'failed' ? 422 : 200,
      payload: responsePayload,
    };
  } catch (error) {
    logger.error('Payroll import processing error:', error);
    await auditCollection.updateOne(
      { _id: insertedAudit.insertedId },
      {
        $set: {
          status: 'failed',
          endedAt: new Date(),
          errors: [error.message],
          warnings: [],
          summary: { created: 0, updated: 0, failed: 0, employeesCreated: 0 },
          sheetNames: processingAudit.sheetNames,
        },
      }
    );

    if (error instanceof PayrollProcessingValidationError) {
      return {
        httpStatus: 422,
        payload: {
          success: false,
          message: error.message,
          error: error.message,
          details: error.details || [],
          results: {
            created: 0,
            updated: 0,
            failed: 0,
            employeesCreated: 0,
            errors: [error.message],
            warnings: error.details || [],
            processed: [],
          },
          auditId,
        },
      };
    }
    throw error;
  }
}

module.exports = {
  processImportedPayroll,
  PayrollProcessingValidationError,
};
