"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";

interface Employee {
  id: string;
  name: string;
  position: string;
  salary: number;
}

interface PayrollProcessingProps {
  onPayrollStatusChange?: () => void;
}

export default function PayrollProcessing({ onPayrollStatusChange }: PayrollProcessingProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    cutoffStart: "",
    cutoffEnd: "",
    basicSalary: "",
    workedHours: "",
    overtimeHours: "",
    holidayPay: "",
    nightDifferential: "",
    salaryAdjustment: "",
    absences: "",
    lateDeductions: "",
    sssContribution: "",
    philhealthContribution: "",
    pagibigContribution: "",
    withholdingTax: ""
  });

  // Calculated values
  const [calculatedValues, setCalculatedValues] = useState({
    grossPay: 0,
    totalDeductions: 0,
    netPay: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [employeesResponse, payrollsResponse] = await Promise.all([
        apiService.getEmployees(),
        apiService.getPayrolls()
      ]);
      
      setEmployees(employeesResponse.employees);
      setPayrolls(payrollsResponse.payrolls);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fill employee details when employee is selected
    if (name === 'employeeId') {
      const selectedEmployee = employees.find(emp => emp.id === value);
      if (selectedEmployee) {
        setFormData(prev => ({
          ...prev,
          employeeId: value,
          employeeName: selectedEmployee.name || '',
          basicSalary: selectedEmployee.salary?.toString() || ''
        }));
      }
    }
  };

  const calculatePayroll = async () => {
    // Validate required fields
    if (!formData.employeeId || !formData.basicSalary || !formData.cutoffStart || !formData.cutoffEnd) {
      alert('Please fill in all required fields: Employee, Basic Salary, Cutoff Start, and Cutoff End dates');
      return;
    }

    setCalculating(true);
    try {
      // First try to use the backend API
      const response = await apiService.calculatePayroll(formData);
      setCalculatedValues(response.calculations);
    } catch (error) {
      console.error('Backend calculation failed, using local calculation:', error);
      
      // Fallback to local calculation if backend fails
      const localCalculations = calculatePayrollLocally();
      setCalculatedValues(localCalculations);
    } finally {
      setCalculating(false);
    }
  };

  const calculatePayrollLocally = () => {
    const basicSalary = parseFloat(formData.basicSalary) || 0;
    const holidayPay = parseFloat(formData.holidayPay) || 0;
    const nightDifferential = parseFloat(formData.nightDifferential) || 0;
    const salaryAdjustment = parseFloat(formData.salaryAdjustment) || 0;
    const absences = parseFloat(formData.absences) || 0;
    const lateDeductions = parseFloat(formData.lateDeductions) || 0;
    
    const sssContribution = parseFloat(formData.sssContribution) || 0;
    const philhealthContribution = parseFloat(formData.philhealthContribution) || 0;
    const pagibigContribution = parseFloat(formData.pagibigContribution) || 0;
    const withholdingTax = parseFloat(formData.withholdingTax) || 0;

    const grossPay = basicSalary + holidayPay + nightDifferential + salaryAdjustment - absences - lateDeductions;
    const totalDeductions = sssContribution + philhealthContribution + pagibigContribution + withholdingTax;
    const netPay = Math.max(0, grossPay - totalDeductions);

    return {
      grossPay: Math.max(0, grossPay),
      totalDeductions,
      netPay: Math.max(0, netPay)
    };
  };

  const processPayroll = async () => {
    if (!calculatedValues.grossPay || calculatedValues.grossPay === 0) {
      alert('Please calculate payroll first before processing');
      return;
    }

    if (editingPayroll && editingPayroll.status === 'completed') {
      alert('Completed payrolls cannot be processed. Please contact an administrator if changes are needed.');
      return;
    }

    setProcessing(true);
    try {
      // Update the payroll status to "processed"
      const payrollData = {
        ...formData,
        basicSalary: parseFloat(formData.basicSalary) || 0,
        workedHours: parseFloat(formData.workedHours) || 0,
        overtimeHours: parseFloat(formData.overtimeHours) || 0,
        holidayPay: parseFloat(formData.holidayPay) || 0,
        nightDifferential: parseFloat(formData.nightDifferential) || 0,
        salaryAdjustment: parseFloat(formData.salaryAdjustment) || 0,
        absences: parseFloat(formData.absences) || 0,
        lateDeductions: parseFloat(formData.lateDeductions) || 0,
        sssContribution: parseFloat(formData.sssContribution) || 0,
        philhealthContribution: parseFloat(formData.philhealthContribution) || 0,
        pagibigContribution: parseFloat(formData.pagibigContribution) || 0,
        withholdingTax: parseFloat(formData.withholdingTax) || 0,
        grossPay: calculatedValues.grossPay,
        totalDeductions: calculatedValues.totalDeductions,
        netPay: calculatedValues.netPay,
        status: 'processed' // Set status to processed
      };

      if (editingPayroll) {
        await apiService.updatePayroll(editingPayroll.id, payrollData);
        alert('Payroll updated and processed successfully! Status changed to "Processed"');
      } else {
        await apiService.createPayroll(payrollData);
        alert('Payroll processed successfully! Status changed to "Processed"');
      }
      
      setShowPayrollForm(false);
      resetForm();
      fetchData(); // Refresh the list
      
      // Notify parent component about payroll status change
      if (onPayrollStatusChange) {
        onPayrollStatusChange();
      }
    } catch (error: any) {
      alert(error.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (payroll: any) => {
    if (payroll.status === 'completed') {
      alert('Completed payrolls cannot be edited. Please contact an administrator if changes are needed.');
      return;
    }

    setEditingPayroll(payroll);
    setFormData({
      employeeId: payroll.employeeId || "",
      employeeName: payroll.employeeName || "",
      cutoffStart: payroll.cutoffStart ? new Date(payroll.cutoffStart).toISOString().split('T')[0] : "",
      cutoffEnd: payroll.cutoffEnd ? new Date(payroll.cutoffEnd).toISOString().split('T')[0] : "",
      basicSalary: payroll.basicSalary?.toString() || "",
      workedHours: payroll.workedHours?.toString() || "",
      overtimeHours: payroll.overtimeHours?.toString() || "",
      holidayPay: payroll.holidayPay?.toString() || "",
      nightDifferential: payroll.nightDifferential?.toString() || "",
      salaryAdjustment: payroll.salaryAdjustment?.toString() || "",
      absences: payroll.absences?.toString() || "",
      lateDeductions: payroll.lateDeductions?.toString() || "",
      sssContribution: payroll.sssContribution?.toString() || "",
      philhealthContribution: payroll.philhealthContribution?.toString() || "",
      pagibigContribution: payroll.pagibigContribution?.toString() || "",
      withholdingTax: payroll.withholdingTax?.toString() || ""
    });
    setCalculatedValues({
      grossPay: payroll.grossPay || 0,
      totalDeductions: payroll.totalDeductions || 0,
      netPay: payroll.netPay || 0
    });
    setShowPayrollForm(true);
  };

  const handleDelete = async (id: string) => {
    const payroll = payrolls.find(p => p.id === id);
    if (!payroll) return;

    let confirmMessage = 'Are you sure you want to delete this payroll?';
    if (payroll.status === 'processed') {
      confirmMessage = 'This payroll has been processed. Are you sure you want to delete it? This action cannot be undone.';
    } else if (payroll.status === 'completed') {
      confirmMessage = '⚠️ WARNING: This payroll has been completed. Deleting it may affect financial records and compliance. Are you absolutely sure you want to proceed?';
    }

    if (confirm(confirmMessage)) {
      try {
        await apiService.deletePayroll(id);
        alert('Payroll deleted successfully!');
        fetchData(); // Refresh the list
        
        // Notify parent component about payroll status change
        if (onPayrollStatusChange) {
          onPayrollStatusChange();
        }
      } catch (error: any) {
        alert(error.message || 'Delete failed');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      employeeName: "",
      cutoffStart: "",
      cutoffEnd: "",
      basicSalary: "",
      workedHours: "",
      overtimeHours: "",
      holidayPay: "",
      nightDifferential: "",
      salaryAdjustment: "",
      absences: "",
      lateDeductions: "",
      sssContribution: "",
      philhealthContribution: "",
      pagibigContribution: "",
      withholdingTax: ""
    });
    setCalculatedValues({ grossPay: 0, totalDeductions: 0, netPay: 0 });
    setEditingPayroll(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    if (editingPayroll && editingPayroll.status === 'completed') {
      alert('Completed payrolls cannot be modified. Please contact an administrator if changes are needed.');
      setFormLoading(false);
      return;
    }

    try {
      const payrollData = {
        ...formData,
        basicSalary: parseFloat(formData.basicSalary) || 0,
        workedHours: parseFloat(formData.workedHours) || 0,
        overtimeHours: parseFloat(formData.overtimeHours) || 0,
        holidayPay: parseFloat(formData.holidayPay) || 0,
        nightDifferential: parseFloat(formData.nightDifferential) || 0,
        salaryAdjustment: parseFloat(formData.salaryAdjustment) || 0,
        absences: parseFloat(formData.absences) || 0,
        lateDeductions: parseFloat(formData.lateDeductions) || 0,
        sssContribution: parseFloat(formData.sssContribution) || 0,
        philhealthContribution: parseFloat(formData.philhealthContribution) || 0,
        pagibigContribution: parseFloat(formData.pagibigContribution) || 0,
        withholdingTax: parseFloat(formData.withholdingTax) || 0,
        grossPay: calculatedValues.grossPay,
        totalDeductions: calculatedValues.totalDeductions,
        netPay: calculatedValues.netPay,
        status: 'pending' // Explicitly set as pending (draft)
      };

      if (editingPayroll) {
        await apiService.updatePayroll(editingPayroll.id, payrollData);
        alert('Payroll updated successfully! Status: Pending');
      } else {
        await apiService.createPayroll(payrollData);
        alert('Payroll saved as draft successfully! Status: Pending');
      }
      
      setShowPayrollForm(false);
      resetForm();
      fetchData(); // Refresh the list
    } catch (error: any) {
      alert(error.message || 'Operation failed');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Payroll Processing</h3>
          <p className="text-sm text-gray-500">Calculate and process employee payroll</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setShowPayrollForm(true);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          Process New Payroll
        </button>
      </div>

      {/* Payroll Form */}
      {showPayrollForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {editingPayroll ? 'Edit Payroll' : 'Process New Payroll'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                                 <select
                   name="employeeId"
                   value={formData.employeeId}
                   onChange={handleInputChange}
                   required
                   className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                 >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.position}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cutoff Start Date</label>
                                 <input
                   type="date"
                   name="cutoffStart"
                   value={formData.cutoffStart}
                   onChange={handleInputChange}
                   required
                   className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                 />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cutoff End Date</label>
                <input
                  type="date"
                  name="cutoffEnd"
                  value={formData.cutoffEnd}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Basic Salary</label>
                <input
                  type="number"
                  name="basicSalary"
                  value={formData.basicSalary}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Worked Hours</label>
                <input
                  type="number"
                  name="workedHours"
                  value={formData.workedHours}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Overtime Hours</label>
                <input
                  type="number"
                  name="overtimeHours"
                  value={formData.overtimeHours}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Holiday Pay</label>
                <input
                  type="number"
                  name="holidayPay"
                  value={formData.holidayPay}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Night Differential</label>
                <input
                  type="number"
                  name="nightDifferential"
                  value={formData.nightDifferential}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Salary Adjustment</label>
                <input
                  type="number"
                  name="salaryAdjustment"
                  value={formData.salaryAdjustment}
                  onChange={handleInputChange}
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Absences (Deduction)</label>
                <input
                  type="number"
                  name="absences"
                  value={formData.absences}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Late Deductions</label>
                <input
                  type="number"
                  name="lateDeductions"
                  value={formData.lateDeductions}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">SSS Contribution</label>
                <input
                  type="number"
                  name="sssContribution"
                  value={formData.sssContribution}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PhilHealth Contribution</label>
                <input
                  type="number"
                  name="philhealthContribution"
                  value={formData.philhealthContribution}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Pag-IBIG Contribution</label>
                <input
                  type="number"
                  name="pagibigContribution"
                  value={formData.pagibigContribution}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Withholding Tax</label>
                <input
                  type="number"
                  name="withholdingTax"
                  value={formData.withholdingTax}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-black bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Calculate Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={calculatePayroll}
                disabled={calculating}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calculating ? 'Calculating...' : 'Calculate Payroll'}
              </button>
            </div>

            {/* Calculated Results */}
            {calculatedValues.grossPay > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-3">Calculated Results</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">₱{(calculatedValues.grossPay || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Gross Pay</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">₱{(calculatedValues.totalDeductions || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Total Deductions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">₱{(calculatedValues.netPay || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Net Pay</div>
                  </div>
                </div>
                
                {/* Status Information */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm text-blue-800">
                    <strong>Next Steps:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• <strong>Save as Draft:</strong> Creates payroll with "Pending" status</li>
                      <li>• <strong>Process Payroll:</strong> Creates payroll with "Processed" status</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPayrollForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : (editingPayroll ? 'Save Changes' : 'Save as Draft')}
              </button>
              <button
                type="button"
                onClick={processPayroll}
                disabled={processing || !calculatedValues.grossPay}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {processing ? 'Processing...' : (editingPayroll ? 'Update & Process' : 'Process Payroll')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payroll List */}
      {payrolls.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll data</h3>
              <p className="mt-1 text-sm text-gray-500">Start processing payroll for your employees.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cutoff Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gross Pay
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Pay
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrolls.map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                                               <div className="text-sm font-medium text-black">{payroll.employeeName || 'Unknown Employee'}</div>
                       <div className="text-sm text-black">ID: {payroll.employeeId || 'N/A'}</div>
                      </div>
                    </td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                       {payroll.cutoffStart ? new Date(payroll.cutoffStart).toLocaleDateString() : 'N/A'} - {payroll.cutoffEnd ? new Date(payroll.cutoffEnd).toLocaleDateString() : 'N/A'}
                     </td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-black">₱{(payroll.grossPay || 0).toLocaleString()}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-black">₱{(payroll.netPay || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        payroll.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : payroll.status === 'processed'
                          ? 'bg-blue-100 text-blue-800'
                          : payroll.status === 'deleted'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payroll.status === 'deleted' ? 'Deleted' : 
                         (payroll.status || 'pending').charAt(0).toUpperCase() + (payroll.status || 'pending').slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {payroll.status !== 'deleted' && (
                        <>
                          <button
                            onClick={() => handleEdit(payroll)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            title={payroll.status === 'completed' ? 'Completed payrolls cannot be edited' : 'Edit payroll'}
                            disabled={payroll.status === 'completed'}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(payroll.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete payroll"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {payroll.status === 'deleted' && (
                        <span className="text-gray-400 text-sm">No actions available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
