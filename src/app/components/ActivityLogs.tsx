"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiService } from "../services/api";

const ACTION_TYPES = ["create", "read", "update", "delete", "import", "export", "generate", "login"];
const MODULE_TYPES = ["auth", "employees", "payroll", "payslips", "settings", "export", "system"];
const STATUS_TYPES = ["success", "failure"];

// Confirmation Modal Component
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDanger?: boolean;
}

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = "Confirm", isDanger = false }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className={`text-lg font-semibold ${isDanger ? 'text-red-600' : 'text-gray-900'}`}>
          {title}
        </h3>
        <p className="mt-3 text-sm text-gray-600">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Status Modal Component (Success/Error)
interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title: string;
  message: string;
}

function StatusModal({ isOpen, onClose, type, title, message }: StatusModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
        <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
          type === 'success' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {type === 'success' ? (
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <h3 className={`mt-4 text-lg font-semibold ${type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {message}
        </p>
        <div className="mt-6">
          <button
            onClick={onClose}
            className={`w-full px-4 py-2 text-sm font-medium text-white rounded-md ${
              type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

// Log Details Modal Component
interface LogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: any;
  getChangedFields: (log: any) => Array<{ field: string; oldValue: any; newValue: any }>;
  renderJson: (value: any) => string;
}

function LogDetailsModal({ isOpen, onClose, log, getChangedFields, renderJson }: LogDetailsModalProps) {
  if (!isOpen || !log) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Log Details</h3>
            <p className="text-sm text-gray-500 mt-1">
              {log.timestampLocal || log.timestampUtc} • {log.username || "Unknown"} • {log.actionType.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Basic Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Module</p>
              <p className="text-sm font-medium">{log.module}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Record ID</p>
              <p className="text-sm font-medium">{log.recordId || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  log.operationStatus === "success"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {log.operationStatus}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">IP Address</p>
              <p className="text-sm font-medium">{log.ipAddress || "-"}</p>
            </div>
          </div>

          {/* Bulk Operation Summary */}
          {log.metadata?.isBulk && (
            <div className="mb-6">
              <p className="font-semibold mb-2 text-sm">Bulk Operation Summary</p>
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                <p className="mb-2 text-sm">
                  <span className="font-medium">Total Records:</span>{" "}
                  {log.metadata.recordCount || log.metadata.insertedCount || log.metadata.deletedCount || 0}
                </p>
                {log.metadata.processedEmployees && log.metadata.processedEmployees.length > 0 && (
                  <div>
                    <p className="font-medium mb-2 text-sm">Processed Records:</p>
                    <div className="flex flex-wrap gap-2">
                      {log.metadata.processedEmployees.map((emp: string, i: number) => (
                        <span key={i} className="bg-white border px-2 py-1 rounded text-xs">
                          {emp}
                        </span>
                      ))}
                      {(log.metadata.recordCount || log.metadata.insertedCount || 0) >
                        log.metadata.processedEmployees.length && (
                        <span className="text-gray-500 italic text-xs">
                          ...and{" "}
                          {(log.metadata.recordCount || log.metadata.insertedCount || 0) -
                            log.metadata.processedEmployees.length}{" "}
                          more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Change Summary */}
          {(log.actionType === "update" || log.actionType === "create") && !log.metadata?.isBulk && (
            <div className="mb-6">
              <p className="font-semibold mb-2 text-sm">Change Summary</p>
              <div className="bg-gray-50 border rounded-lg p-4">
                {getChangedFields(log).length === 0 ? (
                  <p className="text-gray-500 text-sm">No field-level changes captured.</p>
                ) : (
                  <div className="space-y-3">
                    {getChangedFields(log).map((change) => (
                      <div key={change.field} className="bg-white border rounded p-3">
                        <p className="font-medium text-sm mb-2">{change.field}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">Before:</span>
                            <p className="mt-1 text-gray-700 break-all">{String(change.oldValue ?? "-")}</p>
                          </div>
                          <div>
                            <span className="text-indigo-600">After:</span>
                            <p className="mt-1 text-indigo-700 break-all">{String(change.newValue ?? "-")}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detailed Data */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <p className="font-semibold mb-2 text-sm">Old Values</p>
              <pre className="bg-gray-50 border rounded-lg p-3 overflow-auto max-h-64 text-xs">
                {renderJson(log.oldValues)}
              </pre>
            </div>
            <div>
              <p className="font-semibold mb-2 text-sm">New Values</p>
              <pre className="bg-gray-50 border rounded-lg p-3 overflow-auto max-h-64 text-xs">
                {renderJson(log.newValues)}
              </pre>
            </div>
            <div>
              <p className="font-semibold mb-2 text-sm">Metadata</p>
              <pre className="bg-gray-50 border rounded-lg p-3 overflow-auto max-h-64 text-xs">
                {renderJson(log.metadata)}
              </pre>
              {log.errorDetails && (
                <>
                  <p className="font-semibold mt-4 mb-2 text-sm text-red-600">Error Details</p>
                  <pre className="bg-red-50 border border-red-200 rounded-lg p-3 overflow-auto max-h-32 text-xs text-red-700">
                    {log.errorDetails}
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActivityLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [filters, setFilters] = useState({
    username: "",
    actionType: "",
    module: "",
    operationStatus: "",
    startDate: "",
    endDate: "",
    searchText: "",
  });
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "xlsx" | "pdf">("xlsx");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });

  // Modal States
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isDanger: false,
  });

  const [statusModal, setStatusModal] = useState({
    open: false,
    type: 'success' as 'success' | 'error',
    title: "",
    message: "",
  });

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      ...filters,
    }),
    [page, pageSize, filters]
  );

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiService.getAuditLogs(queryParams);
      setLogs(response.logs || []);
      setPagination(response.pagination || pagination);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("404") || msg.includes("Resource not found")) {
        setError("Resource not found. Please check if the backend server is running.");
      } else {
        setError(msg || "Failed to fetch activity logs");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.getAuditStats(24);
      setStats(response.stats);
    } catch (err) {
      console.error("Failed to fetch audit stats:", err);
    }
  };

  const handleApplyFilters = () => {
    setPage(1);
    fetchLogs();
  };

  useEffect(() => {
    fetchLogs();
  }, [queryParams]);

  useEffect(() => {
    fetchStats();
    // Only poll stats, not full logs, to reduce noise and traffic
    const interval = setInterval(() => {
      fetchStats();
    }, 30000); // Poll every 30 seconds instead of 15

    return () => clearInterval(interval);
  }, []); // Only start polling on mount

  const handleExport = async () => {
    try {
      const blob = await apiService.exportAuditLogs({
        format: exportFormat,
        ...filters,
        maxRows: 10000,
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit-logs.${exportFormat === "xlsx" ? "xlsx" : exportFormat}`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to export logs");
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      open: true,
      title: "Confirm Deletion",
      message: "Are you sure you want to delete this log entry? This action cannot be undone.",
      isDanger: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await apiService.deleteAuditLog(id);
          setStatusModal({
            open: true,
            type: 'success',
            title: "Success",
            message: "Log entry deleted successfully.",
          });
          await fetchLogs();
          await fetchStats();
        } catch (err: any) {
          setStatusModal({
            open: true,
            type: 'error',
            title: "Error",
            message: err.message || "Failed to delete log entry.",
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDeleteAll = () => {
    const activeFiltersCount = Object.values(filters).filter(v => v !== "").length;
    const isFiltered = activeFiltersCount > 0;
    
    setConfirmModal({
      open: true,
      title: isFiltered ? "Confirm Bulk Deletion" : "Confirm Clear All",
      message: isFiltered 
        ? `Are you sure you want to delete ALL logs matching the current filters (${activeFiltersCount} filter(s) active)? This action cannot be undone.`
        : "Are you sure you want to delete ALL activity logs? This action cannot be undone.",
      isDanger: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          const response = await apiService.deleteFilteredAuditLogs(filters);
          setStatusModal({
            open: true,
            type: 'success',
            title: "Success",
            message: `${response.deletedCount} logs deleted successfully.`,
          });
          setPage(1);
          await fetchLogs();
          await fetchStats();
        } catch (err: any) {
          setStatusModal({
            open: true,
            type: 'error',
            title: "Error",
            message: err.message || "Failed to delete logs.",
          });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const renderJson = (value: any) => {
    if (!value) return "-";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const getChangedFields = (log: any) => {
    const fieldDiff = log?.metadata?.fieldDiff;
    if (fieldDiff && typeof fieldDiff === "object") {
      return Object.entries(fieldDiff).map(([field, values]: [string, any]) => ({
        field,
        oldValue: values?.oldValue ?? null,
        newValue: values?.newValue ?? null,
      }));
    }

    const oldValues = log?.oldValues || {};
    const newValues = log?.newValues || {};
    const keys = Array.from(new Set([...Object.keys(oldValues), ...Object.keys(newValues)]));
    return keys.map((field) => ({
      field,
      oldValue: oldValues[field] ?? null,
      newValue: newValues[field] ?? null,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Logs & Audit Trail</h2>

        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="xlsx">Excel</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
            <option value="json">JSON</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
          >
            Export Logs
          </button>
          <button
            onClick={handleDeleteAll}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
            title="Delete all logs matching current filters"
          >
            Delete All
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500">Last 24h Events</p>
            <p className="text-2xl font-semibold">{stats.totalCount || 0}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500">Success</p>
            <p className="text-2xl font-semibold text-emerald-600">{stats.successCount || 0}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500">Failures</p>
            <p className="text-2xl font-semibold text-red-600">{stats.failureCount || 0}</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500">Security Alerts</p>
            <p className="text-2xl font-semibold text-amber-600">{stats.alerts?.length || 0}</p>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            placeholder="Search text"
            value={filters.searchText}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <input
            placeholder="Username"
            value={filters.username}
            onChange={(e) => setFilters((prev) => ({ ...prev, username: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <select
            value={filters.actionType}
            onChange={(e) => setFilters((prev) => ({ ...prev, actionType: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={filters.module}
            onChange={(e) => setFilters((prev) => ({ ...prev, module: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Modules</option>
            {MODULE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <select
            value={filters.operationStatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, operationStatus: e.target.value }))}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">All Status</option>
            {STATUS_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setPage(1);
              fetchLogs();
            }}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black text-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-md p-3 text-sm">{error}</div>}

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Timestamp</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Action</th>
                <th className="px-3 py-2 text-left">Module</th>
                <th className="px-3 py-2 text-left">Record</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">IP</th>
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={8}>
                    Loading logs...
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={8}>
                    No logs found for the current filters.
                  </td>
                </tr>
              )}
              {!loading &&
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className="border-t hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">{log.timestampLocal || log.timestampUtc}</td>
                      <td className="px-3 py-2">
                        <div>{log.username || "Unknown"}</div>
                        <div className="text-xs text-gray-500">{log.userId || "-"}</div>
                      </td>
                      <td className="px-3 py-2 uppercase">{log.actionType}</td>
                      <td className="px-3 py-2">{log.module}</td>
                      <td className="px-3 py-2">{log.recordId || "-"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            log.operationStatus === "success"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {log.operationStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2">{log.ipAddress || "-"}</td>
                      <td className="px-3 py-2">
                        <button
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(log.id);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t flex items-center justify-between text-sm">
          <span>
            Page {pagination.page} of {Math.max(1, pagination.totalPages)} ({pagination.total} logs)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
      />

      <StatusModal
        isOpen={statusModal.open}
        onClose={() => setStatusModal(prev => ({ ...prev, open: false }))}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
      />

      <LogDetailsModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        log={selectedLog}
        getChangedFields={getChangedFields}
        renderJson={renderJson}
      />
    </div>
  );
}
