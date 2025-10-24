"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";

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
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [showPayslipModal, setShowPayslipModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  
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
      
      setPayrolls(payrollsResponse.payrolls || []);
      setPayslips(payslipsResponse.payslips || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePayslip = async (payroll: Payroll) => {
    if (payroll.status !== 'processed' && payroll.status !== 'completed') {
      setWarningModal({ open: true, message: 'Only processed or completed payrolls can generate payslips' });
      return;
    }

    setGenerating(true);
    try {
      const payslip = await apiService.generatePayslip(payroll._id || payroll.id || '');
      setSuccessModal({ open: true, message: 'Payslip generated successfully!' });
      fetchData(); // Refresh the list
    } catch (error: any) {
      setErrorModal({ open: true, message: error.message || 'Failed to generate payslip' });
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
    } catch (error: any) {
      console.error('Download error:', error);
      setErrorModal({ open: true, message: error.message || 'Failed to download payslip' });
    }
  };

  const viewPayslip = (payslip: Payslip) => {
    setSelectedPayroll(payrolls.find(p => p.id === payslip.payrollId) || null);
    setShowPayslipModal(true);
  };

  const filteredPayrolls = payrolls.filter(payroll => {
    const statusMatch = filterStatus === 'all' || payroll.status === filterStatus;
    const employeeMatch = filterEmployee === 'all' || 
      (payroll.employeeName && payroll.employeeName.toLowerCase().includes(filterEmployee.toLowerCase()));
    return statusMatch && employeeMatch;
  });

  const filteredPayslips = payslips.filter(payslip => {
    const payroll = payrolls.find(p => (p._id || p.id) === payslip.payrollId);
    if (!payroll) return false;
    
    const statusMatch = filterStatus === 'all' || payroll.status === filterStatus;
    const employeeMatch = filterEmployee === 'all' || 
      (payroll.employeeName && payroll.employeeName.toLowerCase().includes(filterEmployee.toLowerCase()));
    return statusMatch && employeeMatch;
  });

  console.log('Current filters - Status:', filterStatus, 'Employee:', filterEmployee);
  console.log('Total payrolls:', payrolls.length, 'Filtered payrolls:', filteredPayrolls.length);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Reports & Payslips</h3>
          <p className="text-sm text-gray-500">Generate and view payroll reports and payslips</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Status Filter</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                console.log('Status filter changed to:', e.target.value);
                setFilterStatus(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
            >
              <option value="all" className="text-gray-900">All Statuses</option>
              <option value="pending" className="text-gray-900">Pending</option>
              <option value="processed" className="text-gray-900">Processed</option>
              <option value="completed" className="text-gray-900">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Employee Filter</label>
            <input
              type="text"
              placeholder="Search employee..."
              value={filterEmployee}
              onChange={(e) => {
                const searchValue = e.target.value;
                console.log('Employee filter changed to:', searchValue);
                setFilterEmployee(searchValue);
              }}
              className="w-full px-3 py-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterEmployee('all');
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Clear Filters
        </button>
      </div>
        </div>
      </div>

      {/* Payrolls Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Payroll Records</h4>
          <p className="text-sm text-gray-500">
            {filterEmployee !== 'all' || filterStatus !== 'all' 
              ? `Showing ${filteredPayrolls.length} of ${payrolls.length} payrolls`
              : `Select a payroll to generate payslip`
            }
          </p>
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
                    <div className="text-sm text-gray-500">ID: {payroll.employeeId}</div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => generatePayslip(payroll)}
                      disabled={generating || (payroll.status !== 'processed' && payroll.status !== 'completed')}
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={payroll.status !== 'processed' && payroll.status !== 'completed' ? 'Only processed/completed payrolls can generate payslips' : 'Generate payslip'}
                    >
                      {generating ? 'Generating...' : 'Generate Payslip'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslips Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900">Generated Payslips</h4>
          <p className="text-sm text-gray-500">View and download generated payslips</p>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
