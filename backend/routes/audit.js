const express = require('express');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { verifyAdminToken } = require('./auth');
const {
  buildFilters,
  queryLogs,
  getRealtimeStats,
  buildSignedExportPayload,
  toCSV,
  deleteLogById,
  deleteLogsByFilter,
  logActivity,
} = require('../services/auditLogger');

const router = express.Router();

router.use(verifyAdminToken);

router.get('/logs', async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const result = await queryLogs(filters, {
      page: req.query.page,
      pageSize: req.query.pageSize,
    });

    res.json({
      success: true,
      filters,
      ...result,
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours || '24', 10);
    const stats = await getRealtimeStats(hours);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Fetch audit stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch audit stats' });
  }
});

router.get('/export', async (req, res) => {
  try {
    const format = (req.query.format || 'json').toLowerCase();
    const filters = buildFilters(req.query);
    const { logs } = await queryLogs(filters, {
      page: 1,
      pageSize: parseInt(req.query.maxRows || '5000', 10),
    });

    const { payload, signature } = buildSignedExportPayload(logs, filters, format);
    const filenameBase = `audit-logs-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    res.setHeader('X-Audit-Export-Signature', signature);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.json"`);
      return res.send(JSON.stringify({ ...payload, signature }, null, 2));
    }

    if (format === 'csv') {
      const csv = toCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      res.setHeader('X-Content-Signature', signature);
      return res.send(csv);
    }

    if (format === 'xlsx' || format === 'excel') {
      const wb = XLSX.utils.book_new();
      const rows = logs.map((log) => ({
        timestampUtc: log.timestampUtc,
        timezone: log.timezone,
        userId: log.userId,
        username: log.username,
        ipAddress: log.ipAddress,
        actionType: log.actionType,
        module: log.module,
        entity: log.entity,
        recordId: log.recordId,
        operationStatus: log.operationStatus,
        errorDetails: log.errorDetails || '',
        checksum: log.checksum,
        previousChecksum: log.previousChecksum || '',
        oldValues: JSON.stringify(log.oldValues || {}),
        newValues: JSON.stringify(log.newValues || {}),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
      const metaSheet = XLSX.utils.json_to_sheet([
        {
          generatedAt: payload.generatedAt,
          timezone: payload.timezone,
          rowCount: payload.rowCount,
          signature,
        },
      ]);
      XLSX.utils.book_append_sheet(wb, metaSheet, 'Signature');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      doc.pipe(res);
      doc.fontSize(14).text('Audit Logs Export', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).text(`Generated At: ${payload.generatedAt}`);
      doc.text(`Timezone: ${payload.timezone}`);
      doc.text(`Rows: ${payload.rowCount}`);
      doc.text(`Signature: ${signature}`);
      doc.moveDown();

      logs.slice(0, 200).forEach((log, index) => {
        doc.fontSize(9).text(
          `${index + 1}. ${log.timestampUtc} | ${log.username || 'unknown'} (${log.userId || '-'}) | ${log.actionType} | ${log.module} | ${log.operationStatus}`
        );
        if (log.recordId) doc.text(`Record: ${log.recordId}`);
        if (log.errorDetails) doc.text(`Error: ${log.errorDetails}`);
        doc.text(`Checksum: ${log.checksum}`);
        doc.moveDown(0.3);
      });

      doc.end();
      return;
    }

    return res.status(400).json({
      success: false,
      error: 'Unsupported format. Use json, csv, xlsx, or pdf.',
    });
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to export audit logs' });
  }
});

router.delete('/logs', async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const result = await deleteLogsByFilter(filters);
    
    res.json({ 
      success: true, 
      message: `${result.deletedCount} logs deleted successfully`,
      deletedCount: result.deletedCount
    });

    logActivity(req, {
      actionType: 'delete',
      module: 'system',
      entity: 'audit_logs',
      status: 'success',
      user: req.user,
      metadata: { 
        isBulk: true, 
        deletedCount: result.deletedCount,
        filters 
      },
    });
  } catch (error) {
    console.error('Delete all audit logs error:', error);
    logActivity(req, {
      actionType: 'delete',
      module: 'system',
      entity: 'audit_logs',
      status: 'failure',
      user: req.user,
      metadata: { isBulk: true },
      errorDetails: error.message,
    });
    res.status(500).json({ success: false, error: 'Failed to delete audit logs' });
  }
});

router.delete('/logs/:id', async (req, res) => {
  try {
    const result = await deleteLogById(req.params.id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Log not found' });
    }
    res.json({ success: true, message: 'Log deleted successfully' });

    logActivity(req, {
      actionType: 'delete',
      module: 'system',
      entity: 'audit_logs',
      status: 'success',
      user: req.user,
      recordId: req.params.id,
    });
  } catch (error) {
    console.error('Delete audit log error:', error);
    logActivity(req, {
      actionType: 'delete',
      module: 'system',
      entity: 'audit_logs',
      status: 'failure',
      user: req.user,
      recordId: req.params.id,
      errorDetails: error.message,
    });
    res.status(500).json({ success: false, error: 'Failed to delete audit log' });
  }
});

router.patch('/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { acknowledgeAlert } = require('../services/auditLogger');
    const success = await acknowledgeAlert(req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({ success: true, message: 'Alert acknowledged successfully' });

    logActivity(req, {
      actionType: 'update',
      module: 'system',
      entity: 'audit_alerts',
      status: 'success',
      user: req.user,
      recordId: req.params.id,
      metadata: { action: 'acknowledge' },
    });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge alert' });
  }
});

router.delete('/alerts/:id', async (req, res) => {
  try {
    const { deleteAlert } = require('../services/auditLogger');
    const success = await deleteAlert(req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    
    res.json({ success: true, message: 'Alert deleted successfully' });

    logActivity(req, {
      actionType: 'delete',
      module: 'system',
      entity: 'audit_alerts',
      status: 'success',
      user: req.user,
      recordId: req.params.id,
    });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete alert' });
  }
});

module.exports = router;
