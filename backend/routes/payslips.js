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
  const cutoffStart = new Date(payroll.cutoffStart).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const cutoffEnd = new Date(payroll.cutoffEnd).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const generatedDate = new Date(payslip.generatedAt).toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  const generatedTime = new Date(payslip.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 50;
  
  // ============================================
  // HEADER SECTION - Company Information
  // ============================================
  
  // Header border box
  doc.rect(margin, 30, pageWidth - (margin * 2), 65)
     .lineWidth(2)
     .stroke('#000000');
  
  // Company name
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('TGS BPO SERVICES', margin, 40, { align: 'center' });
  
  // Company tagline
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#000000')
     .text('Business Process Outsourcing Solutions', margin, 65, { align: 'center' });
  
  // Document title
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('EMPLOYEE PAYSLIP', margin, 80, { align: 'center' });
  
  // ============================================
  // DOCUMENT INFO BAR (Compact)
  // ============================================
  
  const infoBarY = 110;
  
  // Payslip ID
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#000000')
     .text('Payslip ID:', margin, infoBarY);
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(payslip._id.toString().slice(-8).toUpperCase(), margin + 55, infoBarY);
  
  // Pay Period (centered)
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#000000')
     .text('Pay Period:', pageWidth / 2 - 60, infoBarY);
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(`${cutoffStart} - ${cutoffEnd}`, pageWidth / 2 + 5, infoBarY);
  
  // Status (right aligned)
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#000000')
     .text('Status:', pageWidth - margin - 80, infoBarY);
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(payroll.status.toUpperCase(), pageWidth - margin - 45, infoBarY);
  
  // Divider line
  doc.moveTo(margin, infoBarY + 15)
     .lineTo(pageWidth - margin, infoBarY + 15)
     .strokeColor('#000000')
     .lineWidth(1)
     .stroke();
  
  // ============================================
  // EMPLOYEE INFORMATION (Compact)
  // ============================================
  
  const employeeInfoY = 135;
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('EMPLOYEE INFORMATION', margin, employeeInfoY);
  
  doc.moveTo(margin, employeeInfoY + 13)
     .lineTo(margin + 150, employeeInfoY + 13)
     .strokeColor('#000000')
     .lineWidth(1.5)
     .stroke();
  
  const empDetailsY = employeeInfoY + 22;
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#000000')
     .text('Name:', margin, empDetailsY);
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(payroll.employeeName, margin + 80, empDetailsY);
  
  doc.fontSize(9)
     .font('Helvetica')
     .fillColor('#000000')
     .text('Employee ID:', margin, empDetailsY + 15);
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(payroll.employeeId, margin + 80, empDetailsY + 15);
  
  // ============================================
  // TWO COLUMN LAYOUT - EARNINGS & DEDUCTIONS
  // ============================================
  
  const columnsY = 195;
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 10;
  const colWidth = (pageWidth - (margin * 2) - 20) / 2;
  
  // LEFT COLUMN - EARNINGS
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('EARNINGS', leftColX, columnsY);
  
  doc.moveTo(leftColX, columnsY + 13)
     .lineTo(leftColX + 70, columnsY + 13)
     .strokeColor('#000000')
     .lineWidth(1.5)
     .stroke();
  
  const earnings = [
    { label: 'Basic Salary', value: payroll.basicSalary || 0 },
    { label: 'Holiday Pay', value: payroll.holidayPay || 0 },
    { label: 'Night Differential', value: payroll.nightDifferential || 0 },
    { label: 'Salary Adjustment', value: payroll.salaryAdjustment || 0 }
  ];
  
  let earningsY = columnsY + 25;
  earnings.forEach((item, index) => {
    // Alternating background
    if (index % 2 === 0) {
      doc.rect(leftColX - 5, earningsY - 3, colWidth, 16)
         .fill('#f5f5f5');
    }
    
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#000000')
       .text(item.label, leftColX, earningsY);
    
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(`PHP ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
             leftColX + colWidth - 80, earningsY, { width: 75, align: 'right' });
    
    earningsY += 16;
  });
  
  // Gross Pay box
  doc.rect(leftColX - 5, earningsY + 2, colWidth, 20)
     .lineWidth(1.5)
     .stroke('#000000');
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('GROSS PAY', leftColX, earningsY + 7);
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(`PHP ${(payroll.grossPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
        leftColX + colWidth - 80, earningsY + 7, { width: 75, align: 'right' });
  
  // RIGHT COLUMN - DEDUCTIONS
  doc.fontSize(10)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('DEDUCTIONS', rightColX, columnsY);
  
  doc.moveTo(rightColX, columnsY + 13)
     .lineTo(rightColX + 85, columnsY + 13)
     .strokeColor('#000000')
     .lineWidth(1.5)
     .stroke();
  
  const deductions = [
    { label: 'Absences', value: payroll.absences || 0 },
    { label: 'Late Deductions', value: payroll.lateDeductions || 0 },
    { label: 'SSS Contribution', value: payroll.sssContribution || 0 },
    { label: 'PhilHealth', value: payroll.philhealthContribution || 0 },
    { label: 'Pag-IBIG', value: payroll.pagibigContribution || 0 },
    { label: 'Withholding Tax', value: payroll.withholdingTax || 0 }
  ];
  
  let deductionsY = columnsY + 25;
  deductions.forEach((item, index) => {
    // Alternating background
    if (index % 2 === 0) {
      doc.rect(rightColX - 5, deductionsY - 3, colWidth, 16)
         .fill('#f5f5f5');
    }
    
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#000000')
       .text(item.label, rightColX, deductionsY);
    
    doc.fontSize(8)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(`PHP ${item.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
             rightColX + colWidth - 80, deductionsY, { width: 75, align: 'right' });
    
    deductionsY += 16;
  });
  
  // Total Deductions box
  doc.rect(rightColX - 5, deductionsY + 2, colWidth, 20)
     .lineWidth(1.5)
     .stroke('#000000');
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('TOTAL DEDUCTIONS', rightColX, deductionsY + 7);
  
  doc.fontSize(9)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(`PHP ${(payroll.totalDeductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
        rightColX + colWidth - 80, deductionsY + 7, { width: 75, align: 'right' });
  
  // ============================================
  // NET PAY SECTION (Prominent Box)
  // ============================================
  
  const netPayY = Math.max(earningsY, deductionsY) + 40;
  
  // Double border box for emphasis
  doc.rect(margin, netPayY, pageWidth - (margin * 2), 35)
     .lineWidth(3)
     .stroke('#000000');
  
  doc.rect(margin + 5, netPayY + 5, pageWidth - (margin * 2) - 10, 25)
     .lineWidth(1)
     .stroke('#000000');
  
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text('NET PAY', margin + 15, netPayY + 12);
  
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(`PHP ${(payroll.netPay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
        pageWidth - margin - 150, netPayY + 11, { width: 135, align: 'right' });
  
  // ============================================
  // FOOTER SECTION
  // ============================================
  
  const footerY = netPayY + 55;
  
  // Footer divider line
  doc.moveTo(margin, footerY)
     .lineTo(pageWidth - margin, footerY)
     .strokeColor('#000000')
     .lineWidth(0.5)
     .stroke();
  
  // Footer content
  doc.fontSize(7)
     .font('Helvetica')
     .fillColor('#000000')
     .text('This is an official computer-generated payslip. No signature is required.', 
           margin, footerY + 8, { align: 'center', width: pageWidth - (margin * 2) });
  
  doc.fontSize(7)
     .font('Helvetica-Bold')
     .fillColor('#000000')
     .text(`Generated by: TGS BPO Payroll System | Date: ${generatedDate} at ${generatedTime}`, 
           margin, footerY + 20, { align: 'center', width: pageWidth - (margin * 2) });
  
  doc.fontSize(6)
     .font('Helvetica-Oblique')
     .fillColor('#000000')
     .text('For inquiries, please contact your HR department.', 
           margin, footerY + 32, { align: 'center', width: pageWidth - (margin * 2) });
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
