"use client";
import React, { useState, useEffect, useRef } from "react";
import { apiService } from "../services/api";
import Papa from "papaparse";


interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  manager?: string;
  isActive: boolean;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  salary: number;
  workingDays: number;
  sssNumber: string;
  philhealthNumber: string;
  pagibigNumber: string;
  email: string;
  contactNumber: string;
  hireDate: string;
  departmentId: string;
  department?: Department; // Populated department info
  isActive: boolean;
}

interface EmployeeManagementProps {
  onEmployeeChange?: () => void;
}

// Error Modal Component Interface and Definition
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



export default function EmployeeManagement({ onEmployeeChange }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [viewModal, setViewModal] = useState<{ open: boolean; employee?: Employee }>({
    open: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);


  //Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; employee?: Employee }>({
    open: false,
  });
  // Success modal state
  const [successModal, setSuccessModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });
  //For success adding and updating employee
  const [formSuccessModal, setFormSuccessModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });
  // Error modal state
  const [errorModal, setErrorModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });
 
   // open modal when delete button clicked
  const handleDeleteClick = (employee: Employee) => {
    setDeleteModal({ open: true, employee });
  };

  // Add this useEffect to check for success state on component mount
useEffect(() => {
  const showSuccess = sessionStorage.getItem('showDeleteSuccess');
  const message = sessionStorage.getItem('deleteSuccessMessage');
  const timestamp = sessionStorage.getItem('deleteSuccessTimestamp');
  
  if (showSuccess === 'true' && timestamp) {
    // Only show if the success was stored less than 5 seconds ago
    const timeDiff = Date.now() - parseInt(timestamp);
    if (timeDiff < 5000) {
      console.log("🎯 Showing success modal from sessionStorage");
      setSuccessModal({
        open: true,
        message: message || "Employee deleted successfully."
      });
      
      // Clean up
      sessionStorage.removeItem('showDeleteSuccess');
      sessionStorage.removeItem('deleteSuccessMessage');
      sessionStorage.removeItem('deleteSuccessTimestamp');
    } else {
      // Clean up old entries
      sessionStorage.removeItem('showDeleteSuccess');
      sessionStorage.removeItem('deleteSuccessMessage');
      sessionStorage.removeItem('deleteSuccessTimestamp');
    }
  }
}, []);
// Clean up on unmount to prevent memory leaks
useEffect(() => {
  return () => {
    // Only clean up if we're not in the middle of a delete operation
    const showSuccess = sessionStorage.getItem('showDeleteSuccess');
    if (showSuccess !== 'true') {
      sessionStorage.removeItem('showDeleteSuccess');
      sessionStorage.removeItem('deleteSuccessMessage');
      sessionStorage.removeItem('deleteSuccessTimestamp');
    }
  };
}, []);

// Close dropdown when clicking outside
useEffect(() => {
  const handleClickOutside = () => {
    if (openDropdownId) {
      setOpenDropdownId(null);
    }
  };

  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, [openDropdownId]);

  // const confirmDelete = () => {
  //   if (!deleteModal.employee) return;

  //   // close delete modal
  //   setDeleteModal({ open: false });

  //   // open success modal with both id + name
  //   setSuccessModal({ 
  //     open: true, 
  //     employeeId: deleteModal.employee.id, 
  //     employeeName: deleteModal.employee.name 
  //   });
  // };
  
const confirmDelete = async (e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (!deleteModal.employee) return;

  const id = deleteModal.employee.id;
  const name = deleteModal.employee.name;

  try {
    console.log("🟢 Deleting employee:", id);
    await apiService.deleteEmployee(id);
    console.log("✅ Delete succeeded");

    // Store success state in sessionStorage
    sessionStorage.setItem('showDeleteSuccess', 'true');
    sessionStorage.setItem('deleteSuccessMessage', `Employee ${name} has been successfully deleted.`);
    sessionStorage.setItem('deleteSuccessTimestamp', Date.now().toString());

    // Update local state
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    
    // 👇 CRITICAL: Notify parent components to refresh their data
    if (onEmployeeChange) {
      console.log("📢 Notifying parent of employee change");
      onEmployeeChange(); // This should trigger refreshes in other components
    } else {
      console.log("ℹ️ No onEmployeeChange callback provided");
    }

    // Close confirm delete modal
    setDeleteModal({ open: false, employee: undefined });

  } catch (error: any) {
    console.error("❌ Delete error:", error);
    setErrorModal({ open: true, message: error.message || "Delete failed" });
  }
};


  // Form state
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    salary: "",
    workingDays: "",
    sssNumber: "",
    philhealthNumber: "",
    pagibigNumber: "",
    email: "",
    contactNumber: "",
    hireDate: "",
    departmentId: ""
  });

  // Department state
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.floating-action-container')) {
        closeDropdown();
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiService.getEmployees();
    // Always fall back to empty array if response is invalid
      setEmployees(Array.isArray(response.employees) ? response.employees : []);

    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]); // fallback to empty on error
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiService.getDepartments();
      setDepartments(Array.isArray(response.departments) ? response.departments : []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "", position: "", salary: "", workingDays: "",
      sssNumber: "", philhealthNumber: "", pagibigNumber: "",
      email: "", contactNumber: "", hireDate: "", departmentId: ""
    });
    setEditingEmployee(null);
  };

  const closeDropdown = () => {
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (editingEmployee) {
        // Update existing employee
        await apiService.updateEmployee(editingEmployee.id, formData);
        setFormSuccessModal({ open: true, message: "Employee updated successfully!" });
      } else {
        // Create new employee
        await apiService.createEmployee(formData);
        setFormSuccessModal({ open: true, message: "Employee added successfully!" });
      }
      

    } catch (error: any) {
      setErrorModal({ open: true, message: error.message || 'Operation failed' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      position: employee.position,
      salary: employee.salary.toString(),
      workingDays: employee.workingDays.toString(),
      sssNumber: employee.sssNumber,
      philhealthNumber: employee.philhealthNumber,
      pagibigNumber: employee.pagibigNumber,
      email: employee.email,
      contactNumber: employee.contactNumber,
      hireDate: employee.hireDate,
      departmentId: employee.departmentId
    });
    setShowAddForm(true);
  };

//old deletetion method was here before add lang ug e balik 

  // File import functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const fileType = file.name.toLowerCase();
    if (!fileType.endsWith('.csv') && !fileType.endsWith('.xlsx') && !fileType.endsWith('.xls')) {
      setErrorModal({ open: true, message: 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)' });
      return;
    }

    // For now, we'll handle CSV files. Excel files would need additional libraries
    if (fileType.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setImportErrors(results.errors.map(err => `Row ${err.row}: ${err.message}`));
          } else {
            setImportPreview(results.data);
            setImportErrors([]);
          }
        },
        error: (error) => {
          setImportErrors([`File parsing error: ${error.message}`]);
        }
      });
    } else {
      setErrorModal({ open: true, message: 'Excel file support coming soon. Please convert to CSV format.' });
    }
  };

  const validateImportData = (data: any[]): { valid: any[], errors: string[] } => {
    const valid: any[] = [];
    const errors: string[] = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because of 0-based index and header row
      
      // Required fields validation
      if (!row.name || !row.position || !row.salary || !row.email) {
        errors.push(`Row ${rowNum}: Missing required fields (name, position, salary, email)`);
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email)) {
        errors.push(`Row ${rowNum}: Invalid email format`);
        return;
      }

      // Salary validation
      const salary = parseFloat(row.salary);
      if (isNaN(salary) || salary < 0) {
        errors.push(`Row ${rowNum}: Invalid salary amount`);
        return;
      }

      // Working days validation
      if (row.workingDays) {
        const workingDays = parseInt(row.workingDays);
        if (isNaN(workingDays) || workingDays < 0 || workingDays > 31) {
          errors.push(`Row ${rowNum}: Invalid working days (must be 0-31)`);
          return;
        }
      }

      // Transform data to match our format
      const employeeData = {
        name: row.name.trim(),
        position: row.position.trim(),
        salary: salary,
        workingDays: parseInt(row.workingDays) || 0,
        sssNumber: row.sssNumber?.trim() || '',
        philhealthNumber: row.philhealthNumber?.trim() || '',
        pagibigNumber: row.pagibigNumber?.trim() || '',
        email: row.email.trim(),
        contactNumber: row.contactNumber?.trim() || '',
        hireDate: row.hireDate || new Date().toISOString().split('T')[0]
      };

      valid.push(employeeData);
    });

    return { valid, errors };
  };

  const handleImportSubmit = async () => {
    if (importPreview.length === 0) {
      setErrorModal({ open: true, message: 'No data to import' });
      return;
    }

    const { valid, errors } = validateImportData(importPreview);
    
    if (errors.length > 0) {
      setImportErrors(errors);
      return;
    }

    setImportLoading(true);
    try {
      const result = await apiService.bulkImportEmployees(valid);
      setSuccessModal({ open: true, message: `Successfully imported ${result.imported} employees!` });
      setShowImportModal(false);
      setImportPreview([]);
      setImportErrors([]);
      fetchEmployees(); // Refresh the list
      onEmployeeChange?.(); // Notify parent if provided
    } catch (error: any) {
      setErrorModal({ open: true, message: error.message || 'Import failed' });
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: 'John Doe',
        position: 'Software Developer',
        salary: '50000',
        workingDays: '22',
        sssNumber: '1234567890',
        philhealthNumber: 'PH1234567890',
        pagibigNumber: 'PAG1234567890',
        email: 'john.doe@example.com',
        contactNumber: '+639123456789',
        hireDate: '2024-01-15'
      }
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'employee_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const fileType = file.name.toLowerCase();
      
      if (!fileType.endsWith('.csv') && !fileType.endsWith('.xlsx') && !fileType.endsWith('.xls')) {
        setErrorModal({ open: true, message: 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)' });
        return;
      }

      if (fileType.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              setImportErrors(results.errors.map(err => `Row ${err.row}: ${err.message}`));
            } else {
              setImportPreview(results.data);
              setImportErrors([]);
            }
          },
          error: (error) => {
            setImportErrors([`File parsing error: ${error.message}`]);
          }
        });
      } else {
        setErrorModal({ open: true, message: 'Excel file support coming soon. Please convert to CSV format.' });
      }
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
        <h3 className="text-lg font-medium text-gray-900">Employee List</h3>
        <p className="text-sm text-gray-500">Manage your employees and their information</p>
      </div>

      {/* No backdrop - modals will slide in without covering content */}

      {/* Add/Edit Form Sliding Panel */}
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-xl transform transition-all duration-500 ease-in-out z-50 ${
        showAddForm ? 'translate-x-0' : 'translate-x-full'
      }`} style={{ zIndex: 1000 }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </h4>
                <p className="text-sm text-gray-600">Fill in the employee details below</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Close form"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Personal Information</h5>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter full name"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                      </svg>
                      Position
                    </label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter job position"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                    />
                  </div>
                </div>

                {/* Department Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Department
                  </label>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleInputChange}
                    required
                    className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Compensation Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Compensation</h5>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Salary
                    </label>
                    <input
                      type="number"
                      name="salary"
                      value={formData.salary}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Working Days
                    </label>
                    <input
                      type="number"
                      name="workingDays"
                      value={formData.workingDays}
                      onChange={handleInputChange}
                      required
                      min="0"
                      max="31"
                      placeholder="Days"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Government IDs Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Government IDs</h5>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V4a2 2 0 114 0v2m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      SSS Number
                    </label>
                    <input
                      type="text"
                      name="sssNumber"
                      value={formData.sssNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter SSS number"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PhilHealth Number
                    </label>
                    <input
                      type="text"
                      name="philhealthNumber"
                      value={formData.philhealthNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter PhilHealth number"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Pag-IBIG Number
                    </label>
                    <input
                      type="text"
                      name="pagibigNumber"
                      value={formData.pagibigNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter Pag-IBIG number"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Contact Information</h5>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter email address"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter contact number"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Hire Date
                    </label>
                    <input
                      type="date"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleInputChange}
                      required
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>
          
          {/* Footer with buttons */}
          <div className="p-6 border-t border-gray-200 bg-white">
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={formLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all font-medium shadow-sm"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    <span>{editingEmployee ? "Update Employee" : "Add Employee"}</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      {employees.length === 0 ? (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No employees</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding your first employee.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Salary</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee, index) => (
                  <tr 
                    key={employee.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setViewModal({ open: true, employee })}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-500">{employee.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.position}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.department?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{employee.department?.code || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₱{employee.salary.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        employee.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenDropdownId(openDropdownId === employee.id ? null : employee.id)}
                          className="text-gray-600 hover:text-gray-800 p-1 hover:bg-gray-100 rounded-full transition-colors"
                          title="More options"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        
                        {openDropdownId === employee.id && (
                          <div className={`absolute right-0 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 ${
                            index >= employees.length - 2 ? 'bottom-full mb-2' : 'top-full mt-2'
                          }`}>
                            <button
                              onClick={() => {
                                handleEdit(employee);
                                setOpenDropdownId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit Employee</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteClick(employee);
                                setOpenDropdownId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete Employee</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

            {/* Import Modal - Sliding Panel */}
      {showImportModal && (
        <div 
          className={`fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl transform transition-all duration-700 ease-out z-50 ${
            showImportModal ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
          }`}
          style={{ zIndex: 1000 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Import Employees</h4>
                  <p className="text-sm text-gray-600">Upload CSV file to bulk import employees</p>
                </div>
              </div>
            <button 
              onClick={() => {
                setShowImportModal(false);
                setImportPreview([]);
                setImportErrors([]);
              }}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* File Upload Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h5 className="text-sm font-semibold text-gray-700">Upload File</h5>
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Template</span>
                </button>
              </div>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-800"
                >
                  <svg className={`w-12 h-12 ${dragActive ? 'text-green-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  <span className="text-sm font-medium">
                    {dragActive ? 'Drop your CSV file here' : 'Click to upload CSV file'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {dragActive ? 'Release to upload' : 'or drag and drop'}
                  </span>
                </button>
              </div>
            </div>

            {/* Errors Display */}
            {importErrors.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-red-700 mb-2">Validation Errors</h5>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-32 overflow-y-auto">
                  {importErrors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Table */}
            {importPreview.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-semibold text-gray-700 mb-4">
                  Preview ({importPreview.length} employees)
                </h5>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                     <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importPreview.slice(0, 5).map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{row.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.position}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">₱{parseFloat(row.salary || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.email}</td>
                          </tr>
                        ))}
                        {importPreview.length > 5 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-2 text-sm text-gray-500 text-center">
                              ... and {importPreview.length - 5} more employees
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-white">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {importPreview.length > 0 && (
                  <span>{importPreview.length} employees ready to import</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportPreview([]);
                    setImportErrors([]);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={importLoading || importPreview.length === 0 || importErrors.length > 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-1"
                >
                  {importLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Import Employees</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
                 </div>
       </div>
       )}

      {/* Floating Action Button with Click Dropdown */}
      <div className="fixed bottom-6 right-6 z-40 floating-action-container">
        {/* Main Button */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="bg-gradient-to-br from-green-500 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          title="Quick Actions - Click to see options"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Click Dropdown */}
        {showDropdown && (
          <div className="absolute bottom-full right-0 mb-3 opacity-100 transition-all duration-300 transform translate-y-0">
            {/* Import Button */}
            <button
              onClick={() => {
                setShowImportModal(true);
                closeDropdown();
              }}
              className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-all duration-200 hover:scale-110 mb-3 flex items-center justify-center"
              title="Import Employees from CSV"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </button>

            {/* Add Employee Button */}
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(true);
                closeDropdown();
              }}
              className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-110 flex items-center justify-center"
              title="Add New Employee"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>
      <div>
      {employees.map(employee => (
        <div key={employee.id} className="flex justify-between items-center py-2">
        </div>
      ))}

      {/*render the modal */}
        <ConfirmDeleteModal
          isOpen={deleteModal.open}
          onClose={() => setDeleteModal({ open: false })}
          onConfirm={confirmDelete}
          employeeName={deleteModal.employee?.name || ""}
        />

        <SuccessModal
          isOpen={successModal.open}
          onClose={() => setSuccessModal({ open: false })}
          message={successModal.message}
        />

        <SuccessModalForm
          isOpen={formSuccessModal.open}
          onClose={() => {
            setFormSuccessModal({ open: false });
            setShowAddForm(false);
            resetForm();
            fetchEmployees(); 
            onEmployeeChange?.();
          }}
          message={formSuccessModal.message}
        />

        <ErrorModal
          isOpen={errorModal.open}
          onClose={() => setErrorModal({ open: false })}
          message={errorModal.message}
        />

        <EmployeeViewModal
          isOpen={viewModal.open}
          onClose={() => setViewModal({ open: false })}
          employee={viewModal.employee}
        />
    </div>
    </div>
    
  );
  
}
//Confirm Delete Modal
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  employeeName: string;
}
//Delete Modal
export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, employeeName }: ConfirmDeleteModalProps) {
  const [inputValue, setInputValue] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-red-600">
           CRITICAL: Delete Employee?
        </h2>

        <p className="mt-2 text-sm text-gray-700">
          This will:
          <br />• Permanently remove employee record
          <br />• Delete <b>ALL</b> associated payroll records
          <br />• <b>This action cannot be undone</b>
        </p>

        <p className="mt-3 text-sm text-gray-800">
          Type <b>DELETE</b> to confirm deletion of Employee <b>{employeeName}</b>.
        </p>

        <input
          type="text"
          className="w-full border rounded-md px-3 py-2 mt-3 text-black"
          placeholder="Type DELETE"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />

        <div className="flex justify-end space-x-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={ 
              onConfirm
            }
            disabled={inputValue !== "DELETE"}
            className={`px-4 py-2 rounded-md text-white ${
              inputValue === "DELETE"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-red-300 cursor-not-allowed"
            }`}
          >
            Confirm Delete
          </button>

        </div>
      </div>
    </div>
  );
}

// Successfully Deleted Modal
export function SuccessModal({ isOpen, onClose, message }: {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}) {
  if (!isOpen) return null;

const handleOk = () => {
  console.log("✅ OK clicked - cleaning up and closing modal");
  // Clean up sessionStorage
  sessionStorage.removeItem('showDeleteSuccess');
  sessionStorage.removeItem('deleteSuccessMessage');
  sessionStorage.removeItem('deleteSuccessTimestamp');
  
  onClose();
};

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
        <h2 className="text-lg font-semibold text-green-600">
          Deleted Successfully
        </h2>
        <p className="mt-3 text-sm text-gray-700">
          {message || "The employee was deleted successfully."}
        </p>
        <div className="mt-5">
          <button
            onClick={handleOk}
            className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

//Success Modal upadating and adding 
interface FormSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export function SuccessModalForm({ isOpen, onClose, message }: FormSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
        <h2 className="text-lg font-semibold text-green-600">
          Success
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

// Employee View Modal
interface EmployeeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: Employee;
}

export function EmployeeViewModal({ isOpen, onClose, employee }: EmployeeViewModalProps) {
  const [payrollHistory, setPayrollHistory] = useState<any[]>([]);
  const [loadingPayroll, setLoadingPayroll] = useState(false);

  // Fetch payroll history when modal opens
  useEffect(() => {
    if (isOpen && employee?.id) {
      const fetchPayrollHistory = async () => {
        try {
          setLoadingPayroll(true);
          const response = await apiService.getPayrolls();
          console.log('📊 All payrolls:', response.payrolls);
          console.log('🔍 Looking for employee:', { id: employee.id, name: employee.name });
          
          // Filter payrolls for this employee and sort by date
          const employeePayrolls = response.payrolls
            .filter((p: any) => {
              const idMatch = p.employeeId === employee.id;
              const nameMatch = p.employeeName === employee.name;
              console.log('Checking payroll:', { 
                payrollEmployeeId: p.employeeId, 
                payrollEmployeeName: p.employeeName,
                targetEmployeeId: employee.id,
                targetEmployeeName: employee.name,
                idMatch,
                nameMatch,
                finalMatch: idMatch || nameMatch
              });
              // Match by ID or name (fallback)
              return idMatch || nameMatch;
            })
            .filter((p: any) => {
              const netAmount = p.netPay || p.netSalary;
              const hasNetAmount = netAmount && typeof netAmount === 'number';
              console.log('Validating payroll net amount:', { netPay: p.netPay, netSalary: p.netSalary, netAmount, valid: hasNetAmount });
              return hasNetAmount;
            })
            .sort((a: any, b: any) => {
              const dateA = new Date(a.cutoffStart || a.payPeriodStart || 0).getTime();
              const dateB = new Date(b.cutoffStart || b.payPeriodStart || 0).getTime();
              return dateA - dateB;
            })
            .slice(-6); // Get last 6 payroll records
          
          console.log('✅ Filtered payrolls for employee:', employeePayrolls);
          console.log('📈 Number of payrolls found:', employeePayrolls.length);
          setPayrollHistory(employeePayrolls);
        } catch (error) {
          console.error('Error fetching payroll history:', error);
          setPayrollHistory([]);
        } finally {
          setLoadingPayroll(false);
        }
      };
      fetchPayrollHistory();
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate chart points from payroll data
  const generateChartPoints = () => {
    if (payrollHistory.length === 0) {
      return { points: '', circles: [], labels: [], maxSalary: 0, minSalary: 0 };
    }

    // Filter out any invalid payroll records
    const validPayrolls = payrollHistory.filter(p => {
      const netAmount = p.netPay || p.netSalary;
      return p && typeof netAmount === 'number';
    });
    
    if (validPayrolls.length === 0) {
      return { points: '', circles: [], labels: [], maxSalary: 0, minSalary: 0 };
    }

    const maxSalary = Math.max(...validPayrolls.map(p => p.netPay || p.netSalary));
    const minSalary = Math.min(...validPayrolls.map(p => p.netPay || p.netSalary));
    const range = maxSalary - minSalary || 1;

    const chartWidth = 400;
    const chartHeight = 150;
    const padding = 20;
    const usableHeight = chartHeight - padding * 2;
    const step = validPayrolls.length > 1 ? chartWidth / (validPayrolls.length - 1) : chartWidth / 2;

    const points = validPayrolls.map((p, i) => {
      const netAmount = p.netPay || p.netSalary;
      const x = i * step;
      const normalizedValue = (netAmount - minSalary) / range;
      const y = chartHeight - padding - (normalizedValue * usableHeight);
      return `${x},${y}`;
    }).join(' ');

    const circles = validPayrolls.map((p, i) => {
      const netAmount = p.netPay || p.netSalary;
      const x = i * step;
      const normalizedValue = (netAmount - minSalary) / range;
      const y = chartHeight - padding - (normalizedValue * usableHeight);
      return { x, y, salary: netAmount || 0 };
    });

    const labels = validPayrolls.map(p => {
      const date = new Date(p.cutoffStart || p.payPeriodStart || p.createdAt);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    });

    return { points, circles, labels, maxSalary, minSalary };
  };

  const chartData = generateChartPoints();
  const hasPayrollData = payrollHistory.length > 0 && chartData.circles.length > 0;
  const latestPayroll = hasPayrollData ? payrollHistory[payrollHistory.length - 1] : null;
  const firstPayroll = hasPayrollData ? payrollHistory[0] : null;
  const latestSalary = latestPayroll ? (latestPayroll.netPay || latestPayroll.netSalary || 0) : (employee.salary || 0);
  const firstSalary = firstPayroll ? (firstPayroll.netPay || firstPayroll.netSalary || 0) : (employee.salary || 0);
  const growthPercent = hasPayrollData && firstSalary > 0 
    ? (((latestSalary - firstSalary) / firstSalary) * 100).toFixed(1) 
    : '0';

  // Calculate KPIs
  const calculateKPIs = () => {
    if (!hasPayrollData) {
      return {
        averageMonthlyPay: 0,
        ytdEarnings: 0,
        deductionRate: 0
      };
    }

    // Average Monthly Pay
    const totalNetPay = payrollHistory.reduce((sum, p) => sum + (p.netPay || p.netSalary || 0), 0);
    const averageMonthlyPay = totalNetPay / payrollHistory.length;

    // YTD Earnings (current year)
    const currentYear = new Date().getFullYear();
    const ytdEarnings = payrollHistory
      .filter(p => {
        const payrollYear = new Date(p.cutoffStart || p.payPeriodStart || p.createdAt).getFullYear();
        return payrollYear === currentYear;
      })
      .reduce((sum, p) => sum + (p.netPay || p.netSalary || 0), 0);

    // Deduction Rate
    const totalGrossPay = payrollHistory.reduce((sum, p) => sum + (p.grossPay || 0), 0);
    const totalDeductions = payrollHistory.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
    const deductionRate = totalGrossPay > 0 ? (totalDeductions / totalGrossPay) * 100 : 0;

    return {
      averageMonthlyPay: Math.round(averageMonthlyPay),
      ytdEarnings: Math.round(ytdEarnings),
      deductionRate: deductionRate.toFixed(1)
    };
  };

  const kpis = calculateKPIs();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[9999] p-4">
      <div className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col p-4 gap-4">
        {/* Header Card - Full Width */}
        <div className="bg-white rounded-xl p-6 relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {getInitials(employee.name)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{employee.name}</h2>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                    employee.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {employee.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-gray-500 text-sm mt-1">Email: {employee.email}</p>
                <p className="text-gray-500 text-xs mt-0.5">Hire Date: {employee.hireDate}</p>
              </div>
            </div>
            
            {/* Government IDs Section */}
            <div className="flex gap-6 mr-12">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-0.5">SSS Number</label>
                <p className="text-gray-900 text-xs font-medium">{employee.sssNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-0.5">PhilHealth Number</label>
                <p className="text-gray-900 text-xs font-medium">{employee.philhealthNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-0.5">Pag-IBIG Number</label>
                <p className="text-gray-900 text-xs font-medium">{employee.pagibigNumber || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid - Unequal Columns */}
        <div className="flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
            {/* Details Section - Takes 1 column */}
            <div className="bg-white rounded-xl p-4 lg:col-span-1 flex flex-col">
              <h3 className="text-base font-bold text-gray-900 mb-3">Details</h3>
              
              <div className="space-y-4 flex-1">
                <div>
                  <label className="text-xs text-gray-500">Position</label>
                  <p className="text-gray-900 mt-0.5 text-sm">{employee.position}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Department</label>
                  <p className="text-gray-900 mt-0.5 text-sm">
                    {employee.department?.name || 'N/A'}
                    {employee.department?.code && (
                      <span className="text-xs text-gray-400 ml-2">({employee.department.code})</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Salary</label>
                  <p className="text-gray-900 mt-0.5 text-sm font-semibold">₱{employee.salary.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Working Days</label>
                  <p className="text-gray-900 mt-0.5 text-sm">{employee.workingDays} days</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Contact Number</label>
                  <p className="text-gray-900 mt-0.5 text-sm">{employee.contactNumber}</p>
                </div>
              </div>
            </div>

            {/* KPI Section - Takes 2 columns */}
            <div className="bg-white rounded-xl p-4 lg:col-span-2 flex flex-col">
              {/* Header */}
              <h3 className="text-base font-bold text-gray-900 mb-3 flex-shrink-0">Payroll History</h3>
              
              {/* KPI Box */}
              {hasPayrollData && (
                <div className="mb-3 border border-gray-200 rounded-lg p-3 bg-gray-50 flex-shrink-0">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Avg Monthly Pay</p>
                      <p className="text-xl font-black text-gray-900">₱{kpis.averageMonthlyPay.toLocaleString()}</p>
                    </div>
                    <div className="text-center border-l border-r border-gray-300">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">YTD Earnings</p>
                      <p className="text-xl font-black text-gray-900">₱{kpis.ytdEarnings.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Deduction Rate</p>
                      <p className="text-xl font-black text-gray-900">{kpis.deductionRate}%</p>
                    </div>
                  </div>
                </div>
              )}
              
              {loadingPayroll ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : !hasPayrollData ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm">No payroll history available for this employee</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Chart Container */}
                  <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col">
                    <svg className="w-full h-55" viewBox="0 0 500 200" preserveAspectRatio="none">
                      {/* Minimal grid lines */}
                      <line x1="0" y1="50" x2="500" y2="50" stroke="#f3f4f6" strokeWidth="1"/>
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#f3f4f6" strokeWidth="1"/>
                      <line x1="0" y1="150" x2="500" y2="150" stroke="#f3f4f6" strokeWidth="1"/>
                      
                      {/* Payroll line with real data */}
                      {chartData.points && (
                        <>
                          {/* Subtle area fill */}
                          <polygon
                            points={`${chartData.points} 500,200 0,200`}
                            fill="#000000"
                            opacity="0.03"
                          />
                          
                          {/* Main line */}
                          <polyline
                            points={chartData.points}
                            fill="none"
                            stroke="#000000"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </>
                      )}
                      
                      {/* Data points */}
                      {chartData.circles.map((circle, i) => (
                        <g key={i}>
                          <circle cx={circle.x} cy={circle.y} r="5" fill="#ffffff" stroke="#000000" strokeWidth="2"/>
                          <title>₱{circle.salary.toLocaleString()}</title>
                        </g>
                      ))}
                    </svg>
                    
                    {/* Month labels */}
                    <div className="flex justify-between mt-1.5 px-2 flex-shrink-0">
                      {chartData.labels.map((label, i) => (
                        <span key={i} className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

