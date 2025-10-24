const { ObjectId } = require('mongodb');

class Department {
  constructor(data) {
    this.name = data.name;
    this.code = data.code;
    this.description = data.description;
    this.manager = data.manager; // Employee ID who manages this department
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static fromMongoDoc(doc) {
    if (!doc) return null;
    const dept = new Department({
      ...doc,
      id: doc._id.toString()
    });
    // Ensure id is enumerable
    dept.id = doc._id.toString();
    return dept;
  }

  toMongoDoc() {
    const doc = { ...this };
    delete doc.id;
    return doc;
  }

  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Department name is required');
    }
    
    if (!this.code || this.code.trim().length === 0) {
      errors.push('Department code is required');
    }
    
    // Validate code format (alphanumeric, uppercase, 2-10 characters)
    if (this.code && !/^[A-Z0-9]{2,10}$/.test(this.code)) {
      errors.push('Department code must be 2-10 uppercase alphanumeric characters');
    }
    
    if (this.name && this.name.length > 100) {
      errors.push('Department name cannot exceed 100 characters');
    }
    
    if (this.description && this.description.length > 500) {
      errors.push('Department description cannot exceed 500 characters');
    }
    
    return errors;
  }

  // Static method to get department hierarchy
  static async getDepartmentHierarchy(db) {
    const departments = await db.collection('departments')
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();
    
    // Return plain objects with id field
    return departments.map(dept => ({
      id: dept._id.toString(),
      name: dept.name,
      code: dept.code,
      description: dept.description,
      manager: dept.manager,
      isActive: dept.isActive,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt
    }));
  }

  // Static method to get department statistics
  static async getDepartmentStats(db, departmentId) {
    console.log('📊 Getting stats for department ID:', departmentId);
    
    // Try both ObjectId and string formats for departmentId
    const employeeCount = await db.collection('employees')
      .countDocuments({ 
        $and: [
          {
            $or: [
              { departmentId: new ObjectId(departmentId) },
              { departmentId: departmentId }
            ]
          },
          { isActive: true }
        ]
      });
    
    // Get payroll count by finding employees in this department first
    const employees = await db.collection('employees')
      .find({ 
        $or: [
          { departmentId: new ObjectId(departmentId) },
          { departmentId: departmentId }
        ],
        isActive: true 
      })
      .toArray();
    
    const employeeIds = employees.map(emp => emp._id.toString());
    
    // Count payrolls for these employees
    const payrollCount = await db.collection('payroll')
      .countDocuments({ 
        employeeId: { $in: employeeIds }
      });
    
    console.log(`📈 Department ${departmentId}: ${employeeCount} employees, ${payrollCount} payrolls`);
    
    return {
      employeeCount,
      payrollCount
    };
  }
}

module.exports = Department;
