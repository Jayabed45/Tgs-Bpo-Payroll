"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  manager?: string;
  isActive: boolean;
  employeeCount?: number;
  payrollCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DepartmentManagementProps {
  onDepartmentChange?: () => void;
}

export default function DepartmentManagement({ onDepartmentChange }: DepartmentManagementProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; department?: Department }>({
    open: false,
  });
  const [successModal, setSuccessModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });
  const [errorModal, setErrorModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });
  // For success adding and updating department
  const [formSuccessModal, setFormSuccessModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    manager: ""
  });

  useEffect(() => {
    fetchDepartments();
  }, []);


  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDepartmentHierarchy();
      console.log("📊 Fetched departments response:", response);
      
      const departmentList = Array.isArray(response.departments) ? response.departments : [];
      console.log("📋 Department list:", departmentList);
      
      if (departmentList.length > 0) {
        console.log("🔍 First department structure:", JSON.stringify(departmentList[0], null, 2));
        console.log("🔍 Department keys:", Object.keys(departmentList[0]));
        console.log("🔍 Department id:", departmentList[0].id);
        console.log("🔍 Department _id:", departmentList[0]._id);
      }
      
      // Ensure all departments have proper id field
      const mappedDepartments = departmentList.map(dept => {
        // Try multiple ways to get the ID
        let id = dept.id || dept._id || dept.Id || dept.ID;
        
        // Convert ObjectId to string if needed
        if (id && typeof id === 'object' && id.toString) {
          id = id.toString();
        }
        
        if (!id) {
          console.error("⚠️ Department without ID:", dept);
        }
        
        return {
          ...dept,
          id: id
        };
      });
      
      console.log("🔄 Mapped departments with IDs:", mappedDepartments.map(d => ({ id: d.id, name: d.name })));
      
      setDepartments(mappedDepartments);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "", code: "", description: "", manager: ""
    });
    setEditingDepartment(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (formLoading) return;
    
    setFormLoading(true);

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Department name is required');
      }
      if (!formData.code.trim()) {
        throw new Error('Department code is required');
      }
      
      // Clean and format the data
      const cleanFormData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        manager: formData.manager.trim()
      };
      
      console.log('🚀 Submitting department form:', cleanFormData);
      
      if (editingDepartment) {
        // Update existing department
        await apiService.updateDepartment(editingDepartment.id, cleanFormData);
        setFormSuccessModal({ open: true, message: "Department updated successfully!" });
      } else {
        // Create new department
        await apiService.createDepartment(cleanFormData);
        setFormSuccessModal({ open: true, message: "Department added successfully!" });
      }
      
      // Note: Don't close form or reset here - it's handled in the modal's onClose
    } catch (error: any) {
      console.error('❌ Department operation failed:', error);
      setErrorModal({ open: true, message: error.message || 'Operation failed' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (department: Department) => {
    console.log("✏️ Edit button clicked for department:", {
      id: department.id,
      name: department.name,
      fullObject: department
    });
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description || "",
      manager: department.manager || ""
    });
    setShowAddForm(true);
  };

  const handleDeleteClick = (department: Department) => {
    console.log("🗑️ Delete button clicked for department:", {
      id: department.id,
      name: department.name,
      fullObject: department
    });
    setDeleteModal({ open: true, department });
  };

  const confirmDelete = async () => {
    if (!deleteModal.department) {
      console.error("❌ No department selected for deletion");
      return;
    }

    const departmentId = deleteModal.department.id;
    const departmentName = deleteModal.department.name;

    if (!departmentId) {
      console.error("❌ Department ID is undefined or null!");
      console.error("Department object:", deleteModal.department);
      setErrorModal({ open: true, message: "Cannot delete: Department ID is missing" });
      setDeleteModal({ open: false });
      return;
    }

    console.log("🟢 Starting delete process for department:", { id: departmentId, name: departmentName });

    try {
      console.log("🔄 Calling API to delete department...");
      const result = await apiService.deleteDepartment(departmentId);
      console.log("✅ API delete response:", result);
      console.log("✅ Delete succeeded");

      // Close confirm delete modal
      setDeleteModal({ open: false });
      
      // Show success modal
      setSuccessModal({ 
        open: true, 
        message: `Department ${departmentName} has been successfully deleted.` 
      });
      
      // Update local state and notify parent
      console.log("🔄 Refreshing department list...");
      await fetchDepartments();
      
      if (onDepartmentChange) {
        console.log("📢 Notifying parent of department change");
        onDepartmentChange();
      }
      
      console.log("✅ Delete process completed successfully");
    } catch (error: any) {
      console.error("❌ Delete error details:", {
        message: error.message,
        status: error.status,
        response: error.response,
        stack: error.stack
      });
      
      let errorMessage = "Delete failed";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setErrorModal({ open: true, message: errorMessage });
      setDeleteModal({ open: false });
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
        <h3 className="text-lg font-medium text-gray-900">Department Management</h3>
        <p className="text-sm text-gray-500">Manage organizational departments and structure</p>
      </div>

      {/* Department Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department, index) => (
          <div key={department.id || `department-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{department.name}</h4>
                  <p className="text-sm text-gray-500 font-mono">{department.code}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(department)}
                  className="text-indigo-600 hover:text-indigo-800 p-1"
                  title="Edit department"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteClick(department)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Delete department"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {department.description && (
              <p className="text-sm text-gray-600 mb-4">{department.description}</p>
            )}
            
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  {department.employeeCount || 0} employees
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {department.payrollCount || 0} payrolls
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {editingDepartment ? 'Edit Department' : 'Add New Department'}
                </h4>
                <p className="text-sm text-gray-600">Fill in the department details below</p>
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
              {/* Department Information Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                  <h5 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Department Information</h5>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Department Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter department name"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-1.414.586H7a4 4 0 01-4-4V7a4 4 0 014-4z" />
                      </svg>
                      Department Code
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter department code (e.g., HR, IT)"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Enter department description"
                      rows={4}
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Manager (Optional)
                    </label>
                    <input
                      type="text"
                      name="manager"
                      value={formData.manager}
                      onChange={handleInputChange}
                      placeholder="Enter manager name or ID"
                      className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
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
                    <span>{editingDepartment ? "Update Department" : "Add Department"}</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Render the modals */}
      <ConfirmDeleteModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false })}
        onConfirm={confirmDelete}
        departmentName={deleteModal.department?.name || ""}
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
          fetchDepartments();
          onDepartmentChange?.();
        }}
        message={formSuccessModal.message}
      />

      <ErrorModal
        isOpen={errorModal.open}
        onClose={() => setErrorModal({ open: false })}
        message={errorModal.message}
      />

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="bg-gradient-to-br from-green-500 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          title="Add New Department"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Confirm Delete Modal
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  departmentName: string;
}

export function ConfirmDeleteModal({ isOpen, onClose, onConfirm, departmentName }: ConfirmDeleteModalProps) {
  const [inputValue, setInputValue] = React.useState("");

  // Reset input when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-red-600">
           CRITICAL: Delete Department?
        </h2>

        <p className="mt-2 text-sm text-gray-700">
          This will:
          <br />• Permanently remove department record
          <br />• Delete <b>ALL</b> associated employee assignments
          <br />• <b>This action cannot be undone</b>
        </p>

        <p className="mt-3 text-sm text-gray-800">
          Type <b>DELETE</b> to confirm deletion of Department <b>{departmentName}</b>.
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
            onClick={onConfirm}
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

// Successfully Deleted Modal
export function SuccessModal({ isOpen, onClose, message }: {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}) {
  if (!isOpen) return null;

  const handleOk = () => {
    console.log("✅ OK clicked - closing modal");
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[9999]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
        <h2 className="text-lg font-semibold text-green-600">
          Deleted Successfully
        </h2>
        <p className="mt-3 text-sm text-gray-700">
          {message || "The department was deleted successfully."}
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

// Success Modal for Form Operations (Add/Update)
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
