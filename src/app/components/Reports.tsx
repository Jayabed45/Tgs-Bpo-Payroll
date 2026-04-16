"use client";
import React, { useEffect, useState } from "react";
import { apiService } from "../services/api";
import SkeletonPage from "./SkeletonPage";

interface Payroll {
  _id?: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  cutoffStart: string;
  cutoffEnd: string;
  basicSalary: number;
  workedHours: number;
  overtimeHours: number;
  holidayPay: number;
  nightDifferential: number;
  salaryAdjustment: number;
  foodAllowance?: number;
  transportationAllowance?: number;
  complexityAllowance?: number;
  observationalAllowance?: number;
  communicationsAllowance?: number;
  internetAllowance?: number;
  riceSubsidyAllowance?: number;
  clothingAllowance?: number;
  laundryAllowance?: number;
  allowance?: number;
  absences: number;
  lateDeductions: number;
  sssContribution: number;
  philhealthContribution: number;
  pagibigContribution: number;
  withholdingTax: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  createdAt: string;
}

interface Payslip {
  _id?: string;
  id?: string;
  payrollId: string;
  employeeName: string;
  cutoffPeriod: string;
  netPay: number;
  generatedAt: string;
  downloadUrl?: string;
  createdAt: string;
}

// Modal Component Interfaces and Definitions
interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

function SuccessModal({ isOpen, onClose, message }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
        <h2 className="text-lg font-semibold text-green-600">
          Success!
        </h2>
        <p className="mt-3 text-sm text-gray-700">
          {message || "Operation completed successfully!"}
        </p>
        <div className="mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

function ErrorModal({ isOpen, onClose, message }: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
        <h2 className="text-lg font-semibold text-red-600">
          Error
        </h2>
        <p className="mt-3 text-sm text-gray-700">
          {message || "An error occurred. Please try again."}
        </p>
        <div className="mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

function WarningModal({ isOpen, onClose, message }: WarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
        <h2 className="text-lg font-semibold text-yellow-600">
          Warning
        </h2>
        <p className="mt-3 text-sm text-gray-700">
          {message || "Please review the information and try again."}
        </p>
        <div className="mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [payslipSearchQuery, setPayslipSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [deletingAllPayrolls, setDeletingAllPayrolls] = useState(false);
  const [deletingAllPayslips, setDeletingAllPayslips] = useState(false);
  const [deletingPayrollId, setDeletingPayrollId] = useState<string | null>(null);
  const [deletingPayslipId, setDeletingPayslipId] = useState<string | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('payrollRecords');
  const [payrollDateFrom, setPayrollDateFrom] = useState("");
  const [payrollDateTo, setPayrollDateTo] = useState("");
  const [payrollSortOrder, setPayrollSortOrder] = useState<"date_desc" | "date_asc">("date_desc");
  const [payslipDateFrom, setPayslipDateFrom] = useState("");
  const [payslipDateTo, setPayslipDateTo] = useState("");
  const [payslipSortOrder, setPayslipSortOrder] = useState<"generated_desc" | "generated_asc">("generated_desc");
  
  // Modal states
  const [successModal, setSuccessModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });
  const [errorModal, setErrorModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });
  const [warningModal, setWarningModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payrollsResponse, payslipsResponse] = await Promise.all([
        apiService.getPayrolls(),
        apiService.getPayslips()
      ]);
      
      console.log('Payrolls response:', payrollsResponse);
      console.log('Payslips response:', payslipsResponse);
      
      setPayrolls(Array.isArray(payrollsResponse.payrolls) ? payrollsResponse.payrolls : []);
      setPayslips(Array.isArray(payslipsResponse.payslips) ? payslipsResponse.payslips : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error to prevent crashes
      setPayrolls([]);
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  const generateAllPayslips = async () => {
    setGeneratingAll(true);
    
    try {
      // Filter payrolls that are processed or completed
      const eligiblePayrolls = filteredPayrolls.filter(
        payroll => payroll.status === 'processed' || payroll.status === 'completed'
      );
      
      if (eligiblePayrolls.length === 0) {
        setWarningModal({ open: true, message: 'No eligible payrolls found (must be processed or completed).' });
        setGeneratingAll(false);
        return;
      }
      
      const payrollIds = eligiblePayrolls.map(p => p._id || p.id || '').filter(id => id);
      
      // Call bulk generate API
      const result = await apiService.generateBulkPayslips(payrollIds);
      
      // Show results
      const messages = [];
      if (result.totalGenerated > 0) {
        messages.push(`${result.totalGenerated} payslip(s) generated successfully!`);
      }
      if (result.totalSkipped > 0) {
        messages.push(`${result.totalSkipped} payslip(s) skipped (already exist or not eligible).`);
      }
      if (result.totalFailed > 0) {
        messages.push(`${result.totalFailed} payslip(s) failed to generate.`);
      }
      
      if (result.totalGenerated > 0) {
        setSuccessModal({ open: true, message: messages.join(' ') });
      } else if (result.totalSkipped > 0) {
        setWarningModal({ open: true, message: messages.join(' ') });
      } else {
        setErrorModal({ open: true, message: messages.join(' ') });
      }
      
      fetchData(); // Refresh the list
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to generate payslips';
      setErrorModal({ open: true, message });
    } finally {
      setGeneratingAll(false);
    }
  };

  const generatePayslip = async (payroll: Payroll) => {
    if (payroll.status !== 'processed' && payroll.status !== 'completed') {
      setWarningModal({ open: true, message: 'Only processed or completed payrolls can generate payslips' });
      return;
    }

    setGenerating(true);
    try {
      await apiService.generatePayslip(payroll._id || payroll.id || '');
      setSuccessModal({ open: true, message: 'Payslip generated successfully!' });
      fetchData(); // Refresh the list
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to generate payslip';
      setErrorModal({ open: true, message });
    } finally {
      setGenerating(false);
    }
  };

  const downloadPayslip = async (payslipId: string) => {
    try {
      console.log('Downloading payslip:', payslipId);
      const response = await apiService.downloadPayslip(payslipId);
      console.log('Download response received, size:', response.byteLength);
      
      // Create a blob and download
      const blob = new Blob([response], { type: 'application/pdf' });
      console.log('Blob created, size:', blob.size, 'type:', blob.type);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${payslipId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      console.log('Download triggered successfully');
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to download payslip';
      console.error('Download error:', error);
      setErrorModal({ open: true, message });
    }
  };

  const viewPayslip = (payslip: Payslip) => {
    const byId = payrolls.find((p) => (p._id || p.id) === payslip.payrollId) || null;
    setSelectedPayroll(byId);
    setShowPayslipModal(true);
  };

  const deletePayrollRecord = async (payroll: Payroll) => {
    const payrollId = payroll._id || payroll.id || '';
    if (!payrollId) {
      setErrorModal({ open: true, message: 'Invalid payroll ID' });
      return;
    }

    const confirmed = window.confirm(`Delete payroll record for "${payroll.employeeName}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingPayrollId(payrollId);
    try {
      await apiService.deletePayroll(payrollId);
      setSuccessModal({ open: true, message: 'Payroll deleted successfully.' });
      fetchData();
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to delete payroll';
      setErrorModal({ open: true, message });
    } finally {
      setDeletingPayrollId(null);
    }
  };

  const deletePayslipRecord = async (payslip: Payslip) => {
    const payslipId = payslip._id || payslip.id || '';
    if (!payslipId) {
      setErrorModal({ open: true, message: 'Invalid payslip ID' });
      return;
    }

    const confirmed = window.confirm(`Delete payslip for "${payslip.employeeName}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingPayslipId(payslipId);
    try {
      await apiService.deletePayslip(payslipId);
      setSuccessModal({ open: true, message: 'Payslip deleted successfully.' });
      fetchData();
    } catch (error: unknown) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Failed to delete payslip';
      setErrorModal({ open: true, message });
    } finally {
      setDeletingPayslipId(null);
    }
  };

  const deleteAllFilteredPayrollRecords = async () => {
    if (filteredPayrolls.length === 0) {
      setWarningModal({ open: true, message: 'No payroll records to delete.' });
      return;
    }

    const confirmed = window.confirm(`Delete ALL ${filteredPayrolls.length} payroll record(s) currently shown? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingAllPayrolls(true);
    let successCount = 0;
    let errorCount = 0;

    for (const payroll of filteredPayrolls) {
      const payrollId = payroll._id || payroll.id || '';
      if (!payrollId) {
        errorCount++;
        continue;
      }
      try {
        await apiService.deletePayroll(payrollId);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete payroll for ${payroll.employeeName}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      setSuccessModal({ open: true, message: `${successCount} payroll record(s) deleted successfully.` });
    }
    if (errorCount > 0) {
      setErrorModal({ open: true, message: `${errorCount} payroll record(s) failed to delete.` });
    }

    fetchData();
    setDeletingAllPayrolls(false);
  };

  const deleteAllFilteredPayslips = async () => {
    if (filteredPayslips.length === 0) {
      setWarningModal({ open: true, message: 'No payslips to delete.' });
      return;
    }

    const confirmed = window.confirm(`Delete ALL ${filteredPayslips.length} payslip(s) currently shown? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingAllPayslips(true);
    let successCount = 0;
    let errorCount = 0;

    for (const payslip of filteredPayslips) {
      const payslipId = payslip._id || payslip.id || '';
      if (!payslipId) {
        errorCount++;
        continue;
      }
      try {
        await apiService.deletePayslip(payslipId);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete payslip for ${payslip.employeeName}:`, error);
        errorCount++;
      }
    }

    if (successCount > 0) {
      setSuccessModal({ open: true, message: `${successCount} payslip(s) deleted successfully.` });
    }
    if (errorCount > 0) {
      setErrorModal({ open: true, message: `${errorCount} payslip(s) failed to delete.` });
    }

    fetchData();
    setDeletingAllPayslips(false);
  };

  const toSafeTimestamp = (value: string | undefined) => {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const toDateOnly = (value: string | undefined) => {
    if (!value) return '';
    const timestamp = toSafeTimestamp(value);
    if (!timestamp) return '';
    return new Date(timestamp).toISOString().slice(0, 10);
  };

  const filteredPayrolls = payrolls.filter(payroll => {
    const statusMatch = filterStatus === 'all' || payroll.status === filterStatus;
    const employeeMatch = filterEmployee === 'all' || 
      (payroll.employeeName && payroll.employeeName.toLowerCase().includes(filterEmployee.toLowerCase()));
    
    // Search filter
    const query = searchQuery.toLowerCase();
    const searchMatch = !searchQuery || (
      payroll.employeeName?.toLowerCase().includes(query) ||
      payroll.employeeId?.toLowerCase().includes(query) ||
      (payroll.cutoffStart && new Date(payroll.cutoffStart).toLocaleDateString().toLowerCase().includes(query)) ||
      (payroll.cutoffEnd && new Date(payroll.cutoffEnd).toLocaleDateString().toLowerCase().includes(query)) ||
      payroll.status?.toLowerCase().includes(query)
    );

    const cutoffStart = toDateOnly(payroll.cutoffStart);
    const cutoffEnd = toDateOnly(payroll.cutoffEnd);
    const fromDateMatch = !payrollDateFrom || (cutoffEnd !== '' && cutoffEnd >= payrollDateFrom);
    const toDateMatch = !payrollDateTo || (cutoffStart !== '' && cutoffStart <= payrollDateTo);
    
    return statusMatch && employeeMatch && searchMatch && fromDateMatch && toDateMatch;
  }).sort((a, b) => {
    const dateA = toSafeTimestamp(a.cutoffEnd || a.cutoffStart);
    const dateB = toSafeTimestamp(b.cutoffEnd || b.cutoffStart);
    return payrollSortOrder === 'date_asc' ? dateA - dateB : dateB - dateA;
  });

  const filteredPayslips = payslips.filter(payslip => {
    const payroll = payrolls.find(p => (p._id || p.id) === payslip.payrollId);
    if (!payroll) return false;
    
    const statusMatch = filterStatus === 'all' || payroll.status === filterStatus;
    const employeeMatch = filterEmployee === 'all' || 
      (payroll.employeeName && payroll.employeeName.toLowerCase().includes(filterEmployee.toLowerCase()));
    
    // Search filter for payslips
    const query = payslipSearchQuery.toLowerCase();
    const searchMatch = !payslipSearchQuery || (
      payslip.employeeName?.toLowerCase().includes(query) ||
      payslip.cutoffPeriod?.toLowerCase().includes(query) ||
      (payslip.generatedAt && new Date(payslip.generatedAt).toLocaleDateString().toLowerCase().includes(query))
    );

    const generatedDate = toDateOnly(payslip.generatedAt);
    const fromDateMatch = !payslipDateFrom || (generatedDate !== '' && generatedDate >= payslipDateFrom);
    const toDateMatch = !payslipDateTo || (generatedDate !== '' && generatedDate <= payslipDateTo);
    
    return statusMatch && employeeMatch && searchMatch && fromDateMatch && toDateMatch;
  }).sort((a, b) => {
    const dateA = toSafeTimestamp(a.generatedAt);
    const dateB = toSafeTimestamp(b.generatedAt);
    return payslipSortOrder === 'generated_asc' ? dateA - dateB : dateB - dateA;
  });

  console.log('Current filters - Status:', filterStatus, 'Employee:', filterEmployee);
  console.log('Total payrolls:', payrolls.length, 'Filtered payrolls:', filteredPayrolls.length);

  if (loading) {
    return <SkeletonPage />;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('payrollRecords')}
            className={`${
              activeTab === 'payrollRecords'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Payroll Records
          </button>
          <button
            onClick={() => setActiveTab('generatedPayslips')}
            className={`${
              activeTab === 'generatedPayslips'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Generated Payslips
          </button>
        </nav>
      </div>

      {/* Payrolls Section */}
      {activeTab === 'payrollRecords' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            {/* Title and Action Buttons */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Payroll Records</h4>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={generateAllPayslips}
                  disabled={generatingAll || deletingAllPayrolls || filteredPayrolls.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {generatingAll ? 'Generating All...' : 'Generate Payslip All'}
                </button>
                <button
                  onClick={deleteAllFilteredPayrollRecords}
                  disabled={generatingAll || deletingAllPayrolls || filteredPayrolls.length === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {deletingAllPayrolls ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
            
            {/* Combined Filters Row */}
            <div className="flex gap-2 items-center">
              {/* Search Bar - Takes most space */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee, ID, period..."
                  className="block w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Date From */}
              <input
                type="date"
                value={payrollDateFrom}
                onChange={(e) => setPayrollDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <span className="text-gray-400">—</span>
              
              {/* Date To */}
              <input
                type="date"
                value={payrollDateTo}
                onChange={(e) => setPayrollDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 bg-white hover:border-gray-400 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                  <option value="completed">Completed</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Sort Order */}
              <select
                value={payrollSortOrder}
                onChange={(e) => setPayrollSortOrder(e.target.value as "date_desc" | "date_asc")}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date_desc">↓ Newest</option>
                <option value="date_asc">↑ Oldest</option>
              </select>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterEmployee('all');
                  setPayrollDateFrom('');
                  setPayrollDateTo('');
                  setPayrollSortOrder('date_desc');
                  setSearchQuery('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors whitespace-nowrap"
                title="Reset all filters"
              >
                🔄 Reset
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cutoff Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayrolls.map((payroll, index) => (
                  <tr key={payroll._id || payroll.id || `payroll-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payroll.employeeName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payroll.cutoffStart).toLocaleDateString()} - {new Date(payroll.cutoffEnd).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{payroll.netPay?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payroll.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : payroll.status === 'processed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payroll.status?.charAt(0).toUpperCase() + payroll.status?.slice(1) || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                      <button
                        onClick={() => generatePayslip(payroll)}
                        disabled={generating || deletingPayrollId === (payroll._id || payroll.id) || (payroll.status !== 'processed' && payroll.status !== 'completed')}
                        className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={payroll.status !== 'processed' && payroll.status !== 'completed' ? 'Only processed/completed payrolls can generate payslips' : 'Generate payslip'}
                      >
                        {generating ? 'Generating...' : 'Generate Payslip'}
                      </button>
                      <button
                        onClick={() => deletePayrollRecord(payroll)}
                        disabled={generating || deletingPayrollId === (payroll._id || payroll.id) || deletingAllPayrolls}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete payroll record"
                      >
                        {deletingPayrollId === (payroll._id || payroll.id) ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payslips Section */}
      {activeTab === 'generatedPayslips' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            {/* Title and Action Button */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">Generated Payslips</h4>
                <p className="text-sm text-gray-500">View and download generated payslips</p>
              </div>
              <button
                onClick={deleteAllFilteredPayslips}
                disabled={deletingAllPayslips || filteredPayslips.length === 0}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {deletingAllPayslips ? 'Deleting...' : 'Delete All'}
              </button>
            </div>
            
            {/* Combined Filters Row */}
            <div className="flex gap-2 items-center">
              {/* Search Bar - Takes most space */}
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={payslipSearchQuery}
                  onChange={(e) => setPayslipSearchQuery(e.target.value)}
                  placeholder="Search employee, period, date..."
                  className="block w-full pl-9 pr-9 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 text-sm"
                />
                {payslipSearchQuery && (
                  <button
                    onClick={() => setPayslipSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Date From */}
              <input
                type="date"
                value={payslipDateFrom}
                onChange={(e) => setPayslipDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              
              <span className="text-gray-400">—</span>
              
              {/* Date To */}
              <input
                type="date"
                value={payslipDateTo}
                onChange={(e) => setPayslipDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-700 bg-white hover:border-gray-400 transition-colors"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                  <option value="completed">Completed</option>
                </select>
                <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Sort Order */}
              <select
                value={payslipSortOrder}
                onChange={(e) => setPayslipSortOrder(e.target.value as "generated_desc" | "generated_asc")}
                className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="generated_desc">↓ Newest</option>
                <option value="generated_asc">↑ Oldest</option>
              </select>

              {/* Reset Button */}
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterEmployee('all');
                  setPayslipDateFrom('');
                  setPayslipDateTo('');
                  setPayslipSortOrder('generated_desc');
                  setPayslipSearchQuery('');
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors whitespace-nowrap"
                title="Reset all filters"
              >
                🔄 Reset
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cutoff Period</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayslips.map((payslip, index) => (
                  <tr key={payslip._id || payslip.id || `payslip-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payslip.employeeName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payslip.cutoffPeriod}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{payslip.netPay?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payslip.generatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => viewPayslip(payslip)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => downloadPayslip(payslip._id || payslip.id || '')}
                        className="text-green-600 hover:text-green-900"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => deletePayslipRecord(payslip)}
                        disabled={deletingPayslipId === (payslip._id || payslip.id) || deletingAllPayslips}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingPayslipId === (payslip._id || payslip.id) ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

              {/* Payslip View Modal */}
        {showPayslipModal && selectedPayroll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-gray-200">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Payslip Preview</h3>
                  <button
                    onClick={() => setShowPayslipModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
                  </button>
                </div>
                
                {/* Payslip Content - Paper Style */}
                <div className="bg-white border border-gray-300 p-8 max-w-4xl mx-auto">
                  {/* Header */}
                  <div className="text-center mb-8 border-b-2 border-gray-300 pb-4">
                    <h1 className="text-4xl font-bold text-black mb-2">PAY SLIP</h1>
                    <p className="text-xl font-bold text-black">
                      SALARY FOR THE PERIOD: {new Date(selectedPayroll.cutoffStart).toLocaleDateString()} - {new Date(selectedPayroll.cutoffEnd).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Employee and Company Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Employee Details */}
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="font-bold text-black">EMPLOYEE NAME:</span>
                        <span className="text-black">{selectedPayroll.employeeName}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="font-bold text-black">EMPLOYEE ID:</span>
                        <span className="text-black">{selectedPayroll.employeeId}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="font-bold text-black">CUTOFF PERIOD:</span>
                        <span className="text-black">{new Date(selectedPayroll.cutoffStart).toLocaleDateString()} - {new Date(selectedPayroll.cutoffEnd).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Company Details */}
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="font-bold text-black">COMPANY:</span>
                        <span className="text-black">TGS BPO PAYROLL SYSTEM</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="font-bold text-black">STATUS:</span>
                        <span className="text-black">{selectedPayroll.status?.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="font-bold text-black">GENERATED:</span>
                        <span className="text-black">{new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additions and Deductions Table */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Additions Column */}
                    <div>
                      <h3 className="text-xl font-bold text-black mb-4 text-center border-b-2 border-gray-300 pb-2">ADDITIONS</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">BASIC SALARY:</span>
                          <span className="text-black">₱{selectedPayroll.basicSalary?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">HOLIDAY PAY:</span>
                          <span className="text-black">₱{selectedPayroll.holidayPay?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">NIGHT DIFFERENTIAL:</span>
                          <span className="text-black">₱{selectedPayroll.nightDifferential?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">SALARY ADJUSTMENT:</span>
                          <span className="text-black">₱{selectedPayroll.salaryAdjustment?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">FOOD ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.foodAllowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">TRANSPORTATION ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.transportationAllowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">COMPLEXITY ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.complexityAllowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">OBSERVATIONAL ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.observationalAllowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">COMMUNICATIONS ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.communicationsAllowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">INTERNET ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.internetAllowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">RICE SUBSIDY ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.riceSubsidyAllowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">CLOTHING ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.clothingAllowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">LAUNDRY ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.laundryAllowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">OTHER ALLOWANCE:</span>
                          <span className="text-black">₱{selectedPayroll.allowance?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b-2 border-gray-300 pb-2 pt-2">
                          <span className="font-bold text-black text-lg">TOTAL ADDITIONS:</span>
                          <span className="font-bold text-black text-lg">₱{selectedPayroll.grossPay?.toLocaleString() || '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deductions Column */}
                    <div>
                      <h3 className="text-xl font-bold text-black mb-4 text-center border-b-2 border-gray-300 pb-2">DEDUCTIONS</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">ABSENCES:</span>
                          <span className="text-black">₱{selectedPayroll.absences?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">LATE DEDUCTIONS:</span>
                          <span className="text-black">₱{selectedPayroll.lateDeductions?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">SSS CONTRIBUTION:</span>
                          <span className="text-black">₱{selectedPayroll.sssContribution?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">PHILHEALTH:</span>
                          <span className="text-black">₱{selectedPayroll.philhealthContribution?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">PAG-IBIG:</span>
                          <span className="text-black">₱{selectedPayroll.pagibigContribution?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="font-bold text-black">WITHHOLDING TAX:</span>
                          <span className="text-black">₱{selectedPayroll.withholdingTax?.toLocaleString() || '0.00'}</span>
                        </div>
                        <div className="flex justify-between border-b-2 border-gray-300 pb-2 pt-2">
                          <span className="font-bold text-black text-lg">TOTAL DEDUCTIONS:</span>
                          <span className="font-bold text-black text-lg">₱{selectedPayroll.totalDeductions?.toLocaleString() || '0.00'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Salary Section */}
                  <div className="text-center border-t-2 border-gray-300 pt-6 mb-8">
                    <div className="flex justify-between items-center max-w-md mx-auto">
                      <span className="text-2xl font-bold text-black">NET SALARY:</span>
                      <span className="text-3xl font-bold text-black">₱{selectedPayroll.netPay?.toLocaleString() || '0.00'}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">(Net Salary in Words)</p>
                  </div>

                  {/* Footer */}
                  <div className="text-center border-t border-gray-300 pt-4">
                    <p className="text-sm text-gray-600 mb-2">Generated by TGS BPO Payroll System</p>
                    <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowPayslipModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const payslip = payslips.find(p => p.payrollId === (selectedPayroll._id || selectedPayroll.id));
                      if (payslip) {
                        downloadPayslip(payslip._id || payslip.id || '');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
        )}

      {/* Render Modals */}
      {successModal.open && (
        <SuccessModal
          isOpen={successModal.open}
          onClose={() => setSuccessModal({ open: false })}
          message={successModal.message}
        />
      )}
      {errorModal.open && (
        <ErrorModal
          isOpen={errorModal.open}
          onClose={() => setErrorModal({ open: false })}
          message={errorModal.message}
        />
      )}
      {warningModal.open && (
        <WarningModal
          isOpen={warningModal.open}
          onClose={() => setWarningModal({ open: false })}
          message={warningModal.message}
        />
      )}
    </div>
  );
}
