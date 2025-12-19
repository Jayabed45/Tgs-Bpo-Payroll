"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";
import { calculateSSS, calculatePhilHealth, calculatePagIBIG, calculateWithholdingTax } from "../utils/philippinePayroll";

interface Employee {
  id: string;
  employeeCode?: string; // Short readable code like EMP001
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

  const [exportLoading, setExportLoading] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const [importCutoffStart, setImportCutoffStart] = useState('');
  const [importCutoffEnd, setImportCutoffEnd] = useState('');
  const [importFileData, setImportFileData] = useState<string | null>(null);
  
  // Main view tab state - for displaying imported data with tabs
  const [mainViewTab, setMainViewTab] = useState<string>('payroll');
  const [displayImportData, setDisplayImportData] = useState<{
    sheets: Record<string, { headers: string[]; rows: any[][]; rowCount: number }>;
    sheetNames: string[];
  } | null>(null);
  
  // Preview state for viewing a specific payroll record
  const [previewPayroll, setPreviewPayroll] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Imported payroll files state
  const [importedPayrolls, setImportedPayrolls] = useState<any[]>([]);
  const [viewingImportedPayroll, setViewingImportedPayroll] = useState<any>(null);

  // State for the new individual payroll view
  const [individualPayroll, setIndividualPayroll] = useState<any>(null);
  const [showIndividualModal, setShowIndividualModal] = useState(false);

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
      const [employeesResponse, payrollsResponse, importedPayrollsResponse] = await Promise.all([
        apiService.getEmployees(),
        apiService.getPayrolls(),
        apiService.getImportedPayrolls().catch(() => ({ success: false, importedPayrolls: [] }))
      ]);
      
      setEmployees(Array.isArray(employeesResponse.employees) ? employeesResponse.employees : []);
      setPayrolls(Array.isArray(payrollsResponse.payrolls) ? payrollsResponse.payrolls : []);
      setImportedPayrolls(Array.isArray(importedPayrollsResponse.importedPayrolls) ? importedPayrollsResponse.importedPayrolls : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Set empty arrays on error to prevent crashes
      setEmployees([]);
      setPayrolls([]);
      setImportedPayrolls([]);
    } finally {
      setLoading(false);
    }
  };

  // Export template with ALL employees
  const handleExportTemplate = async () => {
    if (employees.length === 0) {
      showModalMessage('warning', 'No Employees', 'No employees found to export. Please add employees first.');
      return;
    }

    setTemplateLoading(true);
    try {
      const blob = await apiService.exportTemplate();
      
      // Generate filename
      const today = new Date().toISOString().split('T')[0];
      const filename = `Payroll-Template_${today}.xlsx`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showModalMessage('success', 'Template Exported', `Successfully exported payroll template with all ${employees.length} employees!\n\nThis template includes all active employees from Employee Management, ready for you to fill in payroll data.`);
    } catch (error: any) {
      console.error('Export template error:', error);
      showModalMessage('error', 'Export Failed', error.message || 'Failed to export template.');
    } finally {
      setTemplateLoading(false);
    }
  };

  // Export timekeeping data to Excel
  const handleExportTimekeeping = async () => {
    if (payrolls.length === 0) {
      showModalMessage('warning', 'No Data', 'No payroll records to export.');
      return;
    }

    setExportLoading(true);
    try {
      // Count how many payrolls will be exported based on date filter
      let exportCount = payrolls.length;
      if (exportStartDate && exportEndDate) {
        exportCount = payrolls.filter(p => {
          const pStart = p.cutoffStart;
          const pEnd = p.cutoffEnd;
          // Check if payroll overlaps with export date range
          return pStart <= exportEndDate && pEnd >= exportStartDate;
        }).length;
        
        if (exportCount === 0) {
          showModalMessage('warning', 'No Records in Date Range', `No payroll records found for the date range ${exportStartDate} to ${exportEndDate}.\n\nTip: Clear the date filters to export all ${payrolls.length} payroll records.`);
          setExportLoading(false);
          return;
        }
      }
      
      // Export with date filter if provided
      const blob = await apiService.exportTimekeeping(
        exportStartDate || undefined,
        exportEndDate || undefined
      );
      
      // Generate filename with date range or current date
      let filename: string;
      if (exportStartDate && exportEndDate) {
        filename = `Timekeeping-Data_${exportStartDate}_to_${exportEndDate}.xlsx`;
      } else {
        const today = new Date().toISOString().split('T')[0];
        filename = `Timekeeping-Data_Export_${today}.xlsx`;
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      const dateRangeMsg = exportStartDate && exportEndDate 
        ? ` (${exportCount} records for ${exportStartDate} to ${exportEndDate})` 
        : ` (all ${exportCount} records)`;
      showModalMessage('success', 'Export Complete', `Successfully exported payroll data${dateRangeMsg}!`);
    } catch (error: any) {
      console.error('Export error:', error);
      showModalMessage('error', 'Export Failed', error.message || 'Failed to export timekeeping data.');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle file selection for import - automatically save to database
  const handleImportFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showModalMessage('error', 'Invalid File', 'Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setImportLoading(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = (event.target?.result as string).split(',')[1];
          
          // Get preview data
          const response = await apiService.importTimekeepingPreview(base64);
          if (response.success && response.data) {
            // Auto-generate cutoff dates from current date
            const today = new Date();
            const cutoffStart = new Date(today.getFullYear(), today.getMonth(), 1);
            const cutoffEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            const startDateStr = cutoffStart.toISOString().split('T')[0];
            const endDateStr = cutoffEnd.toISOString().split('T')[0];
            
            // Automatically save to database
            const saveResponse = await apiService.saveImportedPayroll(
              base64,
              startDateStr,
              endDateStr,
              file.name.replace(/\\.xlsx?$/i, '')
            );
            
            if (saveResponse.success) {
              showModalMessage('success', 'Import Successful', `File "${file.name}" has been imported and saved to the database.`);
              fetchData(); // Refresh the payroll list
              setMainViewTab('payroll'); // Switch to payroll tab to see the imported file
            }
          }
        } catch (error: any) {
          showModalMessage('error', 'Import Failed', error.message || 'Failed to import and save Excel file');
        } finally {
          setImportLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      showModalMessage('error', 'Import Error', error.message || 'Failed to read file');
      setImportLoading(false);
    }
    
    // Reset file input
    e.target.value = '';
  };

  // Handle import confirmation - saves the Excel file as a payroll record
  const handleImportConfirm = async () => {
    if (!importFileData) {
      showModalMessage('error', 'No File', 'Please select a file to import');
      return;
    }

    if (!importCutoffStart || !importCutoffEnd) {
      showModalMessage('error', 'Missing Dates', 'Please enter cutoff start and end dates');
      return;
    }

    setImportLoading(true);
    try {
      // Save the imported Excel file as a payroll record
      const response = await apiService.saveImportedPayroll(
        importFileData, 
        importCutoffStart, 
        importCutoffEnd,
        `Payroll_${importCutoffStart}_to_${importCutoffEnd}`
      );
      
      if (response.success) {
        showModalMessage('success', 'Saved Successfully', response.message);
        setShowImportModal(false);
        setDisplayImportData(null);
        setImportFileData(null);
        setImportCutoffStart('');
        setImportCutoffEnd('');
        setMainViewTab('payroll');
        fetchData(); // Refresh payroll list including imported payrolls
      }
    } catch (error: any) {
      showModalMessage('error', 'Save Failed', error.message || 'Failed to save imported payroll');
    } finally {
      setImportLoading(false);
    }
  };
  
  // View an imported payroll file (shows all sheets)
  const handleViewImportedPayroll = async (importedPayroll: any) => {
    setPreviewLoading(true);
    try {
      const response = await apiService.getImportedPayroll(importedPayroll.id);
      if (response.success && response.importedPayroll) {
        setViewingImportedPayroll(response.importedPayroll);
        setDisplayImportData({
          sheets: response.importedPayroll.sheets,
          sheetNames: response.importedPayroll.sheetNames
        });
        setMainViewTab(response.importedPayroll.sheetNames[0] || 'payroll');
      }
    } catch (error: any) {
      showModalMessage('error', 'Load Failed', error.message || 'Failed to load payroll data');
    } finally {
      setPreviewLoading(false);
    }
  };
  
  // Export an imported payroll file back to Excel
  const handleExportImportedPayroll = async (importedPayroll: any) => {
    setExportLoading(true);
    try {
      const blob = await apiService.exportImportedPayroll(importedPayroll.id);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${importedPayroll.fileName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showModalMessage('success', 'Export Complete', `Exported ${importedPayroll.fileName} successfully!`);
    } catch (error: any) {
      showModalMessage('error', 'Export Failed', error.message || 'Failed to export payroll');
    } finally {
      setExportLoading(false);
    }
  };
  
  // Delete an imported payroll file
  const handleDeleteImportedPayroll = async (importedPayroll: any) => {
    if (!confirm(`Are you sure you want to delete "${importedPayroll.fileName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await apiService.deleteImportedPayroll(importedPayroll.id);
      if (response.success) {
        showModalMessage('success', 'Deleted', 'Payroll file deleted successfully');
        fetchData(); // Refresh list
      }
    } catch (error: any) {
      showModalMessage('error', 'Delete Failed', error.message || 'Failed to delete payroll');
    }
  };
  
  // Close the imported payroll view
  const handleCloseImportedPayrollView = () => {
    setViewingImportedPayroll(null);
    setDisplayImportData(null);
    setMainViewTab('payroll');
  };

  // Handle preview of a specific payroll record
  const handlePreviewPayroll = (payroll: any) => {
    setIndividualPayroll(payroll);
    setShowIndividualModal(true);
  };

  // Handle export of a specific payroll record
  const handleExportSinglePayroll = async (payroll: any) => {
    setExportLoading(true);
    try {
      // Export with the specific payroll's cutoff dates
      const blob = await apiService.exportTimekeeping(payroll.cutoffStart, payroll.cutoffEnd);
      
      // Generate filename
      const filename = `Payroll_${payroll.employeeName?.replace(/\s+/g, '_') || 'Unknown'}_${payroll.cutoffStart}_to_${payroll.cutoffEnd}.xlsx`;
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showModalMessage('success', 'Export Complete', `Exported payroll for ${payroll.employeeName} successfully!`);
    } catch (error: any) {
      console.error('Export error:', error);
      showModalMessage('error', 'Export Failed', error.message || 'Failed to export payroll data.');
    } finally {
      setExportLoading(false);
    }
  };

  // Close preview and go back to payroll list
  const handleClosePreview = () => {
    setPreviewPayroll(null);
    setDisplayImportData(null);
    setMainViewTab('payroll');
  };

  // Convert payroll records to Excel-like sheet format for display
  const convertPayrollsToSheets = (payrollList: any[]) => {
    if (!payrollList || payrollList.length === 0) return null;

    // Normalize legacy codes like "EMP001" -> "00001"
    const normalizeEmployeeCode = (code: string) => {
      if (!code) return '';
      const m = code.match(/^\s*EMP(\d+)\s*$/i);
      if (m) return String(parseInt(m[1], 10)).padStart(5, '0');
      return code;
    };

    // Get unique cutoff dates to create date columns
    const allDates = new Set<string>();
    payrollList.forEach(p => {
      if (p.dailyHours) {
        Object.keys(p.dailyHours).forEach(date => allDates.add(date));
      }
    });
    const sortedDates = Array.from(allDates).sort();

    // Sheet 1: Total Hours - Summary
    const summaryHeaders = ['Emp ID', 'Employee Name', ...sortedDates.map(d => {
      const date = new Date(d);
      const day = date.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day}-${monthNames[date.getMonth()]}`;
    }), 'Grand Total'];
    
    const summaryRows = payrollList.map(p => {
      const row = [normalizeEmployeeCode(p.employeeCode || ''), p.employeeName || ''];
      sortedDates.forEach(date => {
        row.push(p.dailyHours?.[date] || '');
      });
      row.push(p.workedHours || p.totalWorkedHours || '');
      return row;
    });

    // Sheet 2: OT (Overtime)
    const otHeaders = ['Emp ID', "Employee's Name", 'Overtime Hours', 'RD OT', 'Regular OT', 'Special Holiday OT', 'Grand Total'];
    const otRows = payrollList.map(p => [
      normalizeEmployeeCode(p.employeeCode || ''),
      p.employeeName || '',
      p.overtimeHours || '',
      p.restDayOT || '',
      p.regularOT || '',
      p.specialHolidayOT || '',
      (parseFloat(p.overtimeHours || 0) + parseFloat(p.restDayOT || 0) + parseFloat(p.regularOT || 0) + parseFloat(p.specialHolidayOT || 0)) || ''
    ]);

    // Sheet 3: Special Holiday
    const shDates = new Set<string>();
    payrollList.forEach(p => {
      if (p.specialHolidayDates) {
        Object.keys(p.specialHolidayDates).forEach(date => shDates.add(date));
      }
    });
    const sortedSHDates = Array.from(shDates).sort();
    
    const shHeaders = ['Emp ID', "Employee's Name", 'Site Location', ...sortedSHDates.map(d => {
      const date = new Date(d);
      const day = date.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day}-${monthNames[date.getMonth()]}`;
    }), 'Total SH'];
    
    const shRows = payrollList.map(p => {
      const row = [normalizeEmployeeCode(p.employeeCode || ''), p.employeeName || '', p.siteLocation || ''];
      sortedSHDates.forEach(date => {
        row.push(p.specialHolidayDates?.[date] || '');
      });
      row.push(p.specialHolidayHours || '');
      return row;
    });

    // Sheet 4: SIL_Offset
    const silHeaders = ['Employee ID', 'Employee Name', 'CTO', 'PH Holidays Not Working', 'SIL Credit (Tenure)', 'SIL Credits', 'Grand Total'];
    const silRows = payrollList.map(p => [
      normalizeEmployeeCode(p.employeeCode || ''),
      p.employeeName || '',
      p.ctoHours || '',
      p.phHolidayNotWorking || '',
      p.silTenureCredits || '',
      p.silCredits || '',
      (parseFloat(p.ctoHours || 0) + parseFloat(p.phHolidayNotWorking || 0) + parseFloat(p.silTenureCredits || 0) + parseFloat(p.silCredits || 0)) || ''
    ]);

    // Sheet 5: Hourly (Payroll Breakdown)
    const hourlyHeaders = ['Field', ...payrollList.map(p => p.employeeName || 'Unknown')];
    const hourlyRows = [
      ['Position', ...payrollList.map(p => p.position || '')],
      ['Site Location', ...payrollList.map(p => p.siteLocation || '')],
      ['Cutoff Period', ...payrollList.map(p => `${p.cutoffStart || ''} to ${p.cutoffEnd || ''}`)],
      ['', ...payrollList.map(() => '')],
      ['Basic Salary', ...payrollList.map(p => p.basicSalary || 0)],
      ['Worked Hours', ...payrollList.map(p => p.workedHours || 0)],
      ['Overtime Hours', ...payrollList.map(p => p.overtimeHours || 0)],
      ['Holiday Pay', ...payrollList.map(p => p.holidayPay || 0)],
      ['Night Differential', ...payrollList.map(p => p.nightDifferential || 0)],
      ['Salary Adjustment', ...payrollList.map(p => p.salaryAdjustment || 0)],
      ['', ...payrollList.map(() => '')],
      ['DEDUCTIONS', ...payrollList.map(() => '')],
      ['Absences', ...payrollList.map(p => p.absences || 0)],
      ['Late Deductions', ...payrollList.map(p => p.lateDeductions || 0)],
      ['SSS Contribution', ...payrollList.map(p => p.sssContribution || 0)],
      ['PhilHealth', ...payrollList.map(p => p.philhealthContribution || 0)],
      ['Pag-IBIG', ...payrollList.map(p => p.pagibigContribution || 0)],
      ['Withholding Tax', ...payrollList.map(p => p.withholdingTax || 0)],
      ['', ...payrollList.map(() => '')],
      ['SUMMARY', ...payrollList.map(() => '')],
      ['Gross Pay', ...payrollList.map(p => p.grossPay || 0)],
      ['Total Deductions', ...payrollList.map(p => p.totalDeductions || 0)],
      ['Net Pay', ...payrollList.map(p => p.netPay || 0)],
      ['Status', ...payrollList.map(p => p.status || 'pending')],
    ];

    return {
      sheets: {
        'Total Hours - Summary': { headers: summaryHeaders, rows: summaryRows, rowCount: summaryRows.length },
        'Hourly': { headers: hourlyHeaders, rows: hourlyRows, rowCount: hourlyRows.length },
        'OT': { headers: otHeaders, rows: otRows, rowCount: otRows.length },
        'Special Holiday': { headers: shHeaders, rows: shRows, rowCount: shRows.length },
        'SIL_Offset': { headers: silHeaders, rows: silRows, rowCount: silRows.length },
      },
      sheetNames: ['Total Hours - Summary', 'Hourly', 'OT', 'Special Holiday', 'SIL_Offset']
    };
  };

  // View all payroll records in Excel format
  const handleViewAllPayrolls = () => {
    const sheetsData = convertPayrollsToSheets(payrolls);
    if (sheetsData) {
      setDisplayImportData(sheetsData);
      setMainViewTab('Total Hours - Summary');
      setPreviewPayroll({ isAllPayrolls: true }); // Flag to indicate viewing all payrolls
    }
  };

  // Render individual payroll view
  const renderIndividualPayroll = () => {
    if (!individualPayroll) return null;

    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4">Individual Payroll Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Employee Name:</strong> {individualPayroll.employeeName}</p>
            <p><strong>Employee ID:</strong> {individualPayroll.employeeId}</p>
            <p><strong>Cutoff Period:</strong> {individualPayroll.cutoffStart} to {individualPayroll.cutoffEnd}</p>
            <p><strong>Basic Salary:</strong> ₱{individualPayroll.basicSalary.toLocaleString()}</p>
          </div>
          <div>
            <p><strong>Gross Pay:</strong> ₱{individualPayroll.grossPay.toLocaleString()}</p>
            <p><strong>Total Deductions:</strong> ₱{individualPayroll.totalDeductions.toLocaleString()}</p>
            <p><strong>Net Pay:</strong> ₱{individualPayroll.netPay.toLocaleString()}</p>
            <p><strong>Status:</strong> {individualPayroll.status}</p>
          </div>
        </div>
      </div>
    );
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

    // Warn if worked hours is not filled (important for export)
    if (formData.employeeId !== 'all' && !formData.workedHours) {
      showModalMessage('warning', 'Worked Hours Not Entered', 'You have not entered "Worked Hours". This employee will appear in the export but the hours columns will be empty. Do you want to continue?\n\nTip: Enter the total hours worked to see data in the exported Excel file.');
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
        const hoursInfo = formData.workedHours ? `\n\n✅ This employee will appear in your Excel export with ${formData.workedHours} hours in the Grand Total column.` : '';
        showModalMessage('success', 'Success!', `Payroll processed successfully! Status changed to "Processed"${hoursInfo}`);
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
                            onClick={() => handleEmployeeSelect('all', 'Select All Employees')}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-200 font-semibold text-blue-600"
                          >
                            <i className="bi bi-clipboard-check me-2"></i>Select All Employees
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
                        <i className="bi bi-lightbulb me-1"></i>Basic salary will be automatically filled from the selected employee's data
                      </div>
                    )}
              </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Worked Hours
                      <span className="ml-2 text-xs text-red-600 font-semibold">* Required for Export</span>
                    </label>
                <input
                  type="number"
                  name="workedHours"
                  value={formData.workedHours}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                      placeholder="Enter total hours worked (e.g., 160)"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                />
                    {!formData.workedHours && (
                      <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        💡 <strong>Tip:</strong> Enter the total hours worked for this payroll period. This will appear in the "Grand Total" column when you export to Excel.
                      </div>
                    )}
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
                    <i className="bi bi-flag me-1"></i>Philippine Payroll System (2024)
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Overtime Hours</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.overtimeHours || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'overtimeHours', e.target.value)}
                          placeholder={formData.overtimeHours || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Holiday Pay</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.holidayPay || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'holidayPay', e.target.value)}
                          placeholder={formData.holidayPay || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Night Differential</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.nightDifferential || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'nightDifferential', e.target.value)}
                          placeholder={formData.nightDifferential || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Salary Adjustment</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.salaryAdjustment || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'salaryAdjustment', e.target.value)}
                          placeholder={formData.salaryAdjustment || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Absences</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.absences || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'absences', e.target.value)}
                          placeholder={formData.absences || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Late Deductions</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.lateDeductions || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'lateDeductions', e.target.value)}
                          placeholder={formData.lateDeductions || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">SSS Contribution</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.sssContribution || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'sssContribution', e.target.value)}
                          placeholder={formData.sssContribution || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">PhilHealth Contribution</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.philhealthContribution || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'philhealthContribution', e.target.value)}
                          placeholder={formData.philhealthContribution || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Pag-IBIG Contribution</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.pagibigContribution || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'pagibigContribution', e.target.value)}
                          placeholder={formData.pagibigContribution || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Withholding Tax</label>
                        <input
                          type="number"
                          value={bulkFormData[employee.id]?.withholdingTax || ''}
                          onChange={(e) => handleBulkFormChange(employee.id, 'withholdingTax', e.target.value)}
                          placeholder={formData.withholdingTax || 'Default'}
                          className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
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

      {/* Export/Import Section */}
      <div className="bg-white shadow rounded-lg p-4">
       
        {(exportStartDate || exportEndDate) && (
          <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded-md text-xs text-orange-800">
            <strong>⚠️ Date Filter Active:</strong> Only payroll records with cutoff dates between {exportStartDate || '(not set)'} and {exportEndDate || '(not set)'} will be exported. 
            <button 
              onClick={() => { setExportStartDate(''); setExportEndDate(''); }}
              className="ml-2 underline font-semibold hover:text-orange-900"
            >
              Clear filters to export all {payrolls.length} records
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Start Date
              {exportStartDate && <span className="ml-1 text-orange-600">●</span>}
            </label>
            <input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-green-500"
              placeholder="Optional"
            />
          </div>
          <div className="w-[140px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              End Date
              {exportEndDate && <span className="ml-1 text-orange-600">●</span>}
            </label>
            <input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-green-500"
              placeholder="Optional"
            />
          </div>
          {(exportStartDate || exportEndDate) && (
            <button
              onClick={() => {
                setExportStartDate('');
                setExportEndDate('');
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300"
              title="Clear date filters to export all payroll records"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          )}
          <button
            onClick={handleExportTemplate}
            disabled={templateLoading || employees.length === 0}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            title="Export template with ALL employees from Employee Management"
          >
            {templateLoading ? (
              <><svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Exporting...</>
            ) : (
              <><svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>Export Template</>
            )}
          </button>
          <button
            onClick={handleExportTimekeeping}
            disabled={exportLoading || payrolls.length === 0}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            title="Export payroll data with processed records"
          >
            {exportLoading ? (
              <><svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Exporting...</>
            ) : (
              <><svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Export Data</>
            )}
          </button>
          <label className="cursor-pointer">
            <input type="file" accept=".xlsx,.xls" onChange={handleImportFileSelect} className="hidden" />
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              {importLoading ? (
                <><svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading...</>
              ) : (
                <><svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Import</>
              )}
            </span>
          </label>
          {displayImportData && (
            <>
              <button
                onClick={() => { setDisplayImportData(null); setImportFileData(null); setPreviewPayroll(null); setMainViewTab('payroll'); }}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100"
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Clear Preview
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs for Payroll and Imported Sheets */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50">
          <div className="flex overflow-x-auto scrollbar-thin">
            {/* Payroll Records Tab - Always First */}
            <button
              onClick={() => setMainViewTab('payroll')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                mainViewTab === 'payroll'
                  ? 'border-green-500 text-green-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className="bi bi-clipboard-data me-2"></i>Imported Payroll Files
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded-full">{importedPayrolls.length}</span>
            </button>

            {/* Individual Payroll Records Tab */}
            <button
              onClick={() => setMainViewTab('individualList')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                mainViewTab === 'individualList'
                  ? 'border-indigo-500 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <i className="bi bi-people-fill me-2"></i>Individual Records
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded-full">{payrolls.length}</span>
            </button>
            {/* Imported Sheet Tabs */}
            {displayImportData?.sheetNames.map((sheetName) => (
              <button
                key={sheetName}
                onClick={() => setMainViewTab(sheetName)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  mainViewTab === sheetName
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 {sheetName}
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 rounded-full">
                  {displayImportData.sheets[sheetName]?.rowCount || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content - Excel-like styling */}
        {mainViewTab === 'payroll' ? (
          <>
            {/* Saved Payroll Files List */}
            <div className="overflow-x-auto bg-white">
              {/* Excel-like toolbar for imported payroll files */}
              <div className="flex items-center justify-between px-2 py-1 bg-[#217346] text-white text-xs border-b border-[#185c37]">
                <div className="flex items-center">
                  <span className="font-semibold mr-4"><i className="bi bi-file-earmark-spreadsheet me-2"></i>Saved Payroll Files</span>
                  <span className="text-green-200">{importedPayrolls.length} files</span>
                </div>
              </div>
              {/* Excel-like spreadsheet for imported payroll files */}
              <div className="overflow-auto max-h-[600px]">
                <table className="w-full border-collapse text-xs font-['Calibri',_'Segoe_UI',_sans-serif]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#d9e8d9] border-b-2 border-[#217346]">
                      <th className="w-8 px-2 py-1.5 text-left text-[10px] text-gray-600 border-r border-[#a8d08d] bg-[#f0f0f0] font-semibold">#</th>
                      <th className="min-w-[240px] px-2 py-1.5 text-left text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d]">File Name</th>
                      <th className="min-w-[180px] px-2 py-1.5 text-left text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d]">Cutoff Period</th>
                      <th className="min-w-[120px] px-2 py-1.5 text-left text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d]">Employees</th>
                      <th className="w-24 px-2 py-1.5 text-center text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d]">Sheets</th>
                      <th className="min-w-[160px] px-2 py-1.5 text-left text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d]">Imported Date</th>
                      <th className="w-28 px-2 py-1.5 text-center text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d]">Status</th>
                      <th className="w-16 px-2 py-1.5 text-center text-[11px] font-semibold text-[#1f4e3d]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d8e4d8] bg-white">
                    {importedPayrolls.map((importedPayroll, index) => (
                      <tr 
                        key={importedPayroll.id} 
                        className="hover:bg-[#f3f7f3] cursor-pointer"
                        onClick={() => handleViewImportedPayroll(importedPayroll)}
                      >
                        <td className="px-2 py-1.5 text-[10px] text-gray-600 border-r border-[#d8e4d8]">{index + 1}</td>
                        <td className="px-2 py-1.5 text-[11px] text-gray-900 border-r border-[#d8e4d8] font-medium">{importedPayroll.fileName}</td>
                        <td className="px-2 py-1.5 text-[11px] text-gray-700 border-r border-[#d8e4d8]">{importedPayroll.cutoffStart} to {importedPayroll.cutoffEnd}</td>
                        <td className="px-2 py-1.5 text-[11px] text-gray-700 border-r border-[#d8e4d8]">{importedPayroll.employeeCount || 0}</td>
                        <td className="px-2 py-1.5 text-[11px] text-center text-gray-700 border-r border-[#d8e4d8]">{importedPayroll.sheetNames.length}</td>
                        <td className="px-2 py-1.5 text-[11px] text-gray-700 border-r border-[#d8e4d8]">{new Date(importedPayroll.createdAt).toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                            importedPayroll.status === 'completed' ? 'bg-green-100 text-green-700' :
                            importedPayroll.status === 'processed' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {importedPayroll.status || 'imported'}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="min-w-[80px] px-2 py-1.5 text-center">
                          <button
                            className="px-2 py-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded mr-1 disabled:opacity-50"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleExportImportedPayroll(importedPayroll);
                            }}
                            title="Export"
                            disabled={exportLoading}
                          >
                            <i className="bi bi-download"></i>
                          </button>
                          <button
                            className="px-2 py-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteImportedPayroll(importedPayroll);
                            }}
                            title="Delete"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Excel-like status bar */}
              <div className="flex items-center justify-between px-2 py-1 bg-[#f0f0f0] border-t border-[#c0c0c0] text-[10px] text-gray-600">
                {/* <div className="flex items-center space-x-4">
                  <span>Total Files: {importedPayrolls.length}</span>
                  <span>|</span>
                  <span>Total Employees: {importedPayrolls.reduce((sum, p) => sum + (p.employeeCount || 0), 0)}</span>
                </div> */}
              </div>
            </div>
          </>
        ) : mainViewTab === 'individualList' ? (
          <div className="mt-0 bg-white rounded-lg shadow-sm border border-gray-200">
            {/* <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Individual Payroll Records</h3>
              </div>
              <span className="text-sm text-gray-500">Total: <span className="font-semibold">{payrolls.length}</span></span>
            </div> */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cutoff Period</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrolls.length > 0 ? payrolls.map((p, index) => (
                    <tr
                      key={p.id}
                      className="hover:bg-indigo-50 cursor-pointer"
                      onClick={() => handlePreviewPayroll(p)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.employeeName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(p.cutoffStart).toLocaleDateString()} to {new Date(p.cutoffEnd).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                        ₱{p.netPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          p.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          p.status === 'processed' ? 'bg-blue-100 text-blue-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="relative group">
                          <button
                            className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <i className="bi bi-three-dots-vertical"></i>
                          </button>
                          <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 hidden group-hover:block z-10">
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(p);
                                setShowPayrollForm(true);
                              }}
                            >
                              <i className="bi bi-pencil me-2"></i>Edit
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(p.id);
                              }}
                            >
                              <i className="bi bi-trash me-2"></i>Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                        No individual payroll records found. Create a new payroll to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : mainViewTab === 'individual' ? (
          renderIndividualPayroll()
        ) : displayImportData?.sheets[mainViewTab] ? (
          <div className="overflow-x-auto bg-white">
            {/* Excel-like toolbar */}
            <div className="flex items-center justify-between px-2 py-1 bg-[#217346] text-white text-xs border-b border-[#185c37]">
              <div className="flex items-center">
                {(viewingImportedPayroll || previewPayroll) && (
                  <button
                    onClick={() => {
                      if (viewingImportedPayroll) {
                        handleCloseImportedPayrollView();
                      } else {
                        handleClosePreview();
                      }
                    }}
                    className="mr-3 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white flex items-center"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                )}
                <span className="font-semibold mr-4">📊 {mainViewTab}</span>
                <span className="text-green-200">{displayImportData.sheets[mainViewTab]?.rowCount || 0} rows</span>
                {viewingImportedPayroll && (
                  <span className="ml-4 text-green-200">| {viewingImportedPayroll.fileName} ({viewingImportedPayroll.cutoffStart} to {viewingImportedPayroll.cutoffEnd})</span>
                )}
                {previewPayroll && !viewingImportedPayroll && (
                  <span className="ml-4 text-green-200">| {previewPayroll.employeeName} - {previewPayroll.cutoffStart} to {previewPayroll.cutoffEnd}</span>
                )}
              </div>
              {viewingImportedPayroll && (
                <button
                  onClick={() => handleExportImportedPayroll(viewingImportedPayroll)}
                  disabled={exportLoading}
                  className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white flex items-center"
                >
                  {exportLoading ? (
                    <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  Export Excel
                </button>
              )}
              {previewPayroll && !viewingImportedPayroll && (
                <button
                  onClick={() => handleExportSinglePayroll(previewPayroll)}
                  disabled={exportLoading}
                  className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white flex items-center"
                >
                  {exportLoading ? (
                    <svg className="animate-spin h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  Export Excel
                </button>
              )}
            </div>
            {/* Excel-like spreadsheet */}
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full border-collapse text-xs font-['Calibri',_'Segoe_UI',_sans-serif]" style={{ minWidth: 'max-content' }}>
                <thead className="sticky top-0 z-10">
                  {/* Column letters row (A, B, C, etc.) */}
                  <tr className="bg-[#e6e6e6] border-b border-[#b4b4b4]">
                    <th className="w-10 min-w-[40px] px-1 py-0.5 text-center text-[10px] text-gray-600 border-r border-[#b4b4b4] bg-[#f0f0f0]"></th>
                    {displayImportData.sheets[mainViewTab].headers.map((_, idx) => (
                      <th key={idx} className="min-w-[80px] px-1 py-0.5 text-center text-[10px] text-gray-600 border-r border-[#b4b4b4] bg-[#f0f0f0] font-normal">
                        {String.fromCharCode(65 + (idx % 26))}{idx >= 26 ? Math.floor(idx / 26) : ''}
                      </th>
                    ))}
                  </tr>
                  {/* Header row */}
                  <tr className="bg-[#d9e8d9] border-b-2 border-[#217346]">
                    <th className="w-10 min-w-[40px] px-1 py-1 text-center text-[10px] text-gray-600 border-r border-[#b4b4b4] bg-[#f0f0f0] font-normal">1</th>
                    {displayImportData.sheets[mainViewTab].headers.map((header, idx) => {
                      // Convert Excel date serial numbers to readable dates
                      let displayHeader = header;
                      if (typeof header === 'number' && header > 40000 && header < 50000) {
                        const date = new Date((header - 25569) * 86400 * 1000);
                        const day = date.getDate();
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        displayHeader = `${day}-${monthNames[date.getMonth()]}`;
                      }
                      return (
                        <th key={idx} className="min-w-[80px] px-2 py-1.5 text-left text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d] whitespace-nowrap bg-[#d9e8d9]">
                          {displayHeader || ''}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {displayImportData.sheets[mainViewTab].rows.map((row, rowIdx) => (
                    <tr 
                      key={rowIdx} 
                      className={`border-b border-[#d4d4d4] hover:bg-[#cce5ff] ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'}`}
                    >
                      {/* Row number */}
                      <td className="w-10 min-w-[40px] px-1 py-0.5 text-center text-[10px] text-gray-500 border-r border-[#d4d4d4] bg-[#f0f0f0] font-normal">
                        {rowIdx + 2}
                      </td>
                      {row.map((cell: any, cellIdx: number) => {
                        const cellValue = cell !== null && cell !== undefined ? String(cell) : '';
                        const isNumber = !isNaN(Number(cellValue)) && cellValue !== '';
                        return (
                          <td 
                            key={cellIdx} 
                            className={`min-w-[80px] px-2 py-1 border-r border-[#e0e0e0] text-[11px] text-gray-800 whitespace-nowrap ${isNumber ? 'text-right' : 'text-left'}`}
                          >
                            {cellValue}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Excel-like status bar */}
            <div className="flex items-center justify-between px-3 py-1 bg-[#217346] text-white text-[10px] border-t border-[#185c37]">
              <span>Ready</span>
              <div className="flex items-center space-x-4">
                <span>Rows: {displayImportData.sheets[mainViewTab].rowCount}</span>
                <span>Columns: {displayImportData.sheets[mainViewTab].headers.length}</span>
              </div>
            </div>
          </div>
        ) : mainViewTab === 'individual' ? (
          renderIndividualPayroll()
        ) : mainViewTab === 'payroll' ? (
          <>
      {/* Imported Payroll Files List */}
      {importedPayrolls.length === 0 ? (
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll files</h3>
            <p className="mt-1 text-sm text-gray-500">Import an Excel file and save it to see it here.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white">
          {/* Excel-like toolbar for imported payroll files */}
          <div className="flex items-center justify-between px-2 py-1 bg-[#217346] text-white text-xs border-b border-[#185c37]">
            <div className="flex items-center">
              <span className="font-semibold mr-4"><i className="bi bi-file-earmark-spreadsheet me-2"></i>Saved Payroll Files</span>
              <span className="text-green-200">{importedPayrolls.length} files</span>
            </div>
          </div>
          {/* Excel-like spreadsheet for imported payroll files */}
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full border-collapse text-xs font-['Calibri',_'Segoe_UI',_sans-serif]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#d9e8d9] border-b-2 border-[#217346]">
                  <th className="w-10 min-w-[40px] px-1 py-1.5 text-center text-[10px] text-gray-600 border-r border-[#a8d08d] bg-[#f0f0f0] font-normal">#</th>
                  <th className="min-w-[250px] px-2 py-1.5 text-left text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d] bg-[#d9e8d9]">File Name</th>
                  <th className="min-w-[160px] px-2 py-1.5 text-left text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d] bg-[#d9e8d9]">Cutoff Period</th>
                  <th className="min-w-[100px] px-2 py-1.5 text-center text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d] bg-[#d9e8d9]">Employees</th>
                  <th className="min-w-[100px] px-2 py-1.5 text-center text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d] bg-[#d9e8d9]">Sheets</th>
                  <th className="min-w-[140px] px-2 py-1.5 text-left text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d] bg-[#d9e8d9]">Imported Date</th>
                  <th className="min-w-[80px] px-2 py-1.5 text-center text-[11px] font-semibold text-[#1f4e3d] border-r border-[#a8d08d] bg-[#d9e8d9]">Status</th>
                  <th className="min-w-[150px] px-2 py-1.5 text-center text-[11px] font-semibold text-[#1f4e3d] bg-[#d9e8d9]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {importedPayrolls.map((importedPayroll, index) => (
                  <tr key={importedPayroll.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-[#f5f9f5]'} hover:bg-[#e8f4e8] border-b border-[#d0e0d0]`}>
                    {/* Row Number */}
                    <td className="w-10 min-w-[40px] px-1 py-1.5 text-center text-[10px] text-gray-500 border-r border-[#d0e0d0] bg-[#f0f0f0]">{index + 1}</td>
                    {/* File Name */}
                    <td className="min-w-[250px] px-2 py-1.5 text-[11px] text-gray-800 border-r border-[#d0e0d0]">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">{importedPayroll.fileName}</span>
                      </div>
                    </td>
                    {/* Cutoff Period */}
                    <td className="min-w-[160px] px-2 py-1.5 text-[11px] text-gray-700 border-r border-[#d0e0d0]">
                      {importedPayroll.cutoffStart} to {importedPayroll.cutoffEnd}
                    </td>
                    {/* Employees */}
                    <td className="min-w-[100px] px-2 py-1.5 text-center text-[11px] text-gray-700 border-r border-[#d0e0d0]">
                      {importedPayroll.employeeCount || 0}
                    </td>
                    {/* Sheets */}
                    <td className="min-w-[100px] px-2 py-1.5 text-center text-[11px] text-gray-700 border-r border-[#d0e0d0]">
                      {importedPayroll.sheetNames?.length || 0}
                    </td>
                    {/* Imported Date */}
                    <td className="min-w-[140px] px-2 py-1.5 text-[11px] text-gray-700 border-r border-[#d0e0d0]">
                      {importedPayroll.createdAt ? new Date(importedPayroll.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    {/* Status */}
                    <td className="min-w-[80px] px-2 py-1.5 text-center border-r border-[#d0e0d0]">
                      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${
                        importedPayroll.status === 'completed' ? 'bg-green-100 text-green-700' :
                        importedPayroll.status === 'processed' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {importedPayroll.status || 'imported'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="min-w-[80px] px-2 py-1.5 text-center">
                      <div className="relative group inline-block">
                        <button className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 hidden group-hover:block z-20">
                          <button
                            onClick={() => handleViewImportedPayroll(importedPayroll)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center"
                          >
                            <i className="bi bi-eye me-2"></i>View
                          </button>
                          <button
                            onClick={() => handleExportImportedPayroll(importedPayroll)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center"
                          >
                            <i className="bi bi-download me-2"></i>Export
                          </button>
                          <button
                            onClick={() => handleDeleteImportedPayroll(importedPayroll)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center"
                          >
                            <i className="bi bi-trash me-2"></i>Delete
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Excel-like status bar */}
          <div className="flex items-center justify-between px-2 py-1 bg-[#f0f0f0] border-t border-[#c0c0c0] text-[10px] text-gray-600">
            {/* <div className="flex items-center space-x-4">
              <span>Total Files: {importedPayrolls.length}</span>
              <span>|</span>
              <span>Total Employees: {importedPayrolls.reduce((sum, p) => sum + (p.employeeCount || 0), 0)}</span>
            </div> */}
          </div>
        </div>
      )}

      {/* Individual Payroll Records Table */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <h3 className="text-lg font-semibold text-gray-900">Individual Payroll Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cutoff Period</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Pay</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrolls.length > 0 ? payrolls.map((p, index) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(p.cutoffStart).toLocaleDateString()} to {new Date(p.cutoffEnd).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    ₱{p.netPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      p.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      p.status === 'processed' ? 'bg-blue-100 text-blue-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative group">
                      <button className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded">
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 hidden group-hover:block z-10">
                        <button
                          onClick={() => handlePreviewPayroll(p)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center"
                        >
                          <i className="bi bi-eye me-2"></i>Preview
                        </button>
                        <button
                          onClick={() => handleEdit(p)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 flex items-center"
                        >
                          <i className="bi bi-pencil me-2"></i>Edit
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center"
                        >
                          <i className="bi bi-trash me-2"></i>Delete
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No individual payroll records found. Create a new payroll to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          Total Records: <span className="font-semibold">{payrolls.length}</span>
        </div>
      </div>

          </>
        ) : null}
      </div>

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

      {/* Individual Payroll Preview Modal */}
      {showIndividualModal && individualPayroll && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[9999]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <i className="bi bi-person-badge text-2xl text-indigo-600"></i>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{individualPayroll.employeeName}</h4>
                  <p className="text-sm text-gray-600">Payroll Details - {individualPayroll.cutoffStart} to {individualPayroll.cutoffEnd}</p>
                </div>
              </div>
              <button
                onClick={() => setShowIndividualModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <i className="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center">
                    <i className="bi bi-person-circle me-2 text-indigo-600"></i>
                    Employee Information
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Employee ID:</span>
                      <span className="font-medium text-gray-900">{individualPayroll.employeeId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium text-gray-900">{individualPayroll.employeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cutoff Period:</span>
                      <span className="font-medium text-gray-900">{individualPayroll.cutoffStart} to {individualPayroll.cutoffEnd}</span>
                    </div>
                  </div>
                </div>

                {/* Salary Information */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center">
                    <i className="bi bi-cash-coin me-2 text-green-600"></i>
                    Salary & Hours
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Basic Salary:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.basicSalary?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Worked Hours:</span>
                      <span className="font-medium text-gray-900">{individualPayroll.workedHours || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overtime Hours:</span>
                      <span className="font-medium text-gray-900">{individualPayroll.overtimeHours || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Holiday Pay:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.holidayPay?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Night Differential:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.nightDifferential?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Salary Adjustment:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.salaryAdjustment?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="bg-red-50 p-4 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center">
                    <i className="bi bi-dash-circle me-2 text-red-600"></i>
                    Deductions
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Absences:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.absences?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Late Deductions:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.lateDeductions?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SSS:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.sssContribution?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">PhilHealth:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.philhealthContribution?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pag-IBIG:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.pagibigContribution?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Withholding Tax:</span>
                      <span className="font-medium text-gray-900">₱{individualPayroll.withholdingTax?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center">
                    <i className="bi bi-calculator me-2 text-blue-600"></i>
                    Summary
                  </h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between pb-2 border-b border-blue-200">
                      <span className="text-gray-600">Gross Pay:</span>
                      <span className="font-semibold text-green-700 text-base">₱{individualPayroll.grossPay?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-blue-200">
                      <span className="text-gray-600">Total Deductions:</span>
                      <span className="font-semibold text-red-700 text-base">₱{individualPayroll.totalDeductions?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-gray-900 font-semibold">Net Pay:</span>
                      <span className="font-bold text-blue-700 text-xl">₱{individualPayroll.netPay?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        individualPayroll.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        individualPayroll.status === 'processed' ? 'bg-blue-100 text-blue-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {individualPayroll.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowIndividualModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowIndividualModal(false);
                  handleEdit(individualPayroll);
                  setShowPayrollForm(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
              >
                <i className="bi bi-pencil me-2"></i>
                Edit Payroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

