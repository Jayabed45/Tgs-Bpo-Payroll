const { ObjectId } = require('mongodb');

class ImportedPayroll {
  constructor(data) {
    this.fileName = data.fileName || 'Imported Payroll';
    this.cutoffStart = data.cutoffStart;
    this.cutoffEnd = data.cutoffEnd;
    
    // Store all sheets data from the Excel file
    this.sheets = data.sheets || {}; // { sheetName: { headers: [], rows: [], rowCount: number } }
    this.sheetNames = data.sheetNames || [];
    
    // Metadata
    this.employeeCount = data.employeeCount || 0;
    this.totalGrossPay = data.totalGrossPay || 0;
    this.totalNetPay = data.totalNetPay || 0;
    
    this.status = data.status || 'imported'; // imported, processed, completed
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static fromMongoDoc(doc) {
    if (!doc) return null;
    return {
      ...doc,
      id: doc._id.toString()
    };
  }

  toMongoDoc() {
    const doc = { ...this };
    delete doc.id;
    return doc;
  }
}

module.exports = ImportedPayroll;
