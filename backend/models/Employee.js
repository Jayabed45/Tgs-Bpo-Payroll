const { ObjectId } = require('mongodb');

const parseNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const cleaned = String(value).replace(/[,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

class Employee {
  constructor(data) {
    this.employeeCode = data.employeeCode || ''; // e.g., "01100240"
    this.name = data.name;
    this.bankAccountNumber = data.bankAccountNumber || '';
    this.position = data.position;
    this.salary = parseNumber(data.salary !== undefined ? data.salary : data.basicMonthlyRate);
    this.basicMonthlyRate = parseNumber(data.basicMonthlyRate !== undefined ? data.basicMonthlyRate : data.salary);
    this.hourlyRate = parseNumber(data.hourlyRate); // Basic hourly rate
    this.siteLocation = data.siteLocation || ''; // e.g., "Cebu", "Dumaguete"
    this.salaryType = data.salaryType || '';
    this.departmentName = data.departmentName || '';
    this.subDepartment = data.subDepartment || '';
    this.employeeClass = data.employeeClass || '';
    this.l1Head = data.l1Head || '';
    this.l2Head = data.l2Head || '';
    this.averageDaysPerYear = parseNumber(data.averageDaysPerYear);
    this.biMonthlyRate = parseNumber(data.biMonthlyRate);
    this.workingDays = parseNumber(data.workingDays);
    this.absenceDays = parseNumber(data.absenceDays || data.absence);
    this.sssNumber = data.sssNumber;
    this.philhealthNumber = data.philhealthNumber;
    this.pagibigNumber = data.pagibigNumber;
    this.email = data.email;
    this.contactNumber = data.contactNumber;
    this.hireDate = data.hireDate;
    this.complexityAllowance = parseNumber(data.complexityAllowance);
    this.observationalAllowance = parseNumber(data.observationalAllowance);
    this.allowance = parseNumber(data.allowance);
    this.kpiOtIncentive = parseNumber(data.kpiOtIncentive);
    this.salaryAdjustmentDefault = parseNumber(data.salaryAdjustmentDefault || data.salaryAdjustment);
    // Convert departmentId to ObjectId if it's a string
    this.departmentId = data.departmentId ? 
      (typeof data.departmentId === 'string' ? new ObjectId(data.departmentId) : data.departmentId) 
      : null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static fromMongoDoc(doc) {
    if (!doc) return null;
    return new Employee({
      ...doc,
      id: doc._id.toString()
    });
  }

  toMongoDoc() {
    const doc = { ...this };
    delete doc.id;
    return doc;
  }

  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Name is required');
    }
    
    if (!this.position || this.position.trim().length === 0) {
      errors.push('Position is required');
    }
    
    if (!this.salary || this.salary <= 0) {
      errors.push('Valid salary is required');
    }

    if (!this.basicMonthlyRate || this.basicMonthlyRate <= 0) {
      errors.push('Basic monthly rate is required');
    }
    
    return errors;
  }
}

module.exports = Employee;
