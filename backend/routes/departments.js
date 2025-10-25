const express = require('express');
const { ObjectId } = require('mongodb');
const Department = require('../models/Department');

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

// Get all departments
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    if (!global.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const departmentsCollection = global.db.collection('departments');

    const departments = await departmentsCollection
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();

    const formattedDepartments = departments.map(dept => ({
      id: dept._id.toString(),
      name: dept.name,
      code: dept.code,
      description: dept.description,
      manager: dept.manager,
      isActive: dept.isActive,
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt
    }));

    res.json({ 
      success: true, 
      departments: formattedDepartments 
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch departments' 
    });
  }
});

// Get department hierarchy with employee counts (MUST be before /:id route)
router.get('/hierarchy/all', verifyAdminToken, async (req, res) => {
  try {
    if (!global.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const departments = await Department.getDepartmentHierarchy(global.db);
    
    // Add employee counts to each department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        // Ensure we have the id
        const deptId = dept.id || dept._id?.toString();
        if (!deptId) {
          console.error('Department missing ID:', dept);
        }
        
        const stats = await Department.getDepartmentStats(global.db, deptId);
        return {
          id: deptId,
          name: dept.name,
          code: dept.code,
          description: dept.description,
          manager: dept.manager,
          isActive: dept.isActive,
          createdAt: dept.createdAt,
          updatedAt: dept.updatedAt,
          employeeCount: stats.employeeCount,
          payrollCount: stats.payrollCount
        };
      })
    );

    res.json({ 
      success: true, 
      departments: departmentsWithCounts 
    });
  } catch (error) {
    console.error('Error fetching department hierarchy:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch department hierarchy' 
    });
  }
});

// Get department by ID with statistics
router.get('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid department ID' 
      });
    }

    if (!global.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const departmentsCollection = global.db.collection('departments');

    const department = await departmentsCollection.findOne({ 
      _id: new ObjectId(id), 
      isActive: true 
    });

    if (!department) {
      return res.status(404).json({ 
        success: false, 
        error: 'Department not found' 
      });
    }

    // Get department statistics
    const stats = await Department.getDepartmentStats(db, id);

    const formattedDepartment = {
      id: department._id.toString(),
      name: department.name,
      code: department.code,
      description: department.description,
      manager: department.manager,
      isActive: department.isActive,
      createdAt: department.createdAt,
      updatedAt: department.updatedAt,
      statistics: stats
    };

    res.json({ 
      success: true, 
      department: formattedDepartment 
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch department' 
    });
  }
});

// Create new department
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    console.log(' Creating department with data:', req.body);
    const departmentData = new Department(req.body);
    const validationErrors = departmentData.validate();

    if (validationErrors.length > 0) {
      console.log(' Validation failed:', validationErrors);
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    if (!global.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const departmentsCollection = global.db.collection('departments');

    // Check if department code already exists
    const existingDept = await departmentsCollection.findOne({ 
      code: departmentData.code.toUpperCase(),
      isActive: true
    });

    if (existingDept) {
      console.log(' Department code already exists:', existingDept.code);
      return res.status(409).json({ 
        success: false, 
        error: 'Department code already exists' 
      });
    }

    // Ensure code is uppercase
    departmentData.code = departmentData.code.toUpperCase();

    console.log(' Inserting department into database...');
    const result = await departmentsCollection.insertOne(departmentData.toMongoDoc());
    
    const newDepartment = {
      id: result.insertedId.toString(),
      ...departmentData.toMongoDoc()
    };

    console.log(' Department created successfully:', newDepartment.id);
    res.status(201).json({ 
      success: true, 
      message: 'Department created successfully', 
      department: newDepartment 
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create department' 
    });
  }
});

// Update department
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid department ID' 
      });
    }

    const departmentData = new Department({
      ...req.body,
      updatedAt: new Date()
    });
    
    const validationErrors = departmentData.validate();

    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    if (!global.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const departmentsCollection = global.db.collection('departments');

    // Check if department code already exists (excluding current department)
    const existingDept = await departmentsCollection.findOne({ 
      code: departmentData.code.toUpperCase(),
      _id: { $ne: new ObjectId(id) },
      isActive: true
    });

    if (existingDept) {
      return res.status(409).json({ 
        success: false, 
        error: 'Department code already exists' 
      });
    }

    // Ensure code is uppercase
    departmentData.code = departmentData.code.toUpperCase();

    const result = await departmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: departmentData.toMongoDoc() }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Department not found' 
      });
    }

    const updatedDepartment = await departmentsCollection.findOne({ 
      _id: new ObjectId(id) 
    });

    res.json({ 
      success: true, 
      message: 'Department updated successfully', 
      department: {
        id: updatedDepartment._id.toString(),
        ...updatedDepartment
      }
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update department' 
    });
  }
});

// Soft delete department (set isActive to false)
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid department ID' 
      });
    }

    if (!global.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const departmentsCollection = global.db.collection('departments');
    const employeesCollection = global.db.collection('employees');

    // Check if department has active employees
    const employeeCount = await employeesCollection.countDocuments({
      departmentId: new ObjectId(id),
      isActive: true
    });

    if (employeeCount > 0) {
      return res.status(409).json({ 
        success: false, 
        error: `Cannot delete department. ${employeeCount} active employees are assigned to this department.`,
        details: { activeEmployees: employeeCount }
      });
    }

    const result = await departmentsCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isActive: false, 
          updatedAt: new Date() 
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Department not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Department deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete department' 
    });
  }
});

// Get employees by department
router.get('/:id/employees', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid department ID' 
      });
    }

    if (!global.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const employeesCollection = global.db.collection('employees');

    // Try both ObjectId and string formats for departmentId
    const employees = await employeesCollection
      .find({ 
        $or: [
          { departmentId: new ObjectId(id) },
          { departmentId: id }
        ],
        isActive: true 
      })
      .sort({ name: 1 })
      .toArray();

    console.log(`🔍 Looking for employees in department ${id}, found ${employees.length} employees`);

    const formattedEmployees = employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      position: emp.position,
      email: emp.email,
      hireDate: emp.hireDate
    }));

    res.json({ 
      success: true, 
      employees: formattedEmployees 
    });
  } catch (error) {
    console.error('Error fetching department employees:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch department employees' 
    });
  }
});

// Get payrolls by department
router.get('/:id/payrolls', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid department ID' 
      });
    }

    if (!global.db) {
      return res.status(500).json({ error: 'Database connection not available' });
    }
    
    const employeesCollection = global.db.collection('employees');
    const payrollCollection = global.db.collection('payroll');

    // First get all employees in this department
    const employees = await employeesCollection
      .find({ 
        $or: [
          { departmentId: new ObjectId(id) },
          { departmentId: id }
        ],
        isActive: true 
      })
      .toArray();

    console.log(`🔍 Looking for payrolls in department ${id}, found ${employees.length} employees`);

    const employeeIds = employees.map(emp => emp._id.toString());

    // Get payrolls for these employees
    const payrolls = await payrollCollection
      .find({ 
        employeeId: { $in: employeeIds }
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Format payrolls with employee details
    const formattedPayrolls = payrolls.map(payroll => {
      const employee = employees.find(emp => emp._id.toString() === payroll.employeeId);
      
      return {
        id: payroll._id.toString(),
        employeeId: payroll.employeeId,
        employeeName: employee ? employee.name : 'Unknown Employee',
        period: `${payroll.cutoffStart} - ${payroll.cutoffEnd}`,
        basicSalary: payroll.basicSalary || 0,
        allowances: (payroll.holidayPay || 0) + (payroll.nightDifferential || 0) + (payroll.salaryAdjustment || 0),
        deductions: (payroll.absences || 0) + (payroll.lateDeductions || 0) + (payroll.sssContribution || 0) + (payroll.philhealthContribution || 0) + (payroll.pagibigContribution || 0) + (payroll.withholdingTax || 0),
        netSalary: payroll.netPay || 0,
        status: payroll.status || 'pending',
        createdAt: payroll.createdAt
      };
    });

    res.json({ 
      success: true, 
      payrolls: formattedPayrolls 
    });
  } catch (error) {
    console.error('Error fetching department payrolls:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch department payrolls' 
    });
  }
});

module.exports = router;
