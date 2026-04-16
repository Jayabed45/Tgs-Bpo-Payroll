"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiService } from "../services/api";

const ACTION_TYPES = ["create", "read", "update", "delete", "import", "export", "generate", "login"];
const MODULE_TYPES = ["auth", "employees", "payroll", "payslips", "settings", "export", "system"];
const STATUS_TYPES = ["success", "failure"];

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
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "xlsx" | "pdf">("xlsx");
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
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
      setError(err.message || "Failed to fetch activity logs");
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

  useEffect(() => {
    fetchLogs();
  }, [queryParams]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

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
          <p className="text-sm text-gray-600 mt-1">
            Tamper-evident logs with real-time monitoring, filtering, and compliance exports.
          </p>
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
                    <tr className="border-t">
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
                          className="text-indigo-600 hover:text-indigo-800 text-xs"
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        >
                          {expandedLogId === log.id ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expandedLogId === log.id && (
                      <tr className="bg-gray-50 border-t">
                        <td className="px-3 py-3" colSpan={8}>
                          {(log.actionType === "update" || log.actionType === "create") && (
                            <div className="mb-3">
                              <p className="font-semibold mb-1 text-xs">Change Summary</p>
                              <div className="bg-white border rounded p-2 text-xs space-y-1">
                                {getChangedFields(log).length === 0 ? (
                                  <p className="text-gray-500">No field-level changes captured.</p>
                                ) : (
                                  getChangedFields(log).map((change) => (
                                    <div key={change.field} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      <span className="font-medium">{change.field}</span>
                                      <span className="text-gray-600">Before: {String(change.oldValue ?? "-")}</span>
                                      <span className="text-indigo-700">After: {String(change.newValue ?? "-")}</span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="font-semibold mb-1">Old Values</p>
                              <pre className="bg-white border rounded p-2 overflow-auto max-h-48">{renderJson(log.oldValues)}</pre>
                            </div>
                            <div>
                              <p className="font-semibold mb-1">New Values</p>
                              <pre className="bg-white border rounded p-2 overflow-auto max-h-48">{renderJson(log.newValues)}</pre>
                            </div>
                            <div>
                              <p className="font-semibold mb-1">Metadata</p>
                              <pre className="bg-white border rounded p-2 overflow-auto max-h-48">{renderJson(log.metadata)}</pre>
                              {log.errorDetails && (
                                <>
                                  <p className="font-semibold mt-2 mb-1 text-red-600">Error</p>
                                  <pre className="bg-white border rounded p-2 overflow-auto max-h-28 text-red-700">
                                    {log.errorDetails}
                                  </pre>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
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
    </div>
  );
}
