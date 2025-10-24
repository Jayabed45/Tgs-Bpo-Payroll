/**
 * Philippine Payroll Calculation Utilities
 * Based on 2024 rates and TRAIN Law
 */

// SSS Contribution Table 2024
interface SSSBracket {
  minSalary: number;
  maxSalary: number;
  employeeShare: number;
  employerShare: number;
  total: number;
}

const SSS_TABLE: SSSBracket[] = [
  { minSalary: 0, maxSalary: 4249.99, employeeShare: 180, employerShare: 630, total: 810 },
  { minSalary: 4250, maxSalary: 4749.99, employeeShare: 202.50, employerShare: 708.75, total: 911.25 },
  { minSalary: 4750, maxSalary: 5249.99, employeeShare: 225, employerShare: 787.50, total: 1012.50 },
  { minSalary: 5250, maxSalary: 5749.99, employeeShare: 247.50, employerShare: 866.25, total: 1113.75 },
  { minSalary: 5750, maxSalary: 6249.99, employeeShare: 270, employerShare: 945, total: 1215 },
  { minSalary: 6250, maxSalary: 6749.99, employeeShare: 292.50, employerShare: 1023.75, total: 1316.25 },
  { minSalary: 6750, maxSalary: 7249.99, employeeShare: 315, employerShare: 1102.50, total: 1417.50 },
  { minSalary: 7250, maxSalary: 7749.99, employeeShare: 337.50, employerShare: 1181.25, total: 1518.75 },
  { minSalary: 7750, maxSalary: 8249.99, employeeShare: 360, employerShare: 1260, total: 1620 },
  { minSalary: 8250, maxSalary: 8749.99, employeeShare: 382.50, employerShare: 1338.75, total: 1721.25 },
  { minSalary: 8750, maxSalary: 9249.99, employeeShare: 405, employerShare: 1417.50, total: 1822.50 },
  { minSalary: 9250, maxSalary: 9749.99, employeeShare: 427.50, employerShare: 1496.25, total: 1923.75 },
  { minSalary: 9750, maxSalary: 10249.99, employeeShare: 450, employerShare: 1575, total: 2025 },
  { minSalary: 10250, maxSalary: 10749.99, employeeShare: 472.50, employerShare: 1653.75, total: 2126.25 },
  { minSalary: 10750, maxSalary: 11249.99, employeeShare: 495, employerShare: 1732.50, total: 2227.50 },
  { minSalary: 11250, maxSalary: 11749.99, employeeShare: 517.50, employerShare: 1811.25, total: 2328.75 },
  { minSalary: 11750, maxSalary: 12249.99, employeeShare: 540, employerShare: 1890, total: 2430 },
  { minSalary: 12250, maxSalary: 12749.99, employeeShare: 562.50, employerShare: 1968.75, total: 2531.25 },
  { minSalary: 12750, maxSalary: 13249.99, employeeShare: 585, employerShare: 2047.50, total: 2632.50 },
  { minSalary: 13250, maxSalary: 13749.99, employeeShare: 607.50, employerShare: 2126.25, total: 2733.75 },
  { minSalary: 13750, maxSalary: 14249.99, employeeShare: 630, employerShare: 2205, total: 2835 },
  { minSalary: 14250, maxSalary: 14749.99, employeeShare: 652.50, employerShare: 2283.75, total: 2936.25 },
  { minSalary: 14750, maxSalary: 15249.99, employeeShare: 675, employerShare: 2362.50, total: 3037.50 },
  { minSalary: 15250, maxSalary: 15749.99, employeeShare: 697.50, employerShare: 2441.25, total: 3138.75 },
  { minSalary: 15750, maxSalary: 16249.99, employeeShare: 720, employerShare: 2520, total: 3240 },
  { minSalary: 16250, maxSalary: 16749.99, employeeShare: 742.50, employerShare: 2598.75, total: 3341.25 },
  { minSalary: 16750, maxSalary: 17249.99, employeeShare: 765, employerShare: 2677.50, total: 3442.50 },
  { minSalary: 17250, maxSalary: 17749.99, employeeShare: 787.50, employerShare: 2756.25, total: 3543.75 },
  { minSalary: 17750, maxSalary: 18249.99, employeeShare: 810, employerShare: 2835, total: 3645 },
  { minSalary: 18250, maxSalary: 18749.99, employeeShare: 832.50, employerShare: 2913.75, total: 3746.25 },
  { minSalary: 18750, maxSalary: 19249.99, employeeShare: 855, employerShare: 2992.50, total: 3847.50 },
  { minSalary: 19250, maxSalary: 19749.99, employeeShare: 877.50, employerShare: 3071.25, total: 3948.75 },
  { minSalary: 19750, maxSalary: 20249.99, employeeShare: 900, employerShare: 3150, total: 4050 },
  { minSalary: 20250, maxSalary: 20749.99, employeeShare: 922.50, employerShare: 3228.75, total: 4151.25 },
  { minSalary: 20750, maxSalary: 21249.99, employeeShare: 945, employerShare: 3307.50, total: 4252.50 },
  { minSalary: 21250, maxSalary: 21749.99, employeeShare: 967.50, employerShare: 3386.25, total: 4353.75 },
  { minSalary: 21750, maxSalary: 22249.99, employeeShare: 990, employerShare: 3465, total: 4455 },
  { minSalary: 22250, maxSalary: 22749.99, employeeShare: 1012.50, employerShare: 3543.75, total: 4556.25 },
  { minSalary: 22750, maxSalary: 23249.99, employeeShare: 1035, employerShare: 3622.50, total: 4657.50 },
  { minSalary: 23250, maxSalary: 23749.99, employeeShare: 1057.50, employerShare: 3701.25, total: 4758.75 },
  { minSalary: 23750, maxSalary: 24249.99, employeeShare: 1080, employerShare: 3780, total: 4860 },
  { minSalary: 24250, maxSalary: 24749.99, employeeShare: 1102.50, employerShare: 3858.75, total: 4961.25 },
  { minSalary: 24750, maxSalary: 29999.99, employeeShare: 1125, employerShare: 3937.50, total: 5062.50 },
  { minSalary: 30000, maxSalary: Infinity, employeeShare: 1350, employerShare: 4725, total: 6075 }
];

/**
 * Calculate SSS contribution based on monthly salary
 */
export function calculateSSS(monthlySalary: number): number {
  const bracket = SSS_TABLE.find(
    b => monthlySalary >= b.minSalary && monthlySalary <= b.maxSalary
  );
  return bracket ? bracket.employeeShare : 1350; // Max contribution
}

/**
 * Calculate PhilHealth contribution based on monthly basic salary
 * 2024 rates
 */
export function calculatePhilHealth(monthlySalary: number): number {
  if (monthlySalary <= 10000) {
    return 500 / 2; // ₱250 employee share
  } else if (monthlySalary <= 99999.99) {
    const contribution = monthlySalary * 0.05; // 5% total
    return Math.min(contribution / 2, 5000 / 2); // Employee share (2.5%), max ₱2,500
  } else {
    return 5000 / 2; // ₱2,500 max employee share
  }
}

/**
 * Calculate Pag-IBIG contribution based on monthly salary
 */
export function calculatePagIBIG(monthlySalary: number): number {
  if (monthlySalary <= 1500) {
    return monthlySalary * 0.01; // 1% for ₱1,500 and below
  } else {
    const contribution = monthlySalary * 0.02; // 2% for above ₱1,500
    return Math.min(contribution, 100); // Max ₱100
  }
}

/**
 * Calculate Withholding Tax based on TRAIN Law (annual basis)
 * Converts monthly to annual, calculates tax, then returns monthly
 */
export function calculateWithholdingTax(monthlySalary: number, taxableIncome?: number): number {
  // Use provided taxable income or monthly salary
  const monthlyTaxable = taxableIncome || monthlySalary;
  const annualTaxable = monthlyTaxable * 12;

  let annualTax = 0;

  if (annualTaxable <= 250000) {
    annualTax = 0;
  } else if (annualTaxable <= 400000) {
    annualTax = (annualTaxable - 250000) * 0.15;
  } else if (annualTaxable <= 800000) {
    annualTax = 22500 + (annualTaxable - 400000) * 0.20;
  } else if (annualTaxable <= 2000000) {
    annualTax = 102500 + (annualTaxable - 800000) * 0.25;
  } else if (annualTaxable <= 8000000) {
    annualTax = 402500 + (annualTaxable - 2000000) * 0.30;
  } else {
    annualTax = 2202500 + (annualTaxable - 8000000) * 0.35;
  }

  return Math.round((annualTax / 12) * 100) / 100; // Monthly tax
}

/**
 * Calculate overtime pay
 * @param hourlyRate - Basic hourly rate
 * @param overtimeHours - Number of overtime hours
 * @param multiplier - Overtime multiplier (default 1.25 for regular OT)
 */
export function calculateOvertimePay(
  hourlyRate: number,
  overtimeHours: number,
  multiplier: number = 1.25
): number {
  return Math.round(hourlyRate * overtimeHours * multiplier * 100) / 100;
}

/**
 * Calculate night differential (10 PM - 6 AM)
 * Additional 10% of basic hourly rate
 */
export function calculateNightDifferential(
  hourlyRate: number,
  nightHours: number
): number {
  return Math.round(hourlyRate * nightHours * 0.10 * 100) / 100;
}

/**
 * Calculate holiday pay based on holiday type
 */
export function calculateHolidayPay(
  dailyRate: number,
  holidayType: 'regular' | 'special' = 'regular'
): number {
  if (holidayType === 'regular') {
    return dailyRate * 2; // 200% for regular holidays
  } else {
    return dailyRate * 1.3; // 130% for special holidays
  }
}

/**
 * Calculate hourly rate from monthly salary
 * Assumes 8 hours/day, 22 working days/month = 176 hours
 */
export function getHourlyRate(monthlySalary: number, workingHoursPerMonth: number = 176): number {
  return monthlySalary / workingHoursPerMonth;
}

/**
 * Calculate daily rate from monthly salary
 * Assumes 22 working days per month (or 261 days per year / 12)
 */
export function getDailyRate(monthlySalary: number, workingDaysPerMonth: number = 22): number {
  return monthlySalary / workingDaysPerMonth;
}

/**
 * Complete payroll calculation for an employee
 */
export interface PayrollCalculation {
  basicSalary: number;
  overtimePay: number;
  holidayPay: number;
  nightDifferential: number;
  grossPay: number;
  sssContribution: number;
  philhealthContribution: number;
  pagibigContribution: number;
  withholdingTax: number;
  totalDeductions: number;
  netPay: number;
}

export function calculateCompletePayroll(params: {
  basicSalary: number;
  overtimeHours?: number;
  nightHours?: number;
  holidayDays?: number;
  holidayType?: 'regular' | 'special';
  otherAllowances?: number;
  absences?: number;
  lateDeductions?: number;
  workingHoursPerMonth?: number;
  workingDaysPerMonth?: number;
}): PayrollCalculation {
  const {
    basicSalary,
    overtimeHours = 0,
    nightHours = 0,
    holidayDays = 0,
    holidayType = 'regular',
    otherAllowances = 0,
    absences = 0,
    lateDeductions = 0,
    workingHoursPerMonth = 176,
    workingDaysPerMonth = 22
  } = params;

  // Calculate rates
  const hourlyRate = getHourlyRate(basicSalary, workingHoursPerMonth);
  const dailyRate = getDailyRate(basicSalary, workingDaysPerMonth);

  // Calculate earnings
  const overtimePay = calculateOvertimePay(hourlyRate, overtimeHours);
  const nightDifferentialPay = calculateNightDifferential(hourlyRate, nightHours);
  const holidayPay = holidayDays > 0 ? calculateHolidayPay(dailyRate, holidayType) * holidayDays : 0;

  // Gross pay
  const grossPay = basicSalary + overtimePay + nightDifferentialPay + holidayPay + otherAllowances - absences - lateDeductions;

  // Calculate contributions (based on basic salary only)
  const sssContribution = calculateSSS(basicSalary);
  const philhealthContribution = calculatePhilHealth(basicSalary);
  const pagibigContribution = calculatePagIBIG(basicSalary);
  
  // Calculate taxable income (gross pay minus non-taxable contributions)
  const taxableIncome = grossPay - sssContribution - philhealthContribution - pagibigContribution;
  const withholdingTax = calculateWithholdingTax(basicSalary, taxableIncome / 12); // Monthly taxable

  // Total deductions
  const totalDeductions = sssContribution + philhealthContribution + pagibigContribution + withholdingTax;

  // Net pay
  const netPay = Math.max(0, grossPay - totalDeductions);

  return {
    basicSalary,
    overtimePay,
    holidayPay,
    nightDifferential: nightDifferentialPay,
    grossPay: Math.round(grossPay * 100) / 100,
    sssContribution: Math.round(sssContribution * 100) / 100,
    philhealthContribution: Math.round(philhealthContribution * 100) / 100,
    pagibigContribution: Math.round(pagibigContribution * 100) / 100,
    withholdingTax: Math.round(withholdingTax * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netPay: Math.round(netPay * 100) / 100
  };
}
