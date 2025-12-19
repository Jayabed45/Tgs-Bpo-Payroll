  const express = require('express');
const { ObjectId } = require('mongodb');
const { clientPromise } = require('../config/database');
const Employee = require('../models/Employee');

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

// Get all employees
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const employeesCollection = db.collection('employees');
    const departmentsCollection = db.collection('departments');

    const employees = await employeesCollection
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .toArray();

    // Populate department information for each employee
    const formattedEmployees = await Promise.all(employees.map(async (emp) => {
      let department = null;
      
      if (emp.departmentId) {
        try {
          // Try to find department by ObjectId or string
          const deptId = ObjectId.isValid(emp.departmentId) 
            ? new ObjectId(emp.departmentId) 
            : emp.departmentId;
          
          department = await departmentsCollection.findOne({ 
            _id: deptId,
            isActive: true 
          });
          
          if (department) {
            department = {
              id: department._id.toString(),
              name: department.name,
              code: department.code,
              description: department.description
            };
          }
        } catch (error) {
          console.error('Error fetching department for employee:', emp._id, error);
        }
      }

      return {
        id: emp._id.toString(),
        employeeCode: emp.employeeCode || '',
        name: emp.name,
        position: emp.position,
        salary: emp.salary,
        hourlyRate: emp.hourlyRate || 0,
        siteLocation: emp.siteLocation || '',
        workingDays: emp.workingDays,
        sssNumber: emp.sssNumber,
        philhealthNumber: emp.philhealthNumber,
        pagibigNumber: emp.pagibigNumber,
        email: emp.email,
        contactNumber: emp.contactNumber,
        hireDate: emp.hireDate,
        departmentId: emp.departmentId?.toString(),
        department: department,
        isActive: emp.isActive,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt
      };
    }));

    res.json({ 
      success: true, 
      employees: formattedEmployees,
      total: formattedEmployees.length
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get employee by ID
router.get('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const employeesCollection = db.collection('employees');

    const employee = await employeesCollection.findOne({ _id: new ObjectId(id) });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const formattedEmployee = {
      id: employee._id.toString(),
      employeeCode: employee.employeeCode || '',
      name: employee.name,
      position: employee.position,
      salary: employee.salary,
      hourlyRate: employee.hourlyRate || 0,
      siteLocation: employee.siteLocation || '',
      workingDays: employee.workingDays,
      sssNumber: employee.sssNumber,
      philhealthNumber: employee.philhealthNumber,
      pagibigNumber: employee.pagibigNumber,
      email: employee.email,
      contactNumber: employee.contactNumber,
      hireDate: employee.hireDate,
      departmentId: employee.departmentId?.toString(),
      isActive: employee.isActive,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt
    };

    res.json({ success: true, employee: formattedEmployee });

  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new employee
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const employeeData = req.body;
    
    // Create employee instance
    const employee = new Employee(employeeData);
    
    // Validate employee data
    const validationErrors = employee.validate();
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    const client = await clientPromise;
    const db = client.db();
    const employeesCollection = db.collection('employees');

    // Check if email already exists
    const existingEmployee = await employeesCollection.findOne({ 
      email: employee.email,
      isActive: true
    });

    if (existingEmployee) {
      return res.status(400).json({ error: 'Employee with this email already exists' });
    }

    // Generate employee code if not provided
    if (!employeeData.employeeCode) {
      // Get the count of existing employees to generate the next code
      const employeeCount = await employeesCollection.countDocuments({ isActive: true });
      employeeData.employeeCode = String(employeeCount + 1).padStart(5, '0');
    }

    // Insert employee
    const employeeDoc = employee.toMongoDoc();
    employeeDoc.employeeCode = employeeData.employeeCode;
    const result = await employeesCollection.insertOne(employeeDoc);

    const createdEmployee = {
      id: result.insertedId.toString(),
      ...employeeData,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      employee: createdEmployee
    });

  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update employee
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const employeesCollection = db.collection('employees');

    // Check if employee exists
    const existingEmployee = await employeesCollection.findOne({ _id: new ObjectId(id) });
    if (!existingEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Update employee
    const result = await employeesCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({
      success: true,
      message: 'Employee updated successfully'
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete employee (permanent delete with cascade)
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid employee ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const employeesCollection = db.collection('employees');
    const payrollCollection = db.collection('payroll');

    // Check if employee exists
    const employee = await employeesCollection.findOne({ _id: new ObjectId(id) });
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Delete payrolls first
    const payrollDeleteResult = await payrollCollection.deleteMany({ employeeId: id });

    // Delete employee
    const employeeDeleteResult = await employeesCollection.deleteOne({ _id: new ObjectId(id) });

    if (employeeDeleteResult.deletedCount === 0) {
      return res.status(500).json({ error: 'Failed to delete employee' });
    }

    console.log(
      `Deleted employee ${id} and ${payrollDeleteResult.deletedCount} associated payrolls`
    );

    res.json({
      success: true,
      message: 'Employee and all associated payrolls deleted permanently'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk import employees
router.post('/bulk-import', verifyAdminToken, async (req, res) => {
  try {
    const { employees } = req.body;
    
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: 'No employees data provided' });
    }

    const client = await clientPromise;
    const db = client.db();
    const employeesCollection = db.collection('employees');

    const errors = [];
    const importedEmployees = [];
    let importedCount = 0;

    // Get current employee count for code generation
    const currentEmployeeCount = await employeesCollection.countDocuments({ isActive: true });

    // Process each employee
    for (let i = 0; i < employees.length; i++) {
      const employeeData = employees[i];
      
      try {
        // Create employee instance for validation
        const employee = new Employee(employeeData);
        
        // Validate employee data
        const validationErrors = employee.validate();
        if (validationErrors.length > 0) {
          errors.push(`Row ${i + 1}: ${validationErrors.join(', ')}`);
          continue;
        }

        // Check if email already exists
        const existingEmployee = await employeesCollection.findOne({ 
          email: employee.email,
          isActive: true
        });

        if (existingEmployee) {
          errors.push(`Row ${i + 1}: Employee with email ${employee.email} already exists`);
          continue;
        }

        // Generate employee code if not provided
        if (!employeeData.employeeCode) {
          employeeData.employeeCode = String(currentEmployeeCount + importedCount + 1).padStart(5, '0');
        }

        // Insert employee
        const employeeDoc = employee.toMongoDoc();
        employeeDoc.employeeCode = employeeData.employeeCode;
        const result = await employeesCollection.insertOne(employeeDoc);
        
        const createdEmployee = {
          id: result.insertedId.toString(),
          ...employeeData,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt
        };

        importedEmployees.push(createdEmployee);
        importedCount++;

      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} employees`,
      imported: importedCount,
      errors: errors,
      totalProcessed: employees.length
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get employee statistics
router.get('/stats/overview', verifyAdminToken, async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const employeesCollection = db.collection('employees');

    const totalEmployees = await employeesCollection.countDocuments({ isActive: true });
    const activeEmployees = await employeesCollection.countDocuments({ isActive: true });
    const inactiveEmployees = await employeesCollection.countDocuments({ isActive: false });

    // Get department distribution
    const departmentStats = await employeesCollection.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$position', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    const departmentDistribution = departmentStats.map(dept => ({
      department: dept._id,
      count: dept.count
    }));

    res.json({
      success: true,
      stats: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        departmentDistribution
      }
    });

  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
