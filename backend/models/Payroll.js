const { ObjectId } = require('mongodb');

class Payroll {
  constructor(data) {
    this.employeeId = data.employeeId;
    this.employeeName = data.employeeName;
    this.cutoffStart = data.cutoffStart;
    this.cutoffEnd = data.cutoffEnd;
    this.basicSalary = data.basicSalary || 0;
    this.workedHours = data.workedHours || 0;
    this.overtimeHours = data.overtimeHours || 0;
    this.holidayPay = data.holidayPay || 0;
    this.nightDifferential = data.nightDifferential || 0;
    this.salaryAdjustment = data.salaryAdjustment || 0;
    this.absences = data.absences || 0;
    this.lateDeductions = data.lateDeductions || 0;
    this.sssContribution = data.sssContribution || 0;
    this.philhealthContribution = data.philhealthContribution || 0;
    this.pagibigContribution = data.pagibigContribution || 0;
    this.withholdingTax = data.withholdingTax || 0;
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
