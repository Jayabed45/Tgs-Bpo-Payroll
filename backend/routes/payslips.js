const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { clientPromise } = require('../config/database');
const { verifyAdminToken } = require('./auth');
const PDFDocument = require('pdfkit');

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
    const db = client.db();
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
    
    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    const filename = `payslip-${payslip.employeeName.replace(/\s+/g, '-')}-${new Date().getTime()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Pipe PDF to response
    doc.pipe(res);
    
    // Generate PDF content
    generatePayslipPDF(doc, payroll, payslip);
    
    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error downloading payslip:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download payslip'
    });
  }
});

// Helper function to generate payslip PDF content
function generatePayslipPDF(doc, payroll, payslip) {
  const cutoffStart = new Date(payroll.cutoffStart).toLocaleDateString();
  const cutoffEnd = new Date(payroll.cutoffEnd).toLocaleDateString();
  const generatedDate = new Date(payslip.generatedAt).toLocaleDateString();
  
  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('TGS BPO PAYROLL SYSTEM', { align: 'center' });
  doc.fontSize(14).font('Helvetica').text('Official Payslip', { align: 'center' });
  doc.moveDown(1.5);
  
  // Employee Information Section
  doc.fontSize(12).font('Helvetica-Bold').text('Employee Information:');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Name: ${payroll.employeeName}`);
  doc.text(`ID: ${payroll.employeeId}`);
  doc.text(`Cutoff Period: ${cutoffStart} - ${cutoffEnd}`);
  doc.moveDown(1);
  
  // Payroll Summary Section
  doc.fontSize(12).font('Helvetica-Bold').text('Payroll Summary:');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Status: ${payroll.status}`);
  doc.text(`Generated: ${generatedDate}`);
  doc.moveDown(1);
  
  // Earnings & Deductions Summary
  doc.fontSize(12).font('Helvetica-Bold').text('Earnings & Deductions:');
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica');
  doc.text(`Gross Pay: ₱${payroll.grossPay?.toLocaleString() || '0'}`);
  doc.text(`Total Deductions: ₱${payroll.totalDeductions?.toLocaleString() || '0'}`);
  doc.fontSize(11).font('Helvetica-Bold');
  doc.text(`Net Pay: ₱${payroll.netPay?.toLocaleString() || '0'}`);
  doc.moveDown(1);
  
  // Detailed Breakdown - Earnings
  doc.fontSize(12).font('Helvetica-Bold').text('Detailed Breakdown:');
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica-Bold').text('Earnings:');
  doc.fontSize(10).font('Helvetica');
  doc.text(`  Basic Salary: ₱${payroll.basicSalary?.toLocaleString() || '0'}`);
  doc.text(`  Holiday Pay: ₱${payroll.holidayPay?.toLocaleString() || '0'}`);
  doc.text(`  Night Differential: ₱${payroll.nightDifferential?.toLocaleString() || '0'}`);
  doc.text(`  Salary Adjustment: ₱${payroll.salaryAdjustment?.toLocaleString() || '0'}`);
  doc.moveDown(0.5);
  
  // Detailed Breakdown - Deductions
  doc.fontSize(11).font('Helvetica-Bold').text('Deductions:');
  doc.fontSize(10).font('Helvetica');
  doc.text(`  Absences: ₱${payroll.absences?.toLocaleString() || '0'}`);
  doc.text(`  Late Deductions: ₱${payroll.lateDeductions?.toLocaleString() || '0'}`);
  doc.text(`  SSS Contribution: ₱${payroll.sssContribution?.toLocaleString() || '0'}`);
  doc.text(`  PhilHealth Contribution: ₱${payroll.philhealthContribution?.toLocaleString() || '0'}`);
  doc.text(`  Pag-IBIG Contribution: ₱${payroll.pagibigContribution?.toLocaleString() || '0'}`);
  doc.text(`  Withholding Tax: ₱${payroll.withholdingTax?.toLocaleString() || '0'}`);
  doc.moveDown(2);
  
  // Footer
  doc.fontSize(8).font('Helvetica-Oblique');
  doc.text('This is an official payslip generated by TGS BPO Payroll System.', { align: 'center' });
  doc.text(`Generated on: ${generatedDate}`, { align: 'center' });
}

// Delete a payslip
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await clientPromise;
    const db = client.db();
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
