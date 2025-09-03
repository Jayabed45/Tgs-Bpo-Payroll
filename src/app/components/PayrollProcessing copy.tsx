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

  // const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  //   const { name, value } = e.target;
    
  //   // Ensure numeric fields store clean values
  //   const numericFields = ['basicSalary', 'workedHours', 'overtimeHours', 'holidayPay', 'nightDifferential', 
  //                         'salaryAdjustment', 'absences', 'lateDeductions', 'sssContribution', 
  //                         'philhealthContribution', 'pagibigContribution', 'withholdingTax'];
    
  //   setFormData(prev => ({
  //     ...prev,
  //     [name]: numericFields.includes(name) ? value.replace(/[^\d.-]/g, '') : value
  //   }));

  //   // Rest of your existing logic...
  // };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Ensure numeric fields store clean values
    const numericFields = ['basicSalary', 'workedHours', 'overtimeHours', 'holidayPay', 'nightDifferential', 
                          'salaryAdjustment', 'absences', 'lateDeductions', 'sssContribution', 
                          'philhealthContribution', 'pagibigContribution', 'withholdingTax'];
    
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? value.replace(/[^\d.-]/g, '') : value
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
    // Prevent recalculation when editing to preserve original values
    if (editingPayroll) {
      alert('Recalculation is disabled during edit mode to preserve the original payroll values. If you need to recalculate, please save your changes first and create a new payroll entry.');
      return;
    }
    
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

  const calculatePayrollLocally = (): { grossPay: number; totalDeductions: number; netPay: number } => {
    // Helper function to safely parse numbers and round to 2 decimal places
    const safeParseFloat = (value: string | number): number => {
      if (typeof value === 'number') return value;
      if (!value || value === '') return 0;
      const parsed = parseFloat(value.toString().replace(/,/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    const roundToCents = (value: number): number => Math.round(value * 100) / 100;
    
    // Parse all form values safely
    const basicSalary = safeParseFloat(formData.basicSalary);
    const overtimeHours = safeParseFloat(formData.overtimeHours);
    const holidayPay = safeParseFloat(formData.holidayPay);
    const nightDifferential = safeParseFloat(formData.nightDifferential);
    const salaryAdjustment = safeParseFloat(formData.salaryAdjustment);
    const absences = safeParseFloat(formData.absences);
    const lateDeductions = safeParseFloat(formData.lateDeductions);
    
    const sssContribution = safeParseFloat(formData.sssContribution);
    const philhealthContribution = safeParseFloat(formData.philhealthContribution);
    const pagibigContribution = safeParseFloat(formData.pagibigContribution);
    const withholdingTax = safeParseFloat(formData.withholdingTax);

    // Calculate overtime pay if overtime hours exist
    const workedHours = safeParseFloat(formData.workedHours) || 160; // Default to 160 if not provided
    const hourlyRate = workedHours > 0 ? basicSalary / workedHours : 0;
    const overtimePay = overtimeHours * hourlyRate * 1.25; // 125% of regular hourly rate

    // Debug logging BEFORE calculation to verify parsed values
    console.log('Parsed Values Debug:', {
      basicSalary, 
      overtimeHours, 
      overtimePay: roundToCents(overtimePay),
      holidayPay, 
      nightDifferential, 
      salaryAdjustment, 
      absences, 
      lateDeductions,
      sssContribution, 
      philhealthContribution, 
      pagibigContribution, 
      withholdingTax,
      workedHours,
      hourlyRate
    });

    // STEP-BY-STEP CALCULATION to prevent string concatenation
    let grossPayCalculation = 0;
    grossPayCalculation += basicSalary;
    grossPayCalculation += overtimePay;
    grossPayCalculation += holidayPay;
    grossPayCalculation += nightDifferential;
    grossPayCalculation += salaryAdjustment;
    grossPayCalculation -= absences;
    grossPayCalculation -= lateDeductions;
    
    const grossPay = roundToCents(grossPayCalculation);
    
    // Calculate total deductions step by step
    let deductionsCalculation = 0;
    deductionsCalculation += sssContribution;
    deductionsCalculation += philhealthContribution;
    deductionsCalculation += pagibigContribution;
    deductionsCalculation += withholdingTax;
    
    const totalDeductions = roundToCents(deductionsCalculation);
    
    // Calculate net pay
    const netPay = roundToCents(Math.max(0, grossPay - totalDeductions));

    // Final debug logging
    console.log('Final Calculation Results:', {
      grossPay,
      totalDeductions,
      netPay
    });

    // Validation check for unrealistic values
    if (grossPay > 10000000 || totalDeductions > 10000000 || netPay > 10000000) {
      console.error('WARNING: Unrealistic calculation results detected!');
      console.error('This likely indicates a data type conversion error.');
      return { grossPay: 0, totalDeductions: 0, netPay: 0 };
    }

    return {
      grossPay: Math.max(0, grossPay),
      totalDeductions: Math.max(0, totalDeductions),
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
        <div>
          <h3 className="text-lg font-medium text-gray-900">Payroll Processing</h3>
          <p className="text-sm text-gray-500">Calculate and process employee payroll</p>
      </div>

      {/* Add/Edit Form Sliding Panel */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl transform transition-all duration-500 ease-in-out z-50 ${
        showPayrollForm ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {editingPayroll ? 'Edit Payroll' : 'Process New Payroll'}
                </h4>
                <p className="text-sm text-gray-600">Calculate and process employee payroll</p>
              </div>
        </div>
        <button 
          onClick={() => {
                setShowPayrollForm(false);
            resetForm();
          }}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
        </button>
      </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Employee and Cutoff Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Employee & Cutoff Period</h5>
                </div>
                
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Employee
                    </label>
                                 <select
                   name="employeeId"
                   value={formData.employeeId}
                   onChange={handleInputChange}
                   required
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                 >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} - {emp.position}</option>
                  ))}
                </select>
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Cutoff Start Date
                    </label>
                                 <input
                   type="date"
                   name="cutoffStart"
                   value={formData.cutoffStart}
                   onChange={handleInputChange}
                   required
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                 />
              </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Cutoff End Date
                    </label>
                <input
                  type="date"
                  name="cutoffEnd"
                  value={formData.cutoffEnd}
                  onChange={handleInputChange}
                  required
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />
              </div>
                </div>
              </div>

              {/* Salary and Hours Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Salary & Hours</h5>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Basic Salary
                    </label>
                <input
                  type="number"
                  name="basicSalary"
                  value={formData.basicSalary}
                  onChange={handleInputChange}
                  required
                  min="0"
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Worked Hours
                    </label>
                <input
                  type="number"
                  name="workedHours"
                  value={formData.workedHours}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                      placeholder="Hours"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Overtime Hours
                    </label>
                <input
                  type="number"
                  name="overtimeHours"
                  value={formData.overtimeHours}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                      placeholder="Hours"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Holiday Pay
                    </label>
                <input
                  type="number"
                  name="holidayPay"
                  value={formData.holidayPay}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      Night Differential
                    </label>
                <input
                  type="number"
                  name="nightDifferential"
                  value={formData.nightDifferential}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Salary Adjustment
                    </label>
                <input
                  type="number"
                  name="salaryAdjustment"
                  value={formData.salaryAdjustment}
                  onChange={handleInputChange}
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
              </div>
                </div>
              </div>

              {/* Deductions Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-red-500 rounded-full"></div>
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Deductions</h5>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Absences (Deduction)
                    </label>
                <input
                  type="number"
                  name="absences"
                  value={formData.absences}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white"
                />
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Late Deductions
                    </label>
                <input
                  type="number"
                  name="lateDeductions"
                  value={formData.lateDeductions}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 bg-white"
                />
              </div>
                </div>
              </div>

              {/* Government Contributions Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Government Contributions</h5>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      SSS Contribution
                    </label>
                <input
                  type="number"
                  name="sssContribution"
                  value={formData.sssContribution}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                />
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PhilHealth Contribution
                    </label>
                <input
                  type="number"
                  name="philhealthContribution"
                  value={formData.philhealthContribution}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                />
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Pag-IBIG Contribution
                    </label>
                <input
                  type="number"
                  name="pagibigContribution"
                  value={formData.pagibigContribution}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                />
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Withholding Tax
                    </label>
                <input
                  type="number"
                  name="withholdingTax"
                  value={formData.withholdingTax}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                      placeholder="₱0.00"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                />
                  </div>
              </div>
            </div>

            {/* Calculate Button */}
              <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={calculatePayroll}
                disabled={calculating}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                {calculating ? 'Calculating...' : 'Calculate Payroll'}
              </button>
            </div>

            {/* Calculated Results */}
            {(calculatedValues.grossPay > 0 || calculatedValues.totalDeductions > 0 || calculatedValues.netPay > 0) && (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-4 text-center">Calculated Results</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">₱{Number(calculatedValues.grossPay || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Gross Pay</div>
                  </div>
                  <div className="text-center">
                      <div className="text-3xl font-bold text-red-600">₱{Number(calculatedValues.totalDeductions || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Total Deductions</div>
                  </div>
                  <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">₱{Number(calculatedValues.netPay || 0).toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Net Pay</div>
                  </div>
                </div>
                
                {/* Status Information */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
            </form>
          </div>

          {/* Footer with buttons */}
          <div className="p-6 border-t border-gray-200 bg-white">
            <div className="flex justify-end space-x-3">
              {/* Cancel button */}
              <button
                type="button"
                onClick={() => {
                  setShowPayrollForm(false);
                  resetForm();
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>

              {/* Save as Draft button */}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={formLoading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium shadow-sm"
              >
                {formLoading ? (
                  <div className="flex items-center space-x-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                          5.291A7.962 7.962 0 014 12H0c0 3.042 
                          1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Saving...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l3 3m0 0l-3 3m3-3H9"
                      />
                    </svg>
                    <span>{editingPayroll ? "Save Changes" : "Save as Draft"}</span>
                  </div>
                )}
              </button>

              {/* Process Payroll button */}
              <button
                type="button"
                onClick={processPayroll}
                disabled={processing || !calculatedValues.grossPay}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all font-medium shadow-sm"
              >
                {processing ? (
                  <div className="flex items-center space-x-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                          5.291A7.962 7.962 0 014 12H0c0 3.042 
                          1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Processing...</span>
            </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>{editingPayroll ? "Update & Process" : "Process Payroll"}</span>
        </div>
      )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Add Payroll Button */}
      <button
        onClick={() => {
          resetForm();
          setShowPayrollForm(true);
        }}
        className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-all duration-200 hover:scale-110 z-40"
        title="Process New Payroll"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

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
