const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { clientPromise } = require('../config/database');
const { verifyAdminToken } = require('./auth');

// Apply admin authentication middleware to all routes
router.use(verifyAdminToken);

// Get all payslips
router.get('/', async (req, res) => {
  try {
    const client = await clientPromise;
    const db = client.db();
    const payslipsCollection = db.collection('payslips');
    
    const payslips = await payslipsCollection.find({}).toArray();
    
    res.json({
      success: true,
      payslips: payslips,
      total: payslips.length
    });
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payslips'
    });
  }
});

// Get a specific payslip
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await clientPromise;
    const db = client.db();
    const payslipsCollection = db.collection('payslips');
    
    const payslip = await payslipsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!payslip) {
      return res.status(404).json({
        success: false,
        error: 'Payslip not found'
      });
    }
    
    res.json({
      success: true,
      payslip: payslip
    });
  } catch (error) {
    console.error('Error fetching payslip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payslip'
    });
  }
});

// Generate a new payslip from payroll
router.post('/generate', async (req, res) => {
  try {
    const { payrollId } = req.body;
    
    if (!payrollId) {
      return res.status(400).json({
        success: false,
        error: 'Payroll ID is required'
      });
    }
    
    const client = await clientPromise;
    const db = client.db();
    const payrollCollection = db.collection('payroll');
    const payslipsCollection = db.collection('payslips');
    
    // Get the payroll data
    const payroll = await payrollCollection.findOne({ _id: new ObjectId(payrollId) });
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Payroll not found'
      });
    }
    
    // Check if payslip already exists for this payroll
    const existingPayslip = await payslipsCollection.findOne({ payrollId: payrollId });
    
    if (existingPayslip) {
      return res.status(400).json({
        success: false,
        error: 'Payslip already exists for this payroll'
      });
    }
    
    // Create payslip data
    const payslipData = {
      payrollId: payrollId,
      employeeId: payroll.employeeId,
      employeeName: payroll.employeeName,
      cutoffPeriod: `${new Date(payroll.cutoffStart).toLocaleDateString()} - ${new Date(payroll.cutoffEnd).toLocaleDateString()}`,
      netPay: payroll.netPay,
      generatedAt: new Date().toISOString(),
      status: 'generated'
    };
    
    // Insert the payslip
    const result = await payslipsCollection.insertOne(payslipData);
    
    // Get the created payslip
    const createdPayslip = await payslipsCollection.findOne({ _id: result.insertedId });
    
    res.json({
      success: true,
      payslip: createdPayslip,
      message: 'Payslip generated successfully'
    });
  } catch (error) {
    console.error('Error generating payslip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate payslip'
    });
  }
});

// Download payslip (returns PDF data)
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await clientPromise;
    const db = client.db('payroll');
    const payslipsCollection = db.collection('payslips');
    const payrollCollection = db.collection('payroll');
    
    // Get the payslip
    const payslip = await payslipsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!payslip) {
      return res.status(404).json({
        success: false,
        error: 'Payslip not found'
      });
    }
    
    // Get the associated payroll data
    const payroll = await payrollCollection.findOne({ _id: new ObjectId(payslip.payrollId) });
    
    if (!payroll) {
      return res.status(404).json({
        success: false,
        error: 'Associated payroll not found'
      });
    }
    
    // For now, we'll return a simple text representation
    // In a real implementation, you would generate a proper PDF here
    const payslipContent = generatePayslipText(payroll, payslip);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="payslip-${payslip.employeeName}-${payslip.cutoffPeriod}.txt"`);
    
    res.send(payslipContent);
  } catch (error) {
    console.error('Error downloading payslip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download payslip'
    });
  }
});

// Helper function to generate payslip text content
function generatePayslipText(payroll, payslip) {
  const cutoffStart = new Date(payroll.cutoffStart).toLocaleDateString();
  const cutoffEnd = new Date(payroll.cutoffEnd).toLocaleDateString();
  const generatedDate = new Date(payslip.generatedAt).toLocaleDateString();
  
  return `
TGS BPO PAYROLL SYSTEM
Official Payslip

Employee Information:
Name: ${payroll.employeeName}
ID: ${payroll.employeeId}
Cutoff Period: ${cutoffStart} - ${cutoffEnd}

Payroll Summary:
Status: ${payroll.status}
Generated: ${generatedDate}

Earnings & Deductions:
Gross Pay: ₱${payroll.grossPay?.toLocaleString() || '0'}
Total Deductions: ₱${payroll.totalDeductions?.toLocaleString() || '0'}
Net Pay: ₱${payroll.netPay?.toLocaleString() || '0'}

Detailed Breakdown:

Earnings:
- Basic Salary: ₱${payroll.basicSalary?.toLocaleString() || '0'}
- Holiday Pay: ₱${payroll.holidayPay?.toLocaleString() || '0'}
- Night Differential: ₱${payroll.nightDifferential?.toLocaleString() || '0'}
- Salary Adjustment: ₱${payroll.salaryAdjustment?.toLocaleString() || '0'}

Deductions:
- Absences: ₱${payroll.absences?.toLocaleString() || '0'}
- Late Deductions: ₱${payroll.lateDeductions?.toLocaleString() || '0'}
- SSS Contribution: ₱${payroll.sssContribution?.toLocaleString() || '0'}
- PhilHealth Contribution: ₱${payroll.philhealthContribution?.toLocaleString() || '0'}
- Pag-IBIG Contribution: ₱${payroll.pagibigContribution?.toLocaleString() || '0'}
- Withholding Tax: ₱${payroll.withholdingTax?.toLocaleString() || '0'}

---
This is an official payslip generated by TGS BPO Payroll System.
Generated on: ${generatedDate}
  `.trim();
}

// Delete a payslip
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await clientPromise;
    const db = client.db('payroll');
    const payslipsCollection = db.collection('payslips');
    
    const result = await payslipsCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Payslip not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Payslip deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting payslip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payslip'
    });
  }
});

module.exports = router;
