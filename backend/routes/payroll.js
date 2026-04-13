const express = require('express');
const { ObjectId } = require('mongodb');
const { clientPromise } = require('../config/database');
const Payroll = require('../models/Payroll');

const router = express.Router();

const parseNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[,\s]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const resolveAllowance = (payrollValue, employeeValue, defaultValue) => {
  const fromPayroll = parseNumber(payrollValue, 0);
  if (payrollValue !== undefined && payrollValue !== null && fromPayroll !== 0) return fromPayroll;
  const fromEmployee = parseNumber(employeeValue, 0);
  if (employeeValue !== undefined && employeeValue !== null && fromEmployee !== 0) return fromEmployee;
  return parseNumber(defaultValue, 0);
};

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
    const settingsDoc = await db.collection('settings').findOne({ type: 'system' });
    const defaultAllowances = (settingsDoc && settingsDoc.data && settingsDoc.data.defaultAllowances) ? settingsDoc.data.defaultAllowances : {};

    const payrolls = await payrollCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Get employee details for each payroll
    const payrollsWithEmployeeDetails = await Promise.all(
      payrolls.map(async (payroll) => {
        let employee = null;
        
        // Only try to find employee if employeeId is a valid ObjectId
        if (payroll.employeeId && ObjectId.isValid(payroll.employeeId)) {
          try {
            employee = await employeesCollection.findOne({ 
              _id: new ObjectId(payroll.employeeId) 
            });
          } catch (error) {
            console.error(`Error finding employee for payroll ${payroll._id}:`, error);
          }
        }
        
        return {
          id: payroll._id.toString(),
          employeeId: payroll.employeeId,
          employeeCode: payroll.employeeCode || employee?.employeeCode || '',
          employeeName: employee ? employee.name : (payroll.employeeName || 'Unknown Employee'),
          siteLocation: payroll.siteLocation || employee?.siteLocation || '',
          cutoffStart: payroll.cutoffStart,
          cutoffEnd: payroll.cutoffEnd,
          dailyHours: payroll.dailyHours || {},
          totalWorkedHours: payroll.totalWorkedHours || 0,
          basicSalary: payroll.basicSalary,
          hourlyRate: payroll.hourlyRate || employee?.hourlyRate || 0,
          workedHours: payroll.workedHours,
          regularOT: payroll.regularOT || 0,
          restDayOT: payroll.restDayOT || 0,
          specialHolidayOT: payroll.specialHolidayOT || 0,
          overtimeHours: payroll.overtimeHours,
          specialHolidayHours: payroll.specialHolidayHours || 0,
          legalHolidayHours: payroll.legalHolidayHours || 0,
          holidayPay: payroll.holidayPay,
          silHours: payroll.silHours || 0,
          silCredits: payroll.silCredits || 0,
          silTenureCredits: payroll.silTenureCredits || 0,
          ctoHours: payroll.ctoHours || 0,
          phHolidayNotWorking: payroll.phHolidayNotWorking || 0,
          nightDifferential: payroll.nightDifferential,
          nightDifferentialHours: payroll.nightDifferentialHours || 0,
          complexityAllowance: resolveAllowance(payroll.complexityAllowance, employee?.complexityAllowance, defaultAllowances.complexityAllowance),
          observationalAllowance: resolveAllowance(payroll.observationalAllowance, employee?.observationalAllowance, defaultAllowances.observationalAllowance),
          foodAllowance: resolveAllowance(payroll.foodAllowance, employee?.foodAllowance, defaultAllowances.foodAllowance),
          transportationAllowance: resolveAllowance(payroll.transportationAllowance, employee?.transportationAllowance, defaultAllowances.transportationAllowance),
          communicationsAllowance: resolveAllowance(payroll.communicationsAllowance, employee?.communicationsAllowance, defaultAllowances.communicationsAllowance),
          internetAllowance: resolveAllowance(payroll.internetAllowance, employee?.internetAllowance, defaultAllowances.internetAllowance),
          riceSubsidyAllowance: resolveAllowance(payroll.riceSubsidyAllowance, employee?.riceSubsidyAllowance, defaultAllowances.riceSubsidyAllowance),
          clothingAllowance: resolveAllowance(payroll.clothingAllowance, employee?.clothingAllowance, defaultAllowances.clothingAllowance),
          laundryAllowance: resolveAllowance(payroll.laundryAllowance, employee?.laundryAllowance, defaultAllowances.laundryAllowance),
          allowance: payroll.allowance || 0,
          salaryAdjustment: payroll.salaryAdjustment,
          absences: payroll.absences,
          lateDeductions: payroll.lateDeductions,
          sssContribution: payroll.sssContribution,
          philhealthContribution: payroll.philhealthContribution,
          pagibigContribution: payroll.pagibigContribution,
          withholdingTax: payroll.withholdingTax,
          grossPay: (() => {
            const calculated = new Payroll({
              ...payroll,
              employeeName: employee ? employee.name : (payroll.employeeName || 'Unknown Employee'),
              complexityAllowance: resolveAllowance(payroll.complexityAllowance, employee?.complexityAllowance, defaultAllowances.complexityAllowance),
              observationalAllowance: resolveAllowance(payroll.observationalAllowance, employee?.observationalAllowance, defaultAllowances.observationalAllowance),
              foodAllowance: resolveAllowance(payroll.foodAllowance, employee?.foodAllowance, defaultAllowances.foodAllowance),
              transportationAllowance: resolveAllowance(payroll.transportationAllowance, employee?.transportationAllowance, defaultAllowances.transportationAllowance),
              communicationsAllowance: resolveAllowance(payroll.communicationsAllowance, employee?.communicationsAllowance, defaultAllowances.communicationsAllowance),
              internetAllowance: resolveAllowance(payroll.internetAllowance, employee?.internetAllowance, defaultAllowances.internetAllowance),
              riceSubsidyAllowance: resolveAllowance(payroll.riceSubsidyAllowance, employee?.riceSubsidyAllowance, defaultAllowances.riceSubsidyAllowance),
              clothingAllowance: resolveAllowance(payroll.clothingAllowance, employee?.clothingAllowance, defaultAllowances.clothingAllowance),
              laundryAllowance: resolveAllowance(payroll.laundryAllowance, employee?.laundryAllowance, defaultAllowances.laundryAllowance),
            }).calculateAll();
            return calculated.grossPay;
          })(),
          totalDeductions: (() => {
            const calculated = new Payroll({
              ...payroll,
              employeeName: employee ? employee.name : (payroll.employeeName || 'Unknown Employee'),
              complexityAllowance: resolveAllowance(payroll.complexityAllowance, employee?.complexityAllowance, defaultAllowances.complexityAllowance),
              observationalAllowance: resolveAllowance(payroll.observationalAllowance, employee?.observationalAllowance, defaultAllowances.observationalAllowance),
              foodAllowance: resolveAllowance(payroll.foodAllowance, employee?.foodAllowance, defaultAllowances.foodAllowance),
              transportationAllowance: resolveAllowance(payroll.transportationAllowance, employee?.transportationAllowance, defaultAllowances.transportationAllowance),
              communicationsAllowance: resolveAllowance(payroll.communicationsAllowance, employee?.communicationsAllowance, defaultAllowances.communicationsAllowance),
              internetAllowance: resolveAllowance(payroll.internetAllowance, employee?.internetAllowance, defaultAllowances.internetAllowance),
              riceSubsidyAllowance: resolveAllowance(payroll.riceSubsidyAllowance, employee?.riceSubsidyAllowance, defaultAllowances.riceSubsidyAllowance),
              clothingAllowance: resolveAllowance(payroll.clothingAllowance, employee?.clothingAllowance, defaultAllowances.clothingAllowance),
              laundryAllowance: resolveAllowance(payroll.laundryAllowance, employee?.laundryAllowance, defaultAllowances.laundryAllowance),
            }).calculateAll();
            return calculated.totalDeductions;
          })(),
          netPay: (() => {
            const calculated = new Payroll({
              ...payroll,
              employeeName: employee ? employee.name : (payroll.employeeName || 'Unknown Employee'),
              complexityAllowance: resolveAllowance(payroll.complexityAllowance, employee?.complexityAllowance, defaultAllowances.complexityAllowance),
              observationalAllowance: resolveAllowance(payroll.observationalAllowance, employee?.observationalAllowance, defaultAllowances.observationalAllowance),
              foodAllowance: resolveAllowance(payroll.foodAllowance, employee?.foodAllowance, defaultAllowances.foodAllowance),
              transportationAllowance: resolveAllowance(payroll.transportationAllowance, employee?.transportationAllowance, defaultAllowances.transportationAllowance),
              communicationsAllowance: resolveAllowance(payroll.communicationsAllowance, employee?.communicationsAllowance, defaultAllowances.communicationsAllowance),
              internetAllowance: resolveAllowance(payroll.internetAllowance, employee?.internetAllowance, defaultAllowances.internetAllowance),
              riceSubsidyAllowance: resolveAllowance(payroll.riceSubsidyAllowance, employee?.riceSubsidyAllowance, defaultAllowances.riceSubsidyAllowance),
              clothingAllowance: resolveAllowance(payroll.clothingAllowance, employee?.clothingAllowance, defaultAllowances.clothingAllowance),
              laundryAllowance: resolveAllowance(payroll.laundryAllowance, employee?.laundryAllowance, defaultAllowances.laundryAllowance),
            }).calculateAll();
            return calculated.netPay;
          })(),
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
    const employeesCollection = db.collection('employees');
    const settingsDoc = await db.collection('settings').findOne({ type: 'system' });
    const defaultAllowances = (settingsDoc && settingsDoc.data && settingsDoc.data.defaultAllowances) ? settingsDoc.data.defaultAllowances : {};

    const payroll = await payrollCollection.findOne({ _id: new ObjectId(id) });

    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    let employee = null;
    if (payroll.employeeId && ObjectId.isValid(payroll.employeeId)) {
      try {
        employee = await employeesCollection.findOne({ _id: new ObjectId(payroll.employeeId) });
      } catch (error) {
        console.error(`Error finding employee for payroll ${payroll._id}:`, error);
      }
    }

    const resolvedAllowances = {
      complexityAllowance: resolveAllowance(payroll.complexityAllowance, employee?.complexityAllowance, defaultAllowances.complexityAllowance),
      observationalAllowance: resolveAllowance(payroll.observationalAllowance, employee?.observationalAllowance, defaultAllowances.observationalAllowance),
      foodAllowance: resolveAllowance(payroll.foodAllowance, employee?.foodAllowance, defaultAllowances.foodAllowance),
      transportationAllowance: resolveAllowance(payroll.transportationAllowance, employee?.transportationAllowance, defaultAllowances.transportationAllowance),
      communicationsAllowance: resolveAllowance(payroll.communicationsAllowance, employee?.communicationsAllowance, defaultAllowances.communicationsAllowance),
      internetAllowance: resolveAllowance(payroll.internetAllowance, employee?.internetAllowance, defaultAllowances.internetAllowance),
      riceSubsidyAllowance: resolveAllowance(payroll.riceSubsidyAllowance, employee?.riceSubsidyAllowance, defaultAllowances.riceSubsidyAllowance),
      clothingAllowance: resolveAllowance(payroll.clothingAllowance, employee?.clothingAllowance, defaultAllowances.clothingAllowance),
      laundryAllowance: resolveAllowance(payroll.laundryAllowance, employee?.laundryAllowance, defaultAllowances.laundryAllowance),
    };

    const calculations = new Payroll({
      ...payroll,
      employeeName: payroll.employeeName || employee?.name,
      ...resolvedAllowances,
    }).calculateAll();

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
      complexityAllowance: resolvedAllowances.complexityAllowance,
      observationalAllowance: resolvedAllowances.observationalAllowance,
      foodAllowance: resolvedAllowances.foodAllowance,
      transportationAllowance: resolvedAllowances.transportationAllowance,
      communicationsAllowance: resolvedAllowances.communicationsAllowance,
      internetAllowance: resolvedAllowances.internetAllowance,
      riceSubsidyAllowance: resolvedAllowances.riceSubsidyAllowance,
      clothingAllowance: resolvedAllowances.clothingAllowance,
      laundryAllowance: resolvedAllowances.laundryAllowance,
      allowance: payroll.allowance || 0,
      salaryAdjustment: payroll.salaryAdjustment,
      absences: payroll.absences,
      lateDeductions: payroll.lateDeductions,
      sssContribution: payroll.sssContribution,
      philhealthContribution: payroll.philhealthContribution,
      pagibigContribution: payroll.pagibigContribution,
      withholdingTax: payroll.withholdingTax,
      grossPay: calculations.grossPay,
      totalDeductions: calculations.totalDeductions,
      netPay: calculations.netPay,
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
    const client = await clientPromise;
    const db = client.db();
    const employeesCollection = db.collection('employees');
    const settingsDoc = await db.collection('settings').findOne({ type: 'system' });
    const defaultAllowances = (settingsDoc && settingsDoc.data && settingsDoc.data.defaultAllowances) ? settingsDoc.data.defaultAllowances : {};

    let employee = null;
    if (payrollData.employeeId && ObjectId.isValid(payrollData.employeeId)) {
      employee = await employeesCollection.findOne({ _id: new ObjectId(payrollData.employeeId) });
    }

    const resolvedAllowances = {
      complexityAllowance: resolveAllowance(payrollData.complexityAllowance, employee?.complexityAllowance, defaultAllowances.complexityAllowance),
      observationalAllowance: resolveAllowance(payrollData.observationalAllowance, employee?.observationalAllowance, defaultAllowances.observationalAllowance),
      foodAllowance: resolveAllowance(payrollData.foodAllowance, employee?.foodAllowance, defaultAllowances.foodAllowance),
      transportationAllowance: resolveAllowance(payrollData.transportationAllowance, employee?.transportationAllowance, defaultAllowances.transportationAllowance),
      communicationsAllowance: resolveAllowance(payrollData.communicationsAllowance, employee?.communicationsAllowance, defaultAllowances.communicationsAllowance),
      internetAllowance: resolveAllowance(payrollData.internetAllowance, employee?.internetAllowance, defaultAllowances.internetAllowance),
      riceSubsidyAllowance: resolveAllowance(payrollData.riceSubsidyAllowance, employee?.riceSubsidyAllowance, defaultAllowances.riceSubsidyAllowance),
      clothingAllowance: resolveAllowance(payrollData.clothingAllowance, employee?.clothingAllowance, defaultAllowances.clothingAllowance),
      laundryAllowance: resolveAllowance(payrollData.laundryAllowance, employee?.laundryAllowance, defaultAllowances.laundryAllowance),
    };
    
    // Create payroll instance
    const payroll = new Payroll({ ...payrollData, ...resolvedAllowances });
    
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
      ...resolvedAllowances,
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
    const employeesCollection = db.collection('employees');
    const settingsDoc = await db.collection('settings').findOne({ type: 'system' });
    const defaultAllowances = (settingsDoc && settingsDoc.data && settingsDoc.data.defaultAllowances) ? settingsDoc.data.defaultAllowances : {};

    // Check if payroll exists
    const existingPayroll = await payrollCollection.findOne({ _id: new ObjectId(id) });
    if (!existingPayroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    let employee = null;
    if (existingPayroll.employeeId && ObjectId.isValid(existingPayroll.employeeId)) {
      employee = await employeesCollection.findOne({ _id: new ObjectId(existingPayroll.employeeId) });
    }

    const resolvedAllowances = {
      complexityAllowance: resolveAllowance(updateData.complexityAllowance, employee?.complexityAllowance, defaultAllowances.complexityAllowance),
      observationalAllowance: resolveAllowance(updateData.observationalAllowance, employee?.observationalAllowance, defaultAllowances.observationalAllowance),
      foodAllowance: resolveAllowance(updateData.foodAllowance, employee?.foodAllowance, defaultAllowances.foodAllowance),
      transportationAllowance: resolveAllowance(updateData.transportationAllowance, employee?.transportationAllowance, defaultAllowances.transportationAllowance),
      communicationsAllowance: resolveAllowance(updateData.communicationsAllowance, employee?.communicationsAllowance, defaultAllowances.communicationsAllowance),
      internetAllowance: resolveAllowance(updateData.internetAllowance, employee?.internetAllowance, defaultAllowances.internetAllowance),
      riceSubsidyAllowance: resolveAllowance(updateData.riceSubsidyAllowance, employee?.riceSubsidyAllowance, defaultAllowances.riceSubsidyAllowance),
      clothingAllowance: resolveAllowance(updateData.clothingAllowance, employee?.clothingAllowance, defaultAllowances.clothingAllowance),
      laundryAllowance: resolveAllowance(updateData.laundryAllowance, employee?.laundryAllowance, defaultAllowances.laundryAllowance),
    };

    // Create new payroll instance with updated data
    const updatedPayroll = new Payroll({
      ...existingPayroll,
      ...updateData,
      ...resolvedAllowances
    });

    // Recalculate all values
    const calculations = updatedPayroll.calculateAll();

    // Update payroll
    const result = await payrollCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
          ...updateData,
          ...resolvedAllowances,
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
