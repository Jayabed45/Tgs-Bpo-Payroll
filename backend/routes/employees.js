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

    const employees = await employeesCollection
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedEmployees = employees.map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      position: emp.position,
      salary: emp.salary,
      workingDays: emp.workingDays,
      sssNumber: emp.sssNumber,
      philhealthNumber: emp.philhealthNumber,
      pagibigNumber: emp.pagibigNumber,
      email: emp.email,
      contactNumber: emp.contactNumber,
      hireDate: emp.hireDate,
      isActive: emp.isActive,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt
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
      name: employee.name,
      position: employee.position,
      salary: employee.salary,
      workingDays: employee.workingDays,
      sssNumber: employee.sssNumber,
      philhealthNumber: employee.philhealthNumber,
      pagibigNumber: employee.pagibigNumber,
      email: employee.email,
      contactNumber: employee.contactNumber,
      hireDate: employee.hireDate,
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

    // Insert employee
    const result = await employeesCollection.insertOne(employee.toMongoDoc());

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

    // Start a session for transaction-like behavior
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Delete all payrolls associated with this employee
        const payrollDeleteResult = await payrollCollection.deleteMany(
          { employeeId: id },
          { session }
        );
        
        // Permanently delete the employee
        const employeeDeleteResult = await employeesCollection.deleteOne(
          { _id: new ObjectId(id) },
          { session }
        );

        if (employeeDeleteResult.deletedCount === 0) {
          throw new Error('Failed to delete employee');
        }

        console.log(`Deleted employee ${id} and ${payrollDeleteResult.deletedCount} associated payrolls`);
      });
    } finally {
      await session.endSession();
    }

    res.json({
      success: true,
      message: 'Employee and all associated payrolls deleted permanently'
    });

  } catch (error) {
    console.error('Delete employee error:', error);
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
