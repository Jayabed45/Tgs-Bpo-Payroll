const crypto = require('crypto');
const { ObjectId } = require('mongodb');

const DEFAULT_TIMEZONE = process.env.AUDIT_TIMEZONE || 'Asia/Manila';
const DEFAULT_RETENTION_YEARS = parseInt(process.env.AUDIT_RETENTION_YEARS || '7', 10);
const DEFAULT_ARCHIVE_AFTER_DAYS = parseInt(process.env.AUDIT_ARCHIVE_AFTER_DAYS || '365', 10);
const BULK_DELETE_ALERT_THRESHOLD = parseInt(process.env.AUDIT_BULK_DELETE_THRESHOLD || '10', 10);
const FAILED_LOGIN_ALERT_THRESHOLD = parseInt(process.env.AUDIT_FAILED_LOGIN_THRESHOLD || '5', 10);
const FAILED_LOGIN_WINDOW_MS = parseInt(process.env.AUDIT_FAILED_LOGIN_WINDOW_MS || `${15 * 60 * 1000}`, 10);
const UNUSUAL_ACTIVITY_WINDOW_MS = parseInt(process.env.AUDIT_UNUSUAL_ACTIVITY_WINDOW_MS || `${10 * 60 * 1000}`, 10);
const UNUSUAL_ACTIVITY_THRESHOLD = parseInt(process.env.AUDIT_UNUSUAL_ACTIVITY_THRESHOLD || '80', 10);

const queue = [];
let flushing = false;
let flushTimer = null;
let archiveTimer = null;
let failedLoginTracker = new Map();
let actionWindowTracker = new Map();

function getDb() {
  const db = global.db;
  if (!db) {
    throw new Error('Database connection unavailable for audit logging');
  }
  return db;
}

function getEncryptionKey() {
  const raw =
    process.env.AUDIT_LOG_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'tgs-payroll-audit-fallback-key';
  return crypto.createHash('sha256').update(raw).digest();
}

function getSigningKey() {
  const raw =
    process.env.AUDIT_EXPORT_SIGNING_KEY ||
    process.env.JWT_SECRET ||
    'tgs-payroll-audit-export-signature';
  return crypto.createHash('sha256').update(raw).digest();
}

function safeStringify(value) {
  try {
    return JSON.stringify(value || {});
  } catch (error) {
    return JSON.stringify({ serializationError: error.message });
  }
}

function encryptPayload(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const raw = safeStringify(payload);
  const encrypted = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    algorithm: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    value: encrypted.toString('base64'),
  };
}

function decryptPayload(encryptedPayload) {
  if (!encryptedPayload || !encryptedPayload.value || !encryptedPayload.iv || !encryptedPayload.tag) {
    return null;
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(encryptedPayload.iv, 'base64')
    );
    decipher.setAuthTag(Buffer.from(encryptedPayload.tag, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedPayload.value, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    return { decryptionError: error.message };
  }
}

function normalizeIp(ip) {
  if (!ip) return 'unknown';
  if (ip.startsWith('::ffff:')) return ip.substring(7);
  return ip;
}

function extractIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return normalizeIp(forwarded.split(',')[0].trim());
  }
  return normalizeIp(req.ip || req.socket?.remoteAddress || 'unknown');
}

function getTimestampInfo(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
  return {
    utc: now.toISOString(),
    timezone: DEFAULT_TIMEZONE,
    local: formatter.format(now),
  };
}

function addYears(date, years) {
  const next = new Date(date.getTime());
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function createDigest(record, previousChecksum) {
  const canonical = safeStringify({
    ...record,
    previousChecksum: previousChecksum || null,
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function signData(raw) {
  const hmac = crypto.createHmac('sha256', getSigningKey());
  hmac.update(raw);
  return hmac.digest('hex');
}

function cleanupTrackerMap(map, windowMs) {
  const now = Date.now();
  for (const [key, values] of map.entries()) {
    const trimmed = values.filter((ts) => now - ts <= windowMs);
    if (trimmed.length === 0) {
      map.delete(key);
    } else {
      map.set(key, trimmed);
    }
  }
}

function trackFailedLogin(entry) {
  const key = `${entry.userId || 'unknown'}:${entry.ipAddress || 'unknown'}`;
  const now = Date.now();
  const current = failedLoginTracker.get(key) || [];
  const updated = current.filter((ts) => now - ts <= FAILED_LOGIN_WINDOW_MS);
  updated.push(now);
  failedLoginTracker.set(key, updated);

  if (updated.length >= FAILED_LOGIN_ALERT_THRESHOLD) {
    sendSecurityAlert({
      type: 'multiple_failed_logins',
      severity: 'high',
      key,
      attempts: updated.length,
      windowMs: FAILED_LOGIN_WINDOW_MS,
      ipAddress: entry.ipAddress,
      userId: entry.userId,
      username: entry.username,
      timestamp: entry.timestampUtc,
    }).catch(() => {});
  }

  cleanupTrackerMap(failedLoginTracker, FAILED_LOGIN_WINDOW_MS);
}

function trackUnusualActivity(entry) {
  const key = `${entry.userId || 'unknown'}:${entry.ipAddress || 'unknown'}`;
  const now = Date.now();
  const current = actionWindowTracker.get(key) || [];
  const updated = current.filter((ts) => now - ts <= UNUSUAL_ACTIVITY_WINDOW_MS);
  updated.push(now);
  actionWindowTracker.set(key, updated);

  if (updated.length >= UNUSUAL_ACTIVITY_THRESHOLD) {
    sendSecurityAlert({
      type: 'unusual_access_pattern',
      severity: 'medium',
      key,
      events: updated.length,
      windowMs: UNUSUAL_ACTIVITY_WINDOW_MS,
      ipAddress: entry.ipAddress,
      userId: entry.userId,
      timestamp: entry.timestampUtc,
    }).catch(() => {});
  }

  cleanupTrackerMap(actionWindowTracker, UNUSUAL_ACTIVITY_WINDOW_MS);
}

async function sendToSiem(eventName, payload) {
  const webhook = process.env.SIEM_WEBHOOK_URL;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        source: 'tgs-payroll',
        payload,
      }),
    });
  } catch (error) {
    console.error('SIEM webhook error:', error.message);
  }
}

async function sendSecurityAlert(payload) {
  try {
    const db = getDb();
    await db.collection('audit_alerts').insertOne({
      ...payload,
      createdAt: new Date(),
      acknowledged: false,
    });
  } catch (error) {
    console.error('Failed to persist audit alert:', error.message);
  }

  await sendToSiem('security_alert', payload);
}

async function maybeCreateAlerts(entry) {
  if (entry.actionType === 'login' && entry.status === 'failure') {
    trackFailedLogin(entry);
  }

  if (entry.actionType === 'delete' && entry.status === 'success') {
    const count = parseInt(entry.metadata?.deletedCount || '1', 10);
    if (count >= BULK_DELETE_ALERT_THRESHOLD) {
      await sendSecurityAlert({
        type: 'bulk_delete',
        severity: 'high',
        userId: entry.userId,
        username: entry.username,
        deletedCount: count,
        module: entry.module,
        recordId: entry.recordId,
        ipAddress: entry.ipAddress,
        timestamp: entry.timestampUtc,
      });
    }
  }

  trackUnusualActivity(entry);
}

function enqueueAuditLog(payload) {
  queue.push(payload);
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushQueue().catch((error) => {
        console.error('Failed to flush audit queue:', error.message);
      });
    }, 300);
  }
}

async function flushQueue() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  try {
    const db = getDb();
    const activityCollection = db.collection('activity_logs');
    const snapshot = queue.splice(0, queue.length);

    const last = await activityCollection.find({}).sort({ createdAt: -1 }).limit(1).toArray();
    let previousChecksum = last[0]?.checksum || null;

    const docs = snapshot.map((entry) => {
      const record = {
        timestampUtc: entry.timestampUtc,
        timestampLocal: entry.timestampLocal,
        timezone: entry.timezone,
        userId: entry.userId || null,
        username: entry.username || null,
        userRole: entry.userRole || null,
        ipAddress: entry.ipAddress || 'unknown',
        userAgent: entry.userAgent || '',
        actionType: entry.actionType,
        module: entry.module,
        entity: entry.entity || null,
        recordId: entry.recordId || null,
        operationStatus: entry.status,
        errorDetails: entry.errorDetails || null,
        metadata: entry.metadata || {},
        previousChecksum,
        createdAt: new Date(entry.timestampUtc),
        expiresAt: addYears(new Date(entry.timestampUtc), DEFAULT_RETENTION_YEARS),
      };

      record.encryptedData = encryptPayload({
        oldValues: entry.oldValues || null,
        newValues: entry.newValues || null,
        errorStack: entry.errorStack || null,
        contextualData: entry.contextualData || null,
      });
      record.checksum = createDigest(record, previousChecksum);
      previousChecksum = record.checksum;
      return record;
    });

    if (docs.length > 0) {
      await activityCollection.insertMany(docs, { ordered: true });
      for (const doc of docs) {
        await maybeCreateAlerts({
          ...doc,
          status: doc.operationStatus,
          timestampUtc: doc.timestampUtc,
        });
        sendToSiem('audit_log', {
          timestampUtc: doc.timestampUtc,
          userId: doc.userId,
          username: doc.username,
          ipAddress: doc.ipAddress,
          actionType: doc.actionType,
          module: doc.module,
          entity: doc.entity,
          recordId: doc.recordId,
          operationStatus: doc.operationStatus,
          checksum: doc.checksum,
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Audit queue flush error:', error.message);
  } finally {
    flushing = false;
  }
}

function buildEntryFromRequest(req, payload) {
  const now = new Date();
  const ts = getTimestampInfo(now);
  const user = payload.user || req.user || {};
  const userId =
    user.userId ||
    user.id ||
    user._id ||
    payload.userId ||
    null;
  const username =
    user.name ||
    user.username ||
    user.email ||
    payload.username ||
    null;
  const userRole = user.role || payload.userRole || null;

  return {
    timestampUtc: ts.utc,
    timestampLocal: ts.local,
    timezone: ts.timezone,
    userId: userId ? String(userId) : null,
    username,
    userRole,
    ipAddress: payload.ipAddress || extractIp(req),
    userAgent: req.headers['user-agent'] || '',
    actionType: payload.actionType || 'read',
    module: payload.module || 'system',
    entity: payload.entity || null,
    recordId: payload.recordId ? String(payload.recordId) : null,
    status: payload.status || 'success',
    oldValues: payload.oldValues || null,
    newValues: payload.newValues || null,
    errorDetails: payload.errorDetails || null,
    errorStack: payload.errorStack || null,
    metadata: payload.metadata || {},
    contextualData: payload.contextualData || null,
  };
}

function logActivity(req, payload) {
  try {
    enqueueAuditLog(buildEntryFromRequest(req, payload));
  } catch (error) {
    console.error('logActivity error:', error.message);
  }
}

function inferActionType(method) {
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return 'read';
}

function inferModuleFromPath(path) {
  if (!path) return 'system';
  if (path.includes('/employees')) return 'employees';
  if (path.includes('/payroll')) return 'payroll';
  if (path.includes('/payslips')) return 'payslips';
  if (path.includes('/settings')) return 'settings';
  if (path.includes('/export')) return 'export';
  if (path.includes('/auth')) return 'auth';
  if (path.includes('/audit')) return 'audit';
  return 'system';
}

function shouldAutoLog(req) {
  // Keep auto-logging opt-in to avoid noisy/duplicate audit entries.
  // Primary audit events are logged explicitly in route handlers via logActivity().
  if (process.env.AUDIT_AUTO_LOG_ENABLED !== 'true') return false;

  const path = req.originalUrl || req.url || "";
  if (!path) return false;
  
  // Always skip health checks and any audit-related requests
  // This prevents viewing logs from creating more logs
  if (path.includes("/api/health")) return false;
  if (path.includes("/api/audit")) return false;
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return false;
  
  return true;
}

function auditRequestMiddleware(req, res, next) {
  const startedAt = Date.now();
  const path = req.originalUrl || req.url || '';
  const actionType = inferActionType(req.method);
  const moduleName = inferModuleFromPath(path);
  const ipAddress = extractIp(req);

  res.on('finish', () => {
    if (!shouldAutoLog(req)) return;
    if (res.statusCode < 200 || res.statusCode >= 600) return;

    const status = res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failure';
    const durationMs = Date.now() - startedAt;

    logActivity(req, {
      actionType,
      module: moduleName,
      entity: moduleName,
      recordId: req.params?.id || null,
      status,
      ipAddress,
      metadata: {
        method: req.method,
        path,
        statusCode: res.statusCode,
        durationMs,
        autoLogged: true,
      },
    });
  });

  next();
}

async function ensureIndexes() {
  const db = getDb();
  const collection = db.collection('activity_logs');
  await collection.createIndex({ createdAt: -1 });
  await collection.createIndex({ userId: 1, createdAt: -1 });
  await collection.createIndex({ actionType: 1, module: 1, createdAt: -1 });
  await collection.createIndex({ operationStatus: 1, createdAt: -1 });
  await collection.createIndex({ recordId: 1, createdAt: -1 });
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('audit_alerts').createIndex({ createdAt: -1 });
  await db.collection('audit_alerts').createIndex({ acknowledged: 1, createdAt: -1 });
}

async function runArchiver() {
  try {
    const db = getDb();
    const source = db.collection('activity_logs');
    const archive = db.collection('activity_logs_archive');
    const cutoff = new Date(Date.now() - DEFAULT_ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000);

    const docs = await source
      .find({ createdAt: { $lt: cutoff } })
      .sort({ createdAt: 1 })
      .limit(500)
      .toArray();

    if (docs.length === 0) return;

    await archive.insertMany(docs.map((d) => ({ ...d, archivedAt: new Date() })));
    const ids = docs.map((d) => d._id);
    await source.deleteMany({ _id: { $in: ids } });
  } catch (error) {
    console.error('Audit archiver error:', error.message);
  }
}

function startArchiver() {
  if (archiveTimer) return;
  archiveTimer = setInterval(() => {
    runArchiver().catch((error) => {
      console.error('Archiver interval error:', error.message);
    });
  }, 6 * 60 * 60 * 1000);
}

async function initializeAuditInfrastructure() {
  await ensureIndexes();
  startArchiver();
}

function buildFilters(query = {}) {
  const filter = {};

  if (query.userId) filter.userId = query.userId;
  if (query.username) filter.username = { $regex: query.username, $options: 'i' };
  if (query.actionType) filter.actionType = query.actionType;
  if (query.module) filter.module = query.module;
  if (query.operationStatus) filter.operationStatus = query.operationStatus;
  if (query.recordId) filter.recordId = query.recordId;
  if (query.ipAddress) filter.ipAddress = query.ipAddress;

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
    if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
  }

  if (query.searchText) {
    filter.$or = [
      { username: { $regex: query.searchText, $options: 'i' } },
      { module: { $regex: query.searchText, $options: 'i' } },
      { actionType: { $regex: query.searchText, $options: 'i' } },
      { entity: { $regex: query.searchText, $options: 'i' } },
      { recordId: { $regex: query.searchText, $options: 'i' } },
      { ipAddress: { $regex: query.searchText, $options: 'i' } },
    ];
  }

  return filter;
}

function hydrateLog(logDoc) {
  const secure = decryptPayload(logDoc.encryptedData) || {};
  return {
    id: String(logDoc._id),
    timestampUtc: logDoc.timestampUtc,
    timestampLocal: logDoc.timestampLocal,
    timezone: logDoc.timezone,
    userId: logDoc.userId,
    username: logDoc.username,
    userRole: logDoc.userRole,
    ipAddress: logDoc.ipAddress,
    userAgent: logDoc.userAgent,
    actionType: logDoc.actionType,
    module: logDoc.module,
    entity: logDoc.entity,
    recordId: logDoc.recordId,
    operationStatus: logDoc.operationStatus,
    errorDetails: logDoc.errorDetails,
    metadata: logDoc.metadata || {},
    oldValues: secure.oldValues || null,
    newValues: secure.newValues || null,
    checksum: logDoc.checksum,
    previousChecksum: logDoc.previousChecksum,
    createdAt: logDoc.createdAt,
  };
}

async function queryLogs(filters, options = {}) {
  const db = getDb();
  const collection = db.collection('activity_logs');
  const page = Math.max(parseInt(options.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(options.pageSize || '50', 10), 1), 500);
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    collection.find(filters).sort({ createdAt: -1 }).skip(skip).limit(pageSize).toArray(),
    collection.countDocuments(filters),
  ]);

  return {
    logs: logs.map(hydrateLog),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

async function getRealtimeStats(hours = 24) {
  const db = getDb();
  const collection = db.collection('activity_logs');
  const alertsCollection = db.collection('audit_alerts');
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const [totalsByAction, totalsByModule, failedCount, totalCount, recentAlerts] = await Promise.all([
    collection
      .aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$actionType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    collection
      .aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$module', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ])
      .toArray(),
    collection.countDocuments({ createdAt: { $gte: since }, operationStatus: 'failure' }),
    collection.countDocuments({ createdAt: { $gte: since } }),
    // Fetch recent alerts AND any unacknowledged alerts for better visibility
    alertsCollection.find({
      $or: [
        { createdAt: { $gte: since } },
        { acknowledged: false }
      ]
    }).sort({ createdAt: -1 }).limit(50).toArray(),
  ]);

  return {
    windowHours: hours,
    totalCount,
    failureCount: failedCount,
    successCount: Math.max(0, totalCount - failedCount),
    totalsByAction,
    totalsByModule,
    alerts: recentAlerts.map((a) => ({
      id: String(a._id),
      type: a.type,
      severity: a.severity,
      acknowledged: a.acknowledged,
      createdAt: a.createdAt,
      details: a,
    })),
  };
}

function toCSV(logs) {
  const headers = [
    'timestampUtc',
    'timezone',
    'userId',
    'username',
    'ipAddress',
    'actionType',
    'module',
    'entity',
    'recordId',
    'operationStatus',
    'errorDetails',
    'checksum',
    'previousChecksum',
    'oldValues',
    'newValues',
  ];
  const escape = (value) => {
    const raw = value === null || value === undefined ? '' : String(value);
    const escaped = raw.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = logs.map((log) =>
    [
      log.timestampUtc,
      log.timezone,
      log.userId,
      log.username,
      log.ipAddress,
      log.actionType,
      log.module,
      log.entity,
      log.recordId,
      log.operationStatus,
      log.errorDetails || '',
      log.checksum,
      log.previousChecksum || '',
      safeStringify(log.oldValues),
      safeStringify(log.newValues),
    ]
      .map(escape)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function buildSignedExportPayload(logs, filters, format) {
  const payload = {
    generatedAt: new Date().toISOString(),
    timezone: DEFAULT_TIMEZONE,
    format,
    filters,
    rowCount: logs.length,
    logs,
  };
  const canonical = safeStringify(payload);
  const signature = signData(canonical);
  return { payload, signature, canonical };
}

async function deleteLogById(id) {
  try {
    const db = getDb();
    const collection = db.collection('activity_logs');
    return await collection.deleteOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error('deleteLogById error:', error.message);
    return { deletedCount: 0, error: 'Invalid ID format' };
  }
}

async function deleteLogsByFilter(filters) {
  const db = getDb();
  const collection = db.collection('activity_logs');
  return await collection.deleteMany(filters);
}

async function acknowledgeAlert(alertId) {
  try {
    const db = getDb();
    const result = await db.collection('audit_alerts').updateOne(
      { _id: new ObjectId(alertId) },
      { $set: { acknowledged: true, acknowledgedAt: new Date() } }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Acknowledge alert error:', error.message);
    return false;
  }
}

async function deleteAlert(alertId) {
  try {
    const db = getDb();
    const result = await db.collection('audit_alerts').deleteOne({ _id: new ObjectId(alertId) });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Delete alert error:', error.message);
    return false;
  }
}

module.exports = {
  auditRequestMiddleware,
  initializeAuditInfrastructure,
  logActivity,
  flushQueue,
  buildFilters,
  queryLogs,
  getRealtimeStats,
  buildSignedExportPayload,
  toCSV,
  signData,
  deleteLogById,
  deleteLogsByFilter,
  acknowledgeAlert,
  deleteAlert,
};
