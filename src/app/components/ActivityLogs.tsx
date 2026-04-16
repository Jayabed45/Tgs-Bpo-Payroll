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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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
          </div>

          {/* Bulk Operation Summary */}
          {log.metadata?.isBulk && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-sm text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Bulk Operation Summary
              </h4>
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">Total Records</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {log.metadata.recordCount || log.metadata.insertedCount || log.metadata.deletedCount || log.metadata.totalGenerated || 0}
                    </p>
                  </div>
                  {log.metadata.cutoffStart && log.metadata.cutoffEnd && (
                    <div className="bg-white rounded-lg p-3 shadow-sm col-span-2">
                      <p className="text-xs text-gray-500 mb-1">Cutoff Period</p>
                      <p className="text-sm font-semibold text-gray-700">
                        {new Date(log.metadata.cutoffStart).toLocaleDateString()} - {new Date(log.metadata.cutoffEnd).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {log.metadata.totalGenerated !== undefined && (
                    <>
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">Generated</p>
                        <p className="text-lg font-semibold text-green-600">{log.metadata.totalGenerated}</p>
                      </div>
                      {log.metadata.totalSkipped > 0 && (
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Skipped</p>
                          <p className="text-lg font-semibold text-amber-600">{log.metadata.totalSkipped}</p>
                        </div>
                      )}
                      {log.metadata.totalFailed > 0 && (
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <p className="text-xs text-gray-500 mb-1">Failed</p>
                          <p className="text-lg font-semibold text-red-600">{log.metadata.totalFailed}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {log.metadata.processedEmployees && log.metadata.processedEmployees.length > 0 && (
                  <div>
                    <p className="font-medium mb-2 text-sm text-gray-700">Processed Records:</p>
                    <div className="flex flex-wrap gap-2">
                      {log.metadata.processedEmployees.map((emp: string, i: number) => (
                        <span key={i} className="inline-flex items-center px-3 py-1 bg-white border border-indigo-200 rounded-full text-xs font-medium text-indigo-700 shadow-sm">
                          <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {emp}
                        </span>
                      ))}
                      {(log.metadata.recordCount || log.metadata.insertedCount || 0) > log.metadata.processedEmployees.length && (
                        <span className="inline-flex items-center px-3 py-1 text-xs text-gray-500 italic">
                          +{(log.metadata.recordCount || log.metadata.insertedCount || 0) - log.metadata.processedEmployees.length} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {log.metadata.fullEmployeeList && log.metadata.fullEmployeeList.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium mb-2 text-sm text-gray-700">All Employees:</p>
                    <div className="bg-white rounded-lg p-3 max-h-40 overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {log.metadata.fullEmployeeList.map((emp: string, i: number) => (
                          <div key={i} className="flex items-center text-xs text-gray-600">
                            <svg className="w-3 h-3 mr-1.5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            {emp}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Change Summary */}
          {(log.actionType === "update" || log.actionType === "create" || log.actionType === "generate") && !log.metadata?.isBulk && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 text-sm text-gray-900">
                {log.actionType === "create" ? "Created Information" : log.actionType === "generate" ? "Generated Information" : "Change Summary"}
              </h4>
              <div className="bg-gray-50 border rounded-lg p-4">
                {(log.actionType === "create" || log.actionType === "generate") && log.newValues ? (
                  // Show created/generated data in a nice format
                  <div className="space-y-3">
                    {log.module === "payslips" && (
                      <div className="bg-white border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <h5 className="font-semibold text-gray-900">Payslip Details</h5>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {log.newValues.employeeName && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Employee Name</p>
                              <p className="text-sm font-medium text-gray-900">{log.newValues.employeeName}</p>
                            </div>
                          )}
                          {log.newValues.employeeId && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                              <p className="text-sm text-gray-700">{log.newValues.employeeId}</p>
                            </div>
                          )}
                          {log.newValues.cutoffPeriod && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 mb-1">Cutoff Period</p>
                              <p className="text-sm font-medium text-indigo-600">{log.newValues.cutoffPeriod}</p>
                            </div>
                          )}
                          {log.newValues.netPay !== undefined && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Net Pay</p>
                              <p className="text-lg font-bold text-green-600">₱{Number(log.newValues.netPay).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                          )}
                          {log.newValues.status && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Status</p>
                              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                {log.newValues.status}
                              </span>
                            </div>
                          )}
                          {log.newValues.generatedAt && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 mb-1">Generated At</p>
                              <p className="text-sm text-gray-700">{new Date(log.newValues.generatedAt).toLocaleString()}</p>
                            </div>
                          )}
                          {log.metadata?.payrollId && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 mb-1">Payroll ID</p>
                              <p className="text-xs text-gray-600 font-mono">{log.metadata.payrollId}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {log.module === "departments" && (
                      <div className="bg-white border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <h5 className="font-semibold text-gray-900">Department Details</h5>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {log.newValues.name && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Department Name</p>
                              <p className="text-sm font-medium text-gray-900">{log.newValues.name}</p>
                            </div>
                          )}
                          {log.newValues.code && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Department Code</p>
                              <p className="text-sm font-medium text-indigo-600">{log.newValues.code}</p>
                            </div>
                          )}
                          {log.newValues.description && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 mb-1">Description</p>
                              <p className="text-sm text-gray-700">{log.newValues.description}</p>
                            </div>
                          )}
                          {log.newValues.manager && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Manager</p>
                              <p className="text-sm text-gray-700">{log.newValues.manager}</p>
                            </div>
                          )}
                          {log.newValues.siteLocation && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Site Location</p>
                              <p className="text-sm text-gray-700">{log.newValues.siteLocation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {log.module === "employees" && (
                      <div className="bg-white border rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <h5 className="font-semibold text-gray-900">Employee Details</h5>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          {log.newValues.name && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Name</p>
                              <p className="text-sm font-medium text-gray-900">{log.newValues.name}</p>
                            </div>
                          )}
                          {log.newValues.email && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Email</p>
                              <p className="text-sm text-gray-700">{log.newValues.email}</p>
                            </div>
                          )}
                          {log.newValues.position && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Position</p>
                              <p className="text-sm text-gray-700">{log.newValues.position}</p>
                            </div>
                          )}
                          {log.newValues.department && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Department</p>
                              <p className="text-sm text-gray-700">{log.newValues.department}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {log.module !== "departments" && log.module !== "employees" && log.module !== "payslips" && (
                      <div className="bg-white border rounded p-3">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">{renderJson(log.newValues)}</pre>
                      </div>
                    )}
                  </div>
                ) : getChangedFields(log).length === 0 ? (
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

          {/* Detailed Data - Only show if not bulk or if there's specific data */}
          {/* Commented out - redundant with organized display above
          {!log.metadata?.isBulk && (
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
          )}
          */}

          {/* Show error details if present */}
          {log.errorDetails && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2 text-sm text-red-600">Error Details</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{log.errorDetails}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-black text-sm font-medium transition-colors"
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
  const [showAlerts, setShowAlerts] = useState(false);
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

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiService.getAuditLogs({
        page,
        pageSize,
        ...filters,
      });
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

  // Debounced fetch logs - triggers after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1); // Reset to first page on filter change
      fetchLogs();
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [filters]); // Trigger when filters change

  // Fetch logs when page changes
  useEffect(() => {
    fetchLogs();
  }, [page]);

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
      setLoading(true);
      setError(""); // Clear any previous errors
      
      const blob = await apiService.exportAuditLogs({
        format: exportFormat,
        ...filters,
        maxRows: 10000,
      });
      
      // Check if blob is valid
      if (!blob || blob.size === 0) {
        throw new Error('Export returned empty file');
      }
      
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = exportFormat === "xlsx" ? "xlsx" : exportFormat;
      anchor.download = `audit-logs-${timestamp}.${extension}`;
      
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      
      setStatusModal({
        open: true,
        type: 'success',
        title: "Export Successful",
        message: `Audit logs exported successfully as ${extension.toUpperCase()} file.`,
      });
    } catch (err: any) {
      console.error('Export error:', err);
      setStatusModal({
        open: true,
        type: 'error',
        title: "Export Failed",
        message: err.message || `Failed to export logs as ${exportFormat.toUpperCase()}. Please try again or use a different format.`,
      });
    } finally {
      setLoading(false);
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

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      setLoading(true);
      await apiService.acknowledgeAlert(alertId);
      setStatusModal({
        open: true,
        type: 'success',
        title: "Success",
        message: "Alert acknowledged successfully.",
      });
      await fetchStats();
    } catch (err: any) {
      setStatusModal({
        open: true,
        type: 'error',
        title: "Error",
        message: err.message || "Failed to acknowledge alert.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    setConfirmModal({
      open: true,
      title: "Confirm Alert Deletion",
      message: "Are you sure you want to delete this security alert?",
      isDanger: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          await apiService.deleteAlert(alertId);
          setStatusModal({
            open: true,
            type: 'success',
            title: "Success",
            message: "Alert deleted successfully.",
          });
          await fetchStats();
        } catch (err: any) {
          setStatusModal({
            open: true,
            type: 'error',
            title: "Error",
            message: err.message || "Failed to delete alert.",
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
            disabled={loading}
          >
            <option value="xlsx">Excel</option>
            <option value="csv">CSV</option>
            <option value="pdf">PDF</option>
            <option value="json">JSON</option>
          </select>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export Logs
              </>
            )}
          </button>
          <button
            onClick={handleDeleteAll}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete all logs matching current filters"
          >
            Delete All
          </button>
        </div>
      </div>

      {stats && (
        <>
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
            <div className="bg-white border rounded-lg p-4 cursor-pointer hover:bg-gray-50" onClick={() => setShowAlerts(!showAlerts)}>
              <p className="text-xs text-gray-500">Security Alerts</p>
              <p className="text-2xl font-semibold text-amber-600">{stats.alerts?.length || 0}</p>
              {stats.alerts?.filter((a: any) => !a.acknowledged).length > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {stats.alerts.filter((a: any) => !a.acknowledged).length} unacknowledged
                </p>
              )}
            </div>
          </div>

          {showAlerts && stats.alerts && stats.alerts.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Security Alerts</h3>
                <button
                  onClick={() => setShowAlerts(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                {stats.alerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${
                      alert.acknowledged ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              alert.severity === 'high'
                                ? 'bg-red-100 text-red-700'
                                : alert.severity === 'medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {alert.severity?.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {alert.type?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {alert.acknowledged && (
                            <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                              Acknowledged
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          {alert.details?.userId && (
                            <p>User: {alert.details.username || alert.details.userId}</p>
                          )}
                          {alert.details?.ipAddress && (
                            <p>IP Address: {alert.details.ipAddress}</p>
                          )}
                          {alert.details?.attempts && (
                            <p>Failed Login Attempts: {alert.details.attempts}</p>
                          )}
                          {alert.details?.deletedCount && (
                            <p>Records Deleted: {alert.details.deletedCount}</p>
                          )}
                          {alert.details?.events && (
                            <p>Events in Window: {alert.details.events}</p>
                          )}
                          {alert.details?.module && (
                            <p>Module: {alert.details.module}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {!alert.acknowledged && (
                          <button
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                            className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-white border rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Text */}
          <input
            type="text"
            placeholder="Search..."
            value={filters.searchText}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchText: e.target.value }))}
            className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />

          {/* Username */}
          <input
            type="text"
            placeholder="Username"
            value={filters.username}
            onChange={(e) => setFilters((prev) => ({ ...prev, username: e.target.value }))}
            className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />

          {/* Action Type */}
          <select
            value={filters.actionType}
            onChange={(e) => setFilters((prev) => ({ ...prev, actionType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
          >
            <option value="">All Actions</option>
            {ACTION_TYPES.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>

          {/* Module */}
          <select
            value={filters.module}
            onChange={(e) => setFilters((prev) => ({ ...prev, module: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
          >
            <option value="">All Modules</option>
            {MODULE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>

          {/* Start Date */}
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />

          {/* End Date */}
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />

          {/* Status */}
          <select
            value={filters.operationStatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, operationStatus: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
          >
            <option value="">All Status</option>
            {STATUS_TYPES.map((item) => (
              <option key={item} value={item}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>

          {/* Clear Button - only show if filters are active */}
          {Object.values(filters).some(v => v !== "") && (
            <button
              onClick={() => {
                setFilters({
                  username: "",
                  actionType: "",
                  module: "",
                  operationStatus: "",
                  startDate: "",
                  endDate: "",
                  searchText: "",
                });
              }}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium flex items-center gap-1"
              title="Clear all filters"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
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
                <th className="px-3 py-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={7}>
                    Loading logs...
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-gray-500" colSpan={7}>
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
