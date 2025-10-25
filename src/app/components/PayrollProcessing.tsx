"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";
import { calculateSSS, calculatePhilHealth, calculatePagIBIG, calculateWithholdingTax } from "../utils/philippinePayroll";

interface Employee {
  id: string;
  name: string;
  position: string;
  salary: number;
}

interface PayrollProcessingProps {
  onPayrollStatusChange?: () => void;
  onPayrollChange?: () => void;
}

// Modal Component Interfaces
interface PayrollSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

interface PayrollErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

interface PayrollWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

interface PayrollDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  payrollName: string;
  message?: string;
}

// Modal Components
function PayrollSuccessModal({ isOpen, onClose, message }: PayrollSuccessModalProps) {
  console.log(' PayrollSuccessModal render:', { isOpen, message }); // Debug log
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

function PayrollErrorModal({ isOpen, onClose, message }: PayrollErrorModalProps) {
  console.log('❌ PayrollErrorModal render:', { isOpen, message }); // Debug log
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

function PayrollWarningModal({ isOpen, onClose, message }: PayrollWarningModalProps) {
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

function PayrollDeleteModal({ isOpen, onClose, onConfirm, payrollName, message }: PayrollDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-red-600">
          CRITICAL: Delete Payroll?
        </h2>

        <p className="mt-2 text-sm text-gray-700">
          {message}
        </p>

        <p className="mt-3 text-sm text-gray-800">
          Employee: <b>{payrollName}</b>
        </p>

        <div className="flex justify-end space-x-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollProcessing({ onPayrollStatusChange, onPayrollChange }: PayrollProcessingProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPayrollForm, setShowPayrollForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);
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
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; payroll?: any; message?: string }>({
    open: false,
  });

  // Helper function to show modals
  const showModalMessage = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    console.log('🔔 showModalMessage called:', { type, title, message }); // Debug log
    
    if (type === 'success') {
      setSuccessModal({ open: true, message });
    } else if (type === 'error') {
      setErrorModal({ open: true, message });
    } else if (type === 'warning') {
      setWarningModal({ open: true, message });
    } else if (type === 'info') {
      // For now, treat info as success
      setSuccessModal({ open: true, message });
    }
  };

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

  // Select all state
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkFormData, setBulkFormData] = useState<{[key: string]: any}>({});
  
  // Search state for employee dropdown
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  // Settings state for contribution rates
  const [payrollSettings, setPayrollSettings] = useState({
    sssRate: 4.5,
    philhealthRate: 2.0,
    pagibigRate: 2.0,
    withholdingTaxRate: 15.0,
    overtimeMultiplier: 1.25,
    nightDiffRate: 10.0,
    holidayRate: 200.0,
  });

  // Calculated values
  const [calculatedValues, setCalculatedValues] = useState({
    grossPay: 0,
    totalDeductions: 0,
    netPay: 0
  });

  // Fetch payroll settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await apiService.getSettings();
        if (response.success && response.settings) {
          setPayrollSettings({
            sssRate: response.settings.sssRate || 4.5,
            philhealthRate: response.settings.philhealthRate || 2.0,
            pagibigRate: response.settings.pagibigRate || 2.0,
            withholdingTaxRate: response.settings.withholdingTaxRate || 15.0,
            overtimeMultiplier: response.settings.overtimeMultiplier || 1.25,
            nightDiffRate: response.settings.nightDiffRate || 10.0,
            holidayRate: response.settings.holidayRate || 200.0,
          });
        }
      } catch (error) {
        console.error("Error fetching payroll settings:", error);
        // Use default values if fetch fails
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchData();
    // Ensure forms are hidden when component mounts
    setShowPayrollForm(false);
    setShowBulkForm(false);
  }, []);

  // Filter employees based on search
  useEffect(() => {
    if (employeeSearch.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const searchLower = employeeSearch.toLowerCase();
      const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchLower) || 
        emp.position.toLowerCase().includes(searchLower)
      );
      setFilteredEmployees(filtered);
    }
  }, [employeeSearch, employees]);

  // Cleanup effect to hide forms when component unmounts
  useEffect(() => {
    return () => {
      setShowPayrollForm(false);
      setShowBulkForm(false);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.employee-search-container')) {
        setShowEmployeeDropdown(false);
      }
    };

    if (showEmployeeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmployeeDropdown]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [employeesResponse, payrollsResponse] = await Promise.all([
        apiService.getEmployees(),
        apiService.getPayrolls()
      ]);
      
      setEmployees(Array.isArray(employeesResponse.employees) ? employeesResponse.employees : []);
      setPayrolls(Array.isArray(payrollsResponse.payrolls) ? payrollsResponse.payrolls : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error to prevent crashes
      setEmployees([]);
      setPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-calculate contributions when basic salary changes
    if (name === 'basicSalary' && value) {
      const basicSalary = parseFloat(value);
      if (!isNaN(basicSalary) && basicSalary > 0) {
        const contributions = autoCalculateContributions(basicSalary);
        setFormData(prev => ({
          ...prev,
          [name]: value,
          ...contributions
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Bulk form handling
  const handleBulkFormChange = (employeeId: string, field: string, value: string) => {
    setBulkFormData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  const initializeBulkForm = () => {
    const initialData: {[key: string]: any} = {};
    employees.forEach(employee => {
      initialData[employee.id] = {
        workedHours: formData.workedHours || '',
        overtimeHours: formData.overtimeHours || '',
        holidayPay: formData.holidayPay || '',
        nightDifferential: formData.nightDifferential || '',
        salaryAdjustment: formData.salaryAdjustment || '',
        absences: formData.absences || '',
        lateDeductions: formData.lateDeductions || '',
        sssContribution: formData.sssContribution || '',
        philhealthContribution: formData.philhealthContribution || '',
        pagibigContribution: formData.pagibigContribution || '',
        withholdingTax: formData.withholdingTax || ''
      };
    });
    setBulkFormData(initialData);
    setShowBulkForm(true);
  };

  const calculatePayroll = async () => {
    // Prevent recalculation when editing to preserve original values
    if (editingPayroll) {
      showModalMessage('warning', 'Recalculation Disabled', 'Recalculation is disabled during edit mode to preserve the original payroll values. If you need to recalculate, please save your changes first and create a new payroll entry.');
      return;
    }
    
    // Validate required fields
    if (!formData.employeeId || !formData.cutoffStart || !formData.cutoffEnd) {
      showModalMessage('error', 'Missing Required Fields', 'Please fill in all required fields: Employee, Cutoff Start, and Cutoff End dates');
      return;
    }

    // For individual employee selection, basic salary is required
    if (formData.employeeId !== 'all' && !formData.basicSalary) {
      showModalMessage('error', 'Missing Basic Salary', 'Please fill in the Basic Salary field for individual employee payroll');
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

  // Auto-calculate contributions based on Philippine payroll system
  const autoCalculateContributions = (basicSalary: number) => {
    // Use actual Philippine contribution tables
    const sss = calculateSSS(basicSalary);
    const philhealth = calculatePhilHealth(basicSalary);
    const pagibig = calculatePagIBIG(basicSalary);
    const tax = calculateWithholdingTax(basicSalary);
    
    return {
      sssContribution: sss.toFixed(2),
      philhealthContribution: philhealth.toFixed(2),
      pagibigContribution: pagibig.toFixed(2),
      withholdingTax: tax.toFixed(2)
    };
  };

  const calculatePayrollLocally = () => {
    // Helper function to round to 2 decimal places (cents)
    const roundToCents = (value: number) => Math.round(value * 100) / 100;
    
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

    // Calculate with proper rounding at each step
    const grossPay = roundToCents(
      roundToCents(basicSalary) + 
      roundToCents(holidayPay) + 
      roundToCents(nightDifferential) + 
      roundToCents(salaryAdjustment)
    );
    
    const totalDeductions = roundToCents(
      roundToCents(absences) + 
      roundToCents(lateDeductions) + 
      roundToCents(sssContribution) + 
      roundToCents(philhealthContribution) + 
      roundToCents(pagibigContribution) + 
      roundToCents(withholdingTax)
    );
    
    const netPay = roundToCents(Math.max(0, grossPay - totalDeductions));

    // Debug logging to help identify the issue
    console.log('Local Calculation Debug:', {
      basicSalary, holidayPay, nightDifferential, salaryAdjustment, absences, lateDeductions,
      sssContribution, philhealthContribution, pagibigContribution, withholdingTax,
      calculatedGrossPay: grossPay,
      calculatedTotalDeductions: totalDeductions,
      calculatedNetPay: netPay,
      breakdown: {
        grossPayComponents: { basicSalary, holidayPay, nightDifferential, salaryAdjustment },
        deductionComponents: { absences, lateDeductions, sssContribution, philhealthContribution, pagibigContribution, withholdingTax }
      }
    });

    return {
      grossPay: Math.max(0, grossPay),
      totalDeductions,
      netPay: Math.max(0, netPay)
    };
  };

  const processPayroll = async () => {
    // Validate required fields
    if (!formData.employeeId || !formData.cutoffStart || !formData.cutoffEnd) {
      showModalMessage('error', 'Missing Required Fields', 'Please fill in all required fields: Employee, Cutoff Start, and Cutoff End dates');
      return;
    }

    // For individual employee selection, basic salary is required
    if (formData.employeeId !== 'all' && !formData.basicSalary) {
      showModalMessage('error', 'Missing Basic Salary', 'Please fill in the Basic Salary field for individual employee payroll');
      return;
    }

    if (editingPayroll && editingPayroll.status === 'completed') {
      showModalMessage('warning', 'Cannot Process', 'Completed payrolls cannot be processed. Please contact an administrator if changes are needed.');
      return;
    }

    setProcessing(true);
    try {
      // Handle bulk payroll creation for "Select All"
      if (formData.employeeId === 'all') {
        const createdPayrolls = [];
        const errors = [];

        for (const employee of employees) {
          try {
            // Get employee-specific data from bulk form
            const employeeData = bulkFormData[employee.id] || {};
            
            // Create payroll data for each employee
            const employeePayrollData = {
              ...formData,
              employeeId: employee.id,
              employeeName: employee.name,
              basicSalary: employee.salary,
              workedHours: parseFloat(employeeData.workedHours || formData.workedHours) || 0,
              overtimeHours: parseFloat(employeeData.overtimeHours || formData.overtimeHours) || 0,
              holidayPay: parseFloat(employeeData.holidayPay || formData.holidayPay) || 0,
              nightDifferential: parseFloat(employeeData.nightDifferential || formData.nightDifferential) || 0,
              salaryAdjustment: parseFloat(employeeData.salaryAdjustment || formData.salaryAdjustment) || 0,
              absences: parseFloat(employeeData.absences || formData.absences) || 0,
              lateDeductions: parseFloat(employeeData.lateDeductions || formData.lateDeductions) || 0,
              sssContribution: parseFloat(employeeData.sssContribution || formData.sssContribution) || 0,
              philhealthContribution: parseFloat(employeeData.philhealthContribution || formData.philhealthContribution) || 0,
              pagibigContribution: parseFloat(employeeData.pagibigContribution || formData.pagibigContribution) || 0,
              withholdingTax: parseFloat(employeeData.withholdingTax || formData.withholdingTax) || 0,
              status: 'processed'
            };

            // Calculate payroll for this employee
            const response = await apiService.calculatePayroll(employeePayrollData);
            const finalCalculations = response.calculations;

            // Create the payroll record
            const result = await apiService.createPayroll({
              ...employeePayrollData,
              grossPay: finalCalculations.grossPay,
              totalDeductions: finalCalculations.totalDeductions,
              netPay: finalCalculations.netPay
            });

            createdPayrolls.push(result.payroll);
          } catch (error: any) {
            errors.push(`Failed to create payroll for ${employee.name}: ${error.message}`);
          }
        }

        if (createdPayrolls.length > 0) {
          showModalMessage('success', 'Bulk Payroll Created', `Successfully created ${createdPayrolls.length} payroll records!${errors.length > 0 ? `\n\nErrors:\n${errors.join('\n')}` : ''}`);
        } else {
          showModalMessage('error', 'Creation Failed', 'Failed to create any payroll records. Please check the console for details.');
        }
      } else {
        // Handle individual employee payroll
      // Automatically calculate payroll if not already calculated
      let finalCalculations = calculatedValues;
      if (!calculatedValues.grossPay || calculatedValues.grossPay === 0) {
        try {
          // Try backend calculation first
          const response = await apiService.calculatePayroll(formData);
          finalCalculations = response.calculations;
        } catch (error) {
          console.error('Backend calculation failed, using local calculation:', error);
          // Fallback to local calculation
          finalCalculations = calculatePayrollLocally();
        }
      }

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
        grossPay: finalCalculations.grossPay,
        totalDeductions: finalCalculations.totalDeductions,
        netPay: finalCalculations.netPay,
        status: 'processed' // Set status to processed
      };

      if (editingPayroll) {
        await apiService.updatePayroll(editingPayroll.id, payrollData);
        showModalMessage('success', 'Success!', 'Payroll updated and processed successfully! Status changed to "Processed"');
      } else {
        await apiService.createPayroll(payrollData);
        showModalMessage('success', 'Success!', 'Payroll processed successfully! Status changed to "Processed"');
        }
      }
      
      // Don't do immediate cleanup - let the modal handle it
    } catch (error: any) {
      showModalMessage('error', 'Processing Failed', error.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (payroll: any) => {
    if (payroll.status === 'completed') {
      showModalMessage('warning', 'Cannot Edit', 'Completed payrolls cannot be edited. Please contact an administrator if changes are needed.');
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
    setEmployeeSearch(payroll.employeeName || "");
    setSelectAll(false); // Reset select all state when editing
    // Don't automatically show the form - let user decide
  };

  const handleDelete = (id: string) => {
    const payroll = payrolls.find(p => p.id === id);
    if (!payroll) return;

    let confirmMessage = 'Are you sure you want to permanently delete this payroll? This action cannot be undone.';
    if (payroll.status === 'processed') {
      confirmMessage = '⚠️ WARNING: This payroll has been processed. Deleting it will permanently remove all records. Are you absolutely sure?';
    } else if (payroll.status === 'completed') {
      confirmMessage = '⚠️ CRITICAL: This payroll has been completed. Deleting it will permanently remove all financial records and may affect compliance. Are you absolutely sure you want to proceed?';
    }

    setDeleteModal({ open: true, payroll, message: confirmMessage });
  };

  const confirmDelete = async () => {
    if (!deleteModal.payroll) return;

    try {
      await apiService.deletePayroll(deleteModal.payroll.id);
      setDeleteModal({ open: false });
      showModalMessage('success', 'Deleted Successfully', 'Payroll permanently deleted!');
      // Don't do immediate cleanup - let the modal handle it
    } catch (error: any) {
      setDeleteModal({ open: false });
      showModalMessage('error', 'Delete Failed', error.message || 'Delete failed');
    }
  };

  const handleEmployeeSelect = (employeeId: string, employeeName: string) => {
    if (employeeId === 'all') {
      // Handle select all
      setSelectAll(true);
      setFormData(prev => ({
        ...prev,
        employeeId: 'all',
        employeeName: 'All Employees',
        basicSalary: ''
      }));
    } else {
      // Handle individual employee selection
      setSelectAll(false);
      const selectedEmployee = employees.find(emp => emp.id === employeeId);
      if (selectedEmployee) {
        const salary = selectedEmployee.salary || 0;
        const contributions = autoCalculateContributions(salary);
        
        setFormData(prev => ({
          ...prev,
          employeeId: employeeId,
          employeeName: selectedEmployee.name || '',
          basicSalary: salary.toString(),
          ...contributions
        }));
      }
    }
    setEmployeeSearch(employeeName);
    setShowEmployeeDropdown(false);
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
    setSelectAll(false);
    setShowBulkForm(false);
    setBulkFormData({});
    setEmployeeSearch("");
    setShowEmployeeDropdown(false);
    // Ensure main form is also hidden
    setShowPayrollForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    if (editingPayroll && editingPayroll.status === 'completed') {
      showModalMessage('warning', 'Cannot Modify', 'Completed payrolls cannot be modified. Please contact an administrator if changes are needed.');
      setFormLoading(false);
      return;
    }

    // Validate required fields
    if (!formData.employeeId || !formData.cutoffStart || !formData.cutoffEnd) {
      showModalMessage('error', 'Missing Required Fields', 'Please fill in all required fields: Employee, Cutoff Start, and Cutoff End dates');
      setFormLoading(false);
      return;
    }

    // For individual employee selection, basic salary is required
    if (formData.employeeId !== 'all' && !formData.basicSalary) {
      showModalMessage('error', 'Missing Basic Salary', 'Please fill in the Basic Salary field for individual employee payroll');
      setFormLoading(false);
      return;
    }

    try {
      // Handle bulk payroll creation for "Select All"
      if (formData.employeeId === 'all') {
        const createdPayrolls = [];
        const errors = [];

        for (const employee of employees) {
          try {
            // Get employee-specific data from bulk form
            const employeeData = bulkFormData[employee.id] || {};
            
            // Create payroll data for each employee
            const employeePayrollData = {
              ...formData,
              employeeId: employee.id,
              employeeName: employee.name,
              basicSalary: employee.salary,
              workedHours: parseFloat(employeeData.workedHours || formData.workedHours) || 0,
              overtimeHours: parseFloat(employeeData.overtimeHours || formData.overtimeHours) || 0,
              holidayPay: parseFloat(employeeData.holidayPay || formData.holidayPay) || 0,
              nightDifferential: parseFloat(employeeData.nightDifferential || formData.nightDifferential) || 0,
              salaryAdjustment: parseFloat(employeeData.salaryAdjustment || formData.salaryAdjustment) || 0,
              absences: parseFloat(employeeData.absences || formData.absences) || 0,
              lateDeductions: parseFloat(employeeData.lateDeductions || formData.lateDeductions) || 0,
              sssContribution: parseFloat(employeeData.sssContribution || formData.sssContribution) || 0,
              philhealthContribution: parseFloat(employeeData.philhealthContribution || formData.philhealthContribution) || 0,
              pagibigContribution: parseFloat(employeeData.pagibigContribution || formData.pagibigContribution) || 0,
              withholdingTax: parseFloat(employeeData.withholdingTax || formData.withholdingTax) || 0,
              grossPay: calculatedValues.grossPay,
              totalDeductions: calculatedValues.totalDeductions,
              netPay: calculatedValues.netPay,
              status: 'pending' // Save as draft
            };

            // Create the payroll record
            const result = await apiService.createPayroll(employeePayrollData);
            createdPayrolls.push(result.payroll);
          } catch (error: any) {
            errors.push(`Failed to create payroll for ${employee.name}: ${error.message}`);
          }
        }

        if (createdPayrolls.length > 0) {
          showModalMessage('success', 'Bulk Drafts Saved', `Successfully saved ${createdPayrolls.length} payroll drafts!${errors.length > 0 ? `\n\nErrors:\n${errors.join('\n')}` : ''}`);
        } else {
          showModalMessage('error', 'Save Failed', 'Failed to create any payroll drafts. Please check the console for details.');
        }
      } else {
        // Handle individual employee payroll
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
        showModalMessage('success', 'Updated Successfully', 'Payroll updated successfully! Status: Pending');
      } else {
        await apiService.createPayroll(payrollData);
        showModalMessage('success', 'Draft Saved', 'Payroll saved as draft successfully! Status: Pending');
        }
      }
      
      // Don't do anything immediately - let the modal handle cleanup
    } catch (error: any) {
      showModalMessage('error', 'Operation Failed', error.message || 'Operation failed');
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

  // Don't render forms if they shouldn't be shown
  const shouldShowPayrollForm = showPayrollForm && !loading;
  const shouldShowBulkForm = showBulkForm && !loading;

  return (
    <>
    <div className="space-y-6">

      {/* Add/Edit Form Sliding Panel */}
      {shouldShowPayrollForm && (
      <div 
          className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl transform transition-all duration-500 ease-in-out z-50 translate-x-0"
        onClick={(e) => e.stopPropagation()}
      >
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
                  {editingPayroll ? 'Edit Payroll' : 'Create New Payroll'}
                </h4>
                <p className="text-sm text-gray-600">Auto-calculate and process employee payroll</p>
              </div>
        </div>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
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
            {/* Workflow Information */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h5 className="text-sm font-semibold text-green-800">Automatic Workflow</h5>
              </div>
              <p className="text-sm text-green-700">
                <strong>Process Payroll</strong> will automatically calculate all values and create the payroll record.
              </p>
            </div>
            
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
                    <div className="relative employee-search-container">
                      <div className="relative">
                        <input
                          type="text"
                          value={employeeSearch}
                          onChange={(e) => {
                            setEmployeeSearch(e.target.value);
                            setShowEmployeeDropdown(true);
                            // Clear selection if user types
                            if (formData.employeeId) {
                              setFormData(prev => ({
                                ...prev,
                                employeeId: "",
                                employeeName: "",
                                basicSalary: ""
                              }));
                              setSelectAll(false);
                            }
                          }}
                          onFocus={() => setShowEmployeeDropdown(true)}
                          placeholder="Search employee..."
                          required={!formData.employeeId}
                          className="w-full text-black pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {formData.employeeId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEmployeeSearch("");
                              setFormData(prev => ({
                                ...prev,
                                employeeId: "",
                                employeeName: "",
                                basicSalary: ""
                              }));
                              setSelectAll(false);
                              setShowEmployeeDropdown(false);
                            }}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {showEmployeeDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          <div
                            onClick={() => handleEmployeeSelect('all', '📋 Select All Employees')}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 font-semibold text-blue-600"
                          >
                            📋 Select All Employees
                          </div>
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map(emp => (
                              <div
                                key={emp.id}
                                onClick={() => handleEmployeeSelect(emp.id, `${emp.name} - ${emp.position}`)}
                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 text-black"
                              >
                                {emp.name} - {emp.position}
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              No employees found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {selectAll && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm text-blue-800 font-medium">Bulk Payroll Mode</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                          This will create payroll entries for all {employees.length} employees with the same cutoff period and settings.
                        </p>
                        <button
                          type="button"
                          onClick={initializeBulkForm}
                          className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                        >
                          Set Individual Values
                        </button>
                      </div>
                    )}
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
                      <span className="ml-1 text-xs text-gray-500">(Optional - auto-filled from employee data)</span>
                    </label>
                <input
                  type="number"
                  name="basicSalary"
                  value={formData.basicSalary}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                      placeholder="₱0.00 (auto-filled when employee is selected)"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
                    {!formData.basicSalary && formData.employeeId && formData.employeeId !== 'all' && (
                      <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        💡 Basic salary will be automatically filled from the selected employee's data
                      </div>
                    )}
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                    <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Government Contributions</h5>
                  </div>
                  <div className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full font-medium">
                    🇵🇭 Philippine Payroll System (2024)
                  </div>
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



            {/* Calculated Results */}
            {(calculatedValues.grossPay > 0 || calculatedValues.totalDeductions > 0 || calculatedValues.netPay > 0) && (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-4 text-center flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Preview Results
                  </h5>
                  
                  {/* Calculation Breakdown */}
                  <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                    <h6 className="font-medium text-gray-700 mb-3 text-center">Calculation Breakdown</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-green-700 mb-2">Gross Pay Components:</div>
                        <div className="space-y-1 text-gray-600">
                          <div>Basic Salary: ₱{Number(parseFloat(formData.basicSalary) || 0).toLocaleString()}</div>
                          <div>Holiday Pay: ₱{Number(parseFloat(formData.holidayPay) || 0).toLocaleString()}</div>
                          <div>Night Differential: ₱{Number(parseFloat(formData.nightDifferential) || 0).toLocaleString()}</div>
                          <div>Salary Adjustment: ₱{Number(parseFloat(formData.salaryAdjustment) || 0).toLocaleString()}</div>
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-red-700 mb-2">Total Deductions Include:</div>
                        <div className="space-y-1 text-gray-600">
                          <div>Absences: ₱{Number(parseFloat(formData.absences) || 0).toLocaleString()}</div>
                          <div>Late Deductions: ₱{Number(parseFloat(formData.lateDeductions) || 0).toLocaleString()}</div>
                          <div>SSS: ₱{Number(parseFloat(formData.sssContribution) || 0).toLocaleString()}</div>
                          <div>PhilHealth: ₱{Number(parseFloat(formData.philhealthContribution) || 0).toLocaleString()}</div>
                          <div>Pag-IBIG: ₱{Number(parseFloat(formData.pagibigContribution) || 0).toLocaleString()}</div>
                          <div>Withholding Tax: ₱{Number(parseFloat(formData.withholdingTax) || 0).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
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
                    <strong>Workflow:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• <strong>Save as Draft:</strong> Creates payroll with "Pending" status</li>
                      <li>• <strong>Process Payroll:</strong> Automatically calculates and creates payroll with "Processed" status</li>
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
                disabled={processing}
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
                    <span>{editingPayroll ? "Update & Process" : "Process & Calculate"}</span>
        </div>
      )}
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Bulk Form Modal */}
      {shouldShowBulkForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Bulk Payroll Setup</h4>
                  <p className="text-sm text-gray-600">Set individual values for each employee</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowBulkForm(false);
                  setBulkFormData({});
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h5 className="text-sm font-semibold text-blue-800">Individual Employee Settings</h5>
                </div>
                <p className="text-sm text-blue-700">
                  Set different values for each employee. Leave fields empty to use the default values from the main form.
                </p>
              </div>

              <div className="space-y-6">
                {employees.map((employee) => (
                  <div key={employee.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-purple-600">
                          {employee.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">{employee.name}</h5>
                        <p className="text-sm text-gray-500">{employee.position} • ₱{employee.salary.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Worked Hours</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.workedHours || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'workedHours', e.target.value)}
                          placeholder={formData.workedHours || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Overtime Hours</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.overtimeHours || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'overtimeHours', e.target.value)}
                          placeholder={formData.overtimeHours || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Holiday Pay</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.holidayPay || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'holidayPay', e.target.value)}
                          placeholder={formData.holidayPay || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Night Differential</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.nightDifferential || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'nightDifferential', e.target.value)}
                          placeholder={formData.nightDifferential || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Salary Adjustment</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.salaryAdjustment || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'salaryAdjustment', e.target.value)}
                          placeholder={formData.salaryAdjustment || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Absences</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.absences || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'absences', e.target.value)}
                          placeholder={formData.absences || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Late Deductions</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.lateDeductions || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'lateDeductions', e.target.value)}
                          placeholder={formData.lateDeductions || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">SSS Contribution</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.sssContribution || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'sssContribution', e.target.value)}
                          placeholder={formData.sssContribution || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">PhilHealth Contribution</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.philhealthContribution || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'philhealthContribution', e.target.value)}
                          placeholder={formData.philhealthContribution || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Pag-IBIG Contribution</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.pagibigContribution || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'pagibigContribution', e.target.value)}
                          placeholder={formData.pagibigContribution || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Withholding Tax</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.withholdingTax || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'withholdingTax', e.target.value)}
                          placeholder={formData.withholdingTax || 'Default'}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {employees.length} employees configured
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowBulkForm(false);
                      setBulkFormData({});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkForm(false);
                      processPayroll();
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Continue with Payroll
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Floating Add Payroll Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          resetForm();
          // Small delay to ensure clean state
          setTimeout(() => setShowPayrollForm(true), 100);
        }}
        className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-all duration-200 hover:scale-110 z-40"
        title="Create New Payroll (Auto-Calculate)"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Search Bar */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by employee name, ID, cutoff period..."
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Found <span className="font-semibold text-green-600">{payrolls.filter((payroll) => {
              const query = searchQuery.toLowerCase();
              return (
                payroll.employeeName?.toLowerCase().includes(query) ||
                payroll.employeeId?.toLowerCase().includes(query) ||
                (payroll.cutoffStart && new Date(payroll.cutoffStart).toLocaleDateString().toLowerCase().includes(query)) ||
                (payroll.cutoffEnd && new Date(payroll.cutoffEnd).toLocaleDateString().toLowerCase().includes(query))
              );
            }).length}</span> payroll{payrolls.filter((payroll) => {
              const query = searchQuery.toLowerCase();
              return (
                payroll.employeeName?.toLowerCase().includes(query) ||
                payroll.employeeId?.toLowerCase().includes(query) ||
                (payroll.cutoffStart && new Date(payroll.cutoffStart).toLocaleDateString().toLowerCase().includes(query)) ||
                (payroll.cutoffEnd && new Date(payroll.cutoffEnd).toLocaleDateString().toLowerCase().includes(query))
              );
            }).length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Payroll List */}
      {payrolls.filter((payroll) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          payroll.employeeName?.toLowerCase().includes(query) ||
          payroll.employeeId?.toLowerCase().includes(query) ||
          (payroll.cutoffStart && new Date(payroll.cutoffStart).toLocaleDateString().toLowerCase().includes(query)) ||
          (payroll.cutoffEnd && new Date(payroll.cutoffEnd).toLocaleDateString().toLowerCase().includes(query))
        );
      }).length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">{searchQuery ? 'No payroll found' : 'No payroll data'}</h3>
              <p className="mt-1 text-sm text-gray-500">{searchQuery ? `No payroll records match "${searchQuery}"` : 'Start processing payroll for your employees.'}</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Clear search
                </button>
              )}
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payrolls.filter((payroll) => {
                  if (!searchQuery) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                    payroll.employeeName?.toLowerCase().includes(query) ||
                    payroll.employeeId?.toLowerCase().includes(query) ||
                    (payroll.cutoffStart && new Date(payroll.cutoffStart).toLocaleDateString().toLowerCase().includes(query)) ||
                    (payroll.cutoffEnd && new Date(payroll.cutoffEnd).toLocaleDateString().toLowerCase().includes(query))
                  );
                }).map((payroll) => (
                  <tr key={payroll.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-black">
                          {payroll.employeeName || 'Unknown Employee'}
                          {!payroll.employeeName && (
                            <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                              Employee Deleted
                            </span>
                          )}
                        </div>
                       <div className="text-sm text-black">ID: {payroll.employeeId || 'N/A'}</div>
                      </div>
                    </td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                       {payroll.cutoffStart ? new Date(payroll.cutoffStart).toLocaleDateString() : 'N/A'} - {payroll.cutoffEnd ? new Date(payroll.cutoffEnd).toLocaleDateString() : 'N/A'}
                     </td>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm text-black">₱{(payroll.grossPay || 0).toLocaleString()}</td>
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-black">₱{(payroll.netPay || 0).toLocaleString()}</td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(payroll)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            title={payroll.status === 'completed' ? 'Completed payrolls cannot be edited' : 'Edit payroll'}
                            disabled={payroll.status === 'completed'}
                          >
                            Edit
                          </button>
                          {editingPayroll?.id === payroll.id && (
                            <button
                              onClick={() => setTimeout(() => setShowPayrollForm(true), 100)}
                              className="text-green-600 hover:text-green-900 mr-3"
                              title="Open edit form"
                            >
                              Open Form
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(payroll.id)}
                            className="text-red-600 hover:text-red-900"
                        title="Delete payroll permanently"
                          >
                            Delete
                          </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
    
    <div>
      {/* Render Modals - Outside main container like EmployeeManagement */}
      <PayrollSuccessModal
        isOpen={successModal.open}
        onClose={() => {
          console.log(' Success modal closing, message:', successModal.message);
          setSuccessModal({ open: false });
          
          // Handle cleanup after user acknowledges success
          if (successModal.message?.includes('Draft Saved') || 
              successModal.message?.includes('Updated Successfully') ||
              successModal.message?.includes('Payroll updated and processed') ||
              successModal.message?.includes('Payroll processed successfully')) {
            setShowPayrollForm(false);
            resetForm();
            fetchData(); // Refresh the list
            
            // Notify parent component
            if (onPayrollStatusChange) {
              onPayrollStatusChange();
            }
          }
          
          // Handle delete success
          if (successModal.message?.includes('permanently deleted')) {
            fetchData(); // Refresh the list
            if (onPayrollChange) {
              onPayrollChange();
            }
          }
        }}
        message={successModal.message}
      />

      <PayrollErrorModal
        isOpen={errorModal.open}
        onClose={() => setErrorModal({ open: false })}
        message={errorModal.message}
      />

      <PayrollWarningModal
        isOpen={warningModal.open}
        onClose={() => setWarningModal({ open: false })}
        message={warningModal.message}
      />

      <PayrollDeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false })}
        onConfirm={confirmDelete}
        payrollName={deleteModal.payroll?.employeeName || 'Unknown Employee'}
        message={deleteModal.message}
      />
    </div>
    </>
  );
}

