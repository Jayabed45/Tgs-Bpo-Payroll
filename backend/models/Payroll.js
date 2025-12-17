const { ObjectId } = require('mongodb');

class Payroll {
  constructor(data) {
    this.employeeId = data.employeeId;
    this.employeeName = data.employeeName;
    this.employeeCode = data.employeeCode || ''; // e.g., "01100240"
    this.siteLocation = data.siteLocation || ''; // e.g., "Cebu", "Dumaguete"
    this.departmentId = data.departmentId; // ObjectId reference to Department
    this.cutoffStart = data.cutoffStart;
    this.cutoffEnd = data.cutoffEnd;
    
    // Daily hours worked (object with date keys)
    this.dailyHours = data.dailyHours || {}; // { "2025-10-16": 8, "2025-10-17": 7.5, ... }
    this.totalWorkedHours = data.totalWorkedHours || 0;
    
    // Basic salary
    this.basicSalary = data.basicSalary || 0;
    this.hourlyRate = data.hourlyRate || 0;
    this.workedHours = data.workedHours || 0;
    
    // Overtime breakdown
    this.regularOT = data.regularOT || 0; // Regular OT hours
    this.restDayOT = data.restDayOT || 0; // RD OT (within first 8hrs)
    this.specialHolidayOT = data.specialHolidayOT || 0; // Special Non Working Holiday OT
    this.overtimeHours = data.overtimeHours || 0; // Total OT hours
    
    // Holiday hours
    this.specialHolidayHours = data.specialHolidayHours || 0; // Special Holiday hours worked
    this.specialHolidayDates = data.specialHolidayDates || {}; // { "2025-10-16": 8, "2025-10-30": 8, ... } hours per holiday date
    this.legalHolidayHours = data.legalHolidayHours || 0; // Legal Holiday hours worked
    this.holidayPay = data.holidayPay || 0;
    
    // Leaves and offsets
    this.silHours = data.silHours || 0; // Service Incentive Leave
    this.silCredits = data.silCredits || 0; // SIL Credits
    this.silTenureCredits = data.silTenureCredits || 0; // SIL Credit (Additional based on Tenure)
    this.ctoHours = data.ctoHours || 0; // Compensatory Time Off
    this.phHolidayNotWorking = data.phHolidayNotWorking || 0; // PH Holidays - Not Working on Regular holiday
    this.soloParentLeave = data.soloParentLeave || 0;
    this.otherLeaves = data.otherLeaves || 0; // Maternity, Paternity, etc.
    
    // Other earnings
    this.nightDifferential = data.nightDifferential || 0;
    this.nightDifferentialHours = data.nightDifferentialHours || 0;
    this.referralBonus = data.referralBonus || 0;
    this.complexityAllowance = data.complexityAllowance || 0;
    this.observationalAllowance = data.observationalAllowance || 0;
    this.allowance = data.allowance || 0;
    this.salaryAdjustment = data.salaryAdjustment || 0;
    
    // Deductions
    this.absences = data.absences || 0;
    this.lateDeductions = data.lateDeductions || 0;
    this.sssContribution = data.sssContribution || 0;
    this.philhealthContribution = data.philhealthContribution || 0;
    this.pagibigContribution = data.pagibigContribution || 0;
    this.withholdingTax = data.withholdingTax || 0;
    
    // Totals
    this.grossPay = data.grossPay || 0;
    this.totalDeductions = data.totalDeductions || 0;
    this.netPay = data.netPay || 0;
    this.status = data.status || 'pending'; // pending, processed, completed
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static fromMongoDoc(doc) {
    if (!doc) return null;
    return new Payroll({
      ...doc,
      id: doc._id.toString()
    });
  }

  toMongoDoc() {
    const doc = { ...this };
    delete doc.id;
    return doc;
  }

  calculateGrossPay() {
    // Gross Pay = Basic Salary + Allowances + SIL + OT + Holiday Pay + Salary Adjustment + Night Differential - Absences/Late Deductions
    this.grossPay = this.basicSalary + 
                    this.holidayPay + 
                    this.nightDifferential + 
                    this.salaryAdjustment - 
                    this.absences - 
                    this.lateDeductions;
    
    return this.grossPay;
  }

  calculateTotalDeductions() {
    // Total Deductions = SSS + PhilHealth + Pag-IBIG + Withholding Tax
    this.totalDeductions = this.sssContribution + 
                           this.philhealthContribution + 
                           this.pagibigContribution + 
                           this.withholdingTax;
    
    return this.totalDeductions;
  }

  calculateNetPay() {
    // Net Pay = Gross Pay - Total Deductions
    this.netPay = this.grossPay - this.totalDeductions;
    return this.netPay;
  }

  calculateAll() {
    this.calculateGrossPay();
    this.calculateTotalDeductions();
    this.calculateNetPay();
    return {
      grossPay: this.grossPay,
      totalDeductions: this.totalDeductions,
      netPay: this.netPay
    };
  }

  validate() {
    const errors = [];
    
    if (!this.employeeId) {
      errors.push('Employee ID is required');
    }
    
    if (!this.cutoffStart || !this.cutoffEnd) {
      errors.push('Cutoff dates are required');
    }
    
    if (this.basicSalary < 0) {
      errors.push('Basic salary cannot be negative');
    }
    
    if (this.workedHours < 0) {
      errors.push('Worked hours cannot be negative');
    }
    
    return errors;
  }
}

module.exports = Payroll;
