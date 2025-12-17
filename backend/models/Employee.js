const { ObjectId } = require('mongodb');

class Employee {
  constructor(data) {
    this.employeeCode = data.employeeCode || ''; // e.g., "01100240"
    this.name = data.name;
    this.position = data.position;
    this.salary = data.salary;
    this.hourlyRate = data.hourlyRate || 0; // Basic hourly rate
    this.siteLocation = data.siteLocation || ''; // e.g., "Cebu", "Dumaguete"
    this.workingDays = data.workingDays;
    this.sssNumber = data.sssNumber;
    this.philhealthNumber = data.philhealthNumber;
    this.pagibigNumber = data.pagibigNumber;
    this.email = data.email;
    this.contactNumber = data.contactNumber;
    this.hireDate = data.hireDate;
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
    
    if (!this.email || !this.email.includes('@')) {
      errors.push('Valid email is required');
    }
    
    if (!this.sssNumber || this.sssNumber.trim().length === 0) {
      errors.push('SSS number is required');
    }
    
    if (!this.philhealthNumber || this.philhealthNumber.trim().length === 0) {
      errors.push('PhilHealth number is required');
    }
    
    if (!this.pagibigNumber || this.pagibigNumber.trim().length === 0) {
      errors.push('Pag-IBIG number is required');
    }
    
    if (!this.departmentId) {
      errors.push('Department is required');
    }
    
    return errors;
  }
}

module.exports = Employee;
