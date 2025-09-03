const express = require('express');
const { ObjectId } = require('mongodb');
const { clientPromise } = require('../config/database');
const Payroll = require('../models/Payroll');

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

// Get all payroll records
router.get('/', verifyAdminToken, async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');
    const employeesCollection = db.collection('employees');

    const payrolls = await payrollCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Get employee details for each payroll
    const payrollsWithEmployeeDetails = await Promise.all(
      payrolls.map(async (payroll) => {
        const employee = await employeesCollection.findOne({ 
          _id: new ObjectId(payroll.employeeId) 
        });
        
        return {
          id: payroll._id.toString(),
          employeeId: payroll.employeeId,
          employeeName: employee ? employee.name : 'Unknown Employee',
          cutoffStart: payroll.cutoffStart,
          cutoffEnd: payroll.cutoffEnd,
          basicSalary: payroll.basicSalary,
          workedHours: payroll.workedHours,
          overtimeHours: payroll.overtimeHours,
          holidayPay: payroll.holidayPay,
          nightDifferential: payroll.nightDifferential,
          salaryAdjustment: payroll.salaryAdjustment,
          absences: payroll.absences,
          lateDeductions: payroll.lateDeductions,
          sssContribution: payroll.sssContribution,
          philhealthContribution: payroll.philhealthContribution,
          pagibigContribution: payroll.pagibigContribution,
          withholdingTax: payroll.withholdingTax,
          grossPay: payroll.grossPay,
          totalDeductions: payroll.totalDeductions,
          netPay: payroll.netPay,
          status: payroll.status,
          createdAt: payroll.createdAt,
          updatedAt: payroll.updatedAt
        };
      })
    );

    res.json({ 
      success: true, 
      payrolls: payrollsWithEmployeeDetails,
      total: payrollsWithEmployeeDetails.length
    });

  } catch (error) {
    console.error('Get payrolls error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payroll by ID
router.get('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid payroll ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');

    const payroll = await payrollCollection.findOne({ _id: new ObjectId(id) });

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    const formattedPayroll = {
      id: payroll._id.toString(),
      employeeId: payroll.employeeId,
      employeeName: payroll.employeeName,
      cutoffStart: payroll.cutoffStart,
      cutoffEnd: payroll.cutoffEnd,
      basicSalary: payroll.basicSalary,
      workedHours: payroll.workedHours,
      overtimeHours: payroll.overtimeHours,
      holidayPay: payroll.holidayPay,
      nightDifferential: payroll.nightDifferential,
      salaryAdjustment: payroll.salaryAdjustment,
      absences: payroll.absences,
      lateDeductions: payroll.lateDeductions,
      sssContribution: payroll.sssContribution,
      philhealthContribution: payroll.philhealthContribution,
      pagibigContribution: payroll.pagibigContribution,
      withholdingTax: payroll.withholdingTax,
      grossPay: payroll.grossPay,
      totalDeductions: payroll.totalDeductions,
      netPay: payroll.netPay,
      status: payroll.status,
      createdAt: payroll.createdAt,
      updatedAt: payroll.updatedAt
    };

    res.json({ success: true, payroll: formattedPayroll });

  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new payroll record
router.post('/', verifyAdminToken, async (req, res) => {
  try {
    const payrollData = req.body;
    
    // Create payroll instance
    const payroll = new Payroll(payrollData);
    
    // Validate payroll data
    const validationErrors = payroll.validate();
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    // Calculate all payroll values
    const calculations = payroll.calculateAll();

    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');

    // Insert payroll with calculated values
    const result = await payrollCollection.insertOne({
      ...payroll.toMongoDoc(),
      grossPay: calculations.grossPay,
      totalDeductions: calculations.totalDeductions,
      netPay: calculations.netPay
    });

    const createdPayroll = {
      id: result.insertedId.toString(),
      ...payrollData,
      grossPay: calculations.grossPay,
      totalDeductions: calculations.totalDeductions,
      netPay: calculations.netPay,
      status: payroll.status,
      createdAt: payroll.createdAt,
      updatedAt: payroll.updatedAt
    };

    res.status(201).json({
      success: true,
      message: 'Payroll record created successfully',
      payroll: createdPayroll,
      calculations
    });

  } catch (error) {
    console.error('Create payroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update payroll record
router.put('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid payroll ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');

    // Check if payroll exists
    const existingPayroll = await payrollCollection.findOne({ _id: new ObjectId(id) });
    if (!existingPayroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    // Create new payroll instance with updated data
    const updatedPayroll = new Payroll({
      ...existingPayroll,
      ...updateData
    });

    // Recalculate all values
    const calculations = updatedPayroll.calculateAll();

    // Update payroll
    const result = await payrollCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
          grossPay: calculations.grossPay,
          totalDeductions: calculations.totalDeductions,
          netPay: calculations.netPay,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    res.json({
      success: true,
      message: 'Payroll updated successfully',
      calculations
    });

  } catch (error) {
    console.error('Update payroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process payroll (change status to processed)
router.patch('/:id/process', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid payroll ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');

    const result = await payrollCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          status: 'processed',
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    res.json({
      success: true,
      message: 'Payroll processed successfully'
    });

  } catch (error) {
    console.error('Process payroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete payroll record (permanent delete)
router.delete('/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid payroll ID' });
    }

    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');

    // Check if payroll exists
    const existingPayroll = await payrollCollection.findOne({ _id: new ObjectId(id) });
    if (!existingPayroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    // Permanently delete the payroll
    const result = await payrollCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    res.json({
      success: true,
      message: 'Payroll deleted permanently'
    });

  } catch (error) {
    console.error('Delete payroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payroll statistics
router.get('/stats/overview', verifyAdminToken, async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');

    const totalPayrolls = await payrollCollection.countDocuments({});
    const pendingPayrolls = await payrollCollection.countDocuments({ status: 'pending' });
    const processedPayrolls = await payrollCollection.countDocuments({ status: 'processed' });
    const completedPayrolls = await payrollCollection.countDocuments({ status: 'completed' });

    // Get monthly payroll totals
    const monthlyStats = await payrollCollection.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalAmount: { $sum: '$netPay' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 6 }
    ]).toArray();

    const monthlyPayrollData = monthlyStats.map(stat => ({
      month: `${stat._id.year}-${String(stat._id.month).padStart(2, '0')}`,
      amount: stat.totalAmount,
      count: stat.count
    }));

    res.json({
      success: true,
      stats: {
        totalPayrolls,
        pendingPayrolls,
        processedPayrolls,
        completedPayrolls,
        monthlyPayrollData
      }
    });

  } catch (error) {
    console.error('Get payroll stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate payroll (recalculate without saving)
router.post('/calculate', verifyAdminToken, async (req, res) => {
  try {
    const payrollData = req.body;
    
    // Create payroll instance
    const payroll = new Payroll(payrollData);
    
    // Validate payroll data
    const validationErrors = payroll.validate();
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationErrors 
      });
    }

    // Calculate all payroll values
    const calculations = payroll.calculateAll();

    res.json({
      success: true,
      calculations,
      breakdown: {
        grossPay: payroll.grossPay,
        totalDeductions: payroll.totalDeductions,
        netPay: payroll.netPay,
        components: {
          basicSalary: payroll.basicSalary,
          holidayPay: payroll.holidayPay,
          nightDifferential: payroll.nightDifferential,
          salaryAdjustment: payroll.salaryAdjustment,
          absences: payroll.absences,
          lateDeductions: payroll.lateDeductions,
          sssContribution: payroll.sssContribution,
          philhealthContribution: payroll.philhealthContribution,
          pagibigContribution: payroll.pagibigContribution,
          withholdingTax: payroll.withholdingTax
        }
      }
    });

  } catch (error) {
    console.error('Calculate payroll error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
