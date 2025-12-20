// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// class ApiService {
//   private getAuthHeaders(): HeadersInit {
//     const token = localStorage.getItem('token');
//     return {
//       'Content-Type': 'application/json',
//       ...(token && { Authorization: `Bearer ${token}` })
//     };
//   }

//   private async handleResponse<T>(response: Response): Promise<T> {
//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({}));
//       throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
//     }
//     return response.json();
//   }

//   // Employee API calls
//   async getEmployees() {
//     const response = await fetch(`${API_BASE_URL}/employees`, {
//       headers: this.getAuthHeaders()
//     });
//     return this.handleResponse<{ success: boolean; employees: any[]; total: number }>(response);
//   }

//   async getEmployee(id: string) {
//     const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
//       headers: this.getAuthHeaders()
//     });
//     return this.handleResponse<{ success: boolean; employee: any }>(response);
//   }

//   async createEmployee(employeeData: any) {
//     const response = await fetch(`${API_BASE_URL}/employees`, {
//       method: 'POST',
//       headers: this.getAuthHeaders(),
//       body: JSON.stringify(employeeData)
//     });
//     return this.handleResponse<{ success: boolean; message: string; employee: any }>(response);
//   }

//   async updateEmployee(id: string, employeeData: any) {
//     const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
//       method: 'PUT',
//       headers: this.getAuthHeaders(),
//       body: JSON.stringify(employeeData)
//     });
//     return this.handleResponse<{ success: boolean; message: string }>(response);
//   }

//   async deleteEmployee(id: string) {
//     const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
//       method: 'DELETE',
//       headers: this.getAuthHeaders()
//     });
//     return this.handleResponse<{ success: boolean; message: string }>(response);
//   }

//   async getEmployeeStats() {
//     const response = await fetch(`${API_BASE_URL}/employees/stats/overview`, {
//       headers: this.getAuthHeaders()
//     });
//     return this.handleResponse<{ success: boolean; stats: any }>(response);
//   }

//   // Payroll API calls
//   async getPayrolls() {
//     const response = await fetch(`${API_BASE_URL}/payroll`, {
//       headers: this.getAuthHeaders()
//     });
//     return this.handleResponse<{ success: boolean; payrolls: any[]; total: number }>(response);
//   }

//   async getPayroll(id: string) {
//     const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
//       headers: this.getAuthHeaders()
//     });
//     return this.handleResponse<{ success: boolean; payroll: any }>(response);
//   }

//   async createPayroll(payrollData: any) {
//     const response = await fetch(`${API_BASE_URL}/payroll`, {
//       method: 'POST',
//       headers: this.getAuthHeaders(),
//       body: JSON.stringify(payrollData)
//     });
//     return this.handleResponse<{ success: boolean; message: string; payroll: any; calculations: any }>(response);
//   }

//   async updatePayroll(id: string, payrollData: any) {
//     const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
//       method: 'PUT',
//       headers: this.getAuthHeaders(),
//       body: JSON.stringify(payrollData)
//     });
//     return this.handleResponse<{ success: boolean; message: string; calculations: any }>(response);
//   }

//   async processPayroll(id: string) {
//     const response = await fetch(`${API_BASE_URL}/payroll/${id}/process`, {
//       method: 'PATCH',
//       headers: this.getAuthHeaders()
//     });
//     return this.handleResponse<{ success: boolean; message: string }>(response);
//   }

//   async deletePayroll(id: string) {
//     const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
//       method: 'DELETE',
//       headers: this.getAuthHeaders()
//     });
//     return this.handleResponse<{ success: boolean; message: string }>(response);
//   }

//   async calculatePayroll(payrollData: any) {
//     const response = await fetch(`${API_BASE_URL}/payroll/calculate`, {
//       method: 'POST',
//       headers: this.getAuthHeaders(),
//       body: JSON.stringify(payrollData)
//     });
//     return this.handleResponse<{ success: boolean; calculations: any; breakdown: any }>(response);
//   }

//   async getPayrollStats() {
//     const response = await fetch(`${API_BASE_URL}/payroll/stats/overview`, {
//       headers: this.getAuthHeaders()
//     });
//     return this.handleResponse<{ success: boolean; stats: any }>(response);
//   }

//   // Dashboard API calls
//   async getDashboardStats() {
//     try {
//       const [employeeStats, payrollStats] = await Promise.all([
//         this.getEmployeeStats(),
//         this.getPayrollStats()
//       ]);

//       return {
//         success: true,
//         employeeStats: employeeStats.stats,
//         payrollStats: payrollStats.stats
//       };
//     } catch (error) {
//       console.error('Error fetching dashboard stats:', error);
//       throw error;
//     }
//   }
// }

// export const apiService = new ApiService();

const API_BASE_URL = "https://tgs-bpo-payroll.onrender.com/api"
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"
const NODE_ENV = process.env.NODE_ENV || "development"

class ApiService {
  private async retryFetch(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
    let lastError: Error = new Error('Unknown error');
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        return response;
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries) {
          console.warn(`API call failed (attempt ${i + 1}/${maxRetries + 1}):`, error);
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    // Provide a more user-friendly error message with environment awareness
    const backendUrl = NODE_ENV === 'development' ? API_BASE_URL : 'backend server';
    const errorMessage = lastError.message.includes('fetch') 
      ? `Cannot connect to backend server. Please ensure the backend is running on ${backendUrl}`
      : `Network error: ${lastError.message}`;
    
    if (NODE_ENV === 'development') {
      console.error(`API Service Error:`, { url, error: lastError, environment: NODE_ENV });
    }
    
    throw new Error(errorMessage);
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (parseError) {
        // If JSON parsing fails, use the status-based message
        console.warn('Failed to parse error response:', parseError);
      }
      
      // Add more specific error messages
      if (response.status === 404) {
        errorMessage = 'Resource not found. Please check if the backend server is running.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again or contact support.';
      } else if (response.status === 0 || !response.status) {
        errorMessage = 'Network error. Please check if the backend server is running on http://localhost:5000';
      }
      
      throw new Error(errorMessage);
    }
    return response.json()
  }

  // Employee API calls
  async getEmployees() {
    const response = await this.retryFetch(`${API_BASE_URL}/employees`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; employees: any[]; total: number }>(response)
  }

  async getEmployee(id: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/employees/${id}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; employee: any }>(response)
  }

  async createEmployee(employeeData: any) {
    const response = await this.retryFetch(`${API_BASE_URL}/employees`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData),
    })
    return this.handleResponse<{ success: boolean; message: string; employee: any }>(response)
  }

  async updateEmployee(id: string, employeeData: any) {
    const response = await this.retryFetch(`${API_BASE_URL}/employees/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData),
    })
    return this.handleResponse<{ success: boolean; message: string }>(response)
  }

  async deleteEmployee(id: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/employees/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; message: string }>(response)
  }

  async getEmployeeStats() {
    const response = await this.retryFetch(`${API_BASE_URL}/employees/stats/overview`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; stats: any }>(response)
  }

  async bulkImportEmployees(employeesData: any[]) {
    const response = await this.retryFetch(`${API_BASE_URL}/employees/bulk-import`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ employees: employeesData }),
    })
    return this.handleResponse<{ success: boolean; message: string; imported: number; errors: any[] }>(response)
  }

  // Payroll API calls
  async getPayrolls() {
    const response = await this.retryFetch(`${API_BASE_URL}/payroll`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; payrolls: any[]; total: number }>(response)
  }

  async getPayroll(id: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/payroll/${id}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; payroll: any }>(response)
  }

  async createPayroll(payrollData: any) {
    const response = await this.retryFetch(`${API_BASE_URL}/payroll`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payrollData),
    })
    return this.handleResponse<{ success: boolean; message: string; payroll: any; calculations: any }>(response)
  }

  async updatePayroll(id: string, payrollData: any) {
    const response = await this.retryFetch(`${API_BASE_URL}/payroll/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payrollData),
    })
    return this.handleResponse<{ success: boolean; message: string; calculations: any }>(response)
  }

  async processPayroll(id: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/payroll/${id}/process`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; message: string }>(response)
  }

  async deletePayroll(id: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/payroll/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; message: string }>(response)
  }

  async calculatePayroll(payrollData: any) {
    const apiCall = async () => {
      const response = await fetch(`${API_BASE_URL}/payroll/calculate`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payrollData),
      })
      return this.handleResponse<{ success: boolean; calculations: any; breakdown: any }>(response)
    }

    // Fallback calculation when API is not available
    const fallbackCalculation = () => {
      const basicSalary = Number.parseFloat(payrollData.basicSalary) || 0
      const overtimeHours = Number.parseFloat(payrollData.overtimeHours) || 0
      const holidayPay = Number.parseFloat(payrollData.holidayPay) || 0
      const nightDifferential = Number.parseFloat(payrollData.nightDifferential) || 0
      const salaryAdjustment = Number.parseFloat(payrollData.salaryAdjustment) || 0
      const absences = Number.parseFloat(payrollData.absences) || 0
      const lateDeductions = Number.parseFloat(payrollData.lateDeductions) || 0

      const sssContribution = Number.parseFloat(payrollData.sssContribution) || 0
      const philhealthContribution = Number.parseFloat(payrollData.philhealthContribution) || 0
      const pagibigContribution = Number.parseFloat(payrollData.pagibigContribution) || 0
      const withholdingTax = Number.parseFloat(payrollData.withholdingTax) || 0

      // Calculate overtime pay
      const workedHours = Number.parseFloat(payrollData.workedHours) || 160
      const hourlyRate = workedHours > 0 ? basicSalary / workedHours : 0
      const overtimePay = overtimeHours * hourlyRate * 1.25

      // Calculate gross pay
      const grossPay =
        Math.round(
          (basicSalary + overtimePay + holidayPay + nightDifferential + salaryAdjustment - absences - lateDeductions) *
            100,
        ) / 100

      // Calculate total deductions
      const totalDeductions =
        Math.round((sssContribution + philhealthContribution + pagibigContribution + withholdingTax) * 100) / 100

      // Calculate net pay
      const netPay = Math.round(Math.max(0, grossPay - totalDeductions) * 100) / 100

      return {
        success: true,
        calculations: {
          grossPay: Math.max(0, grossPay),
          totalDeductions: Math.max(0, totalDeductions),
          netPay: Math.max(0, netPay),
        },
        breakdown: {},
      }
    }

    return this.safeApiCall(apiCall, fallbackCalculation())
  }

  async getPayrollStats() {
    const response = await this.retryFetch(`${API_BASE_URL}/payroll/stats/overview`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; stats: any }>(response)
  }

  // Dashboard API calls
  async getDashboardStats() {
    try {
      const [employeeStats, payrollStats] = await Promise.all([this.getEmployeeStats(), this.getPayrollStats()])

      return {
        success: true,
        employeeStats: employeeStats.stats,
        payrollStats: payrollStats.stats,
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
      throw error
    }
  }

  private async safeApiCall<T>(apiCall: () => Promise<T>, fallbackData: T): Promise<T> {
    try {
      return await apiCall()
    } catch (error) {
      console.warn("API call failed, using fallback data:", error)
      return fallbackData
    }
  }

  // Payslip API calls
  async getPayslips() {
    const response = await this.retryFetch(`${API_BASE_URL}/payslips`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; payslips: any[]; total: number }>(response);
  }

  async generatePayslip(payrollId: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/payslips/generate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ payrollId })
    });
    return this.handleResponse<{ success: boolean; payslip: any; message: string }>(response);
  }

  async downloadPayslip(payslipId: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/payslips/${payslipId}/download`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.arrayBuffer();
  }

  async getPayslip(payslipId: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/payslips/${payslipId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; payslip: any }>(response);
  }

  // Department API calls
  async getDepartments() {
    const response = await this.retryFetch(`${API_BASE_URL}/departments`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; departments: any[] }>(response)
  }

  async getDepartment(id: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/departments/${id}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; department: any }>(response)
  }

  async createDepartment(departmentData: any) {
    const response = await this.retryFetch(`${API_BASE_URL}/departments`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(departmentData),
    })
    return this.handleResponse<{ success: boolean; message: string; department: any }>(response)
  }

  async updateDepartment(id: string, departmentData: any) {
    const response = await this.retryFetch(`${API_BASE_URL}/departments/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(departmentData),
    })
    return this.handleResponse<{ success: boolean; message: string; department: any }>(response)
  }

  async deleteDepartment(id: string) {
    const response = await this.retryFetch(`${API_BASE_URL}/departments/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; message: string }>(response)
  }

  async getDepartmentEmployees(id: string) {
    try {
      console.log(`🔍 Fetching employees for department: ${id}`);
      const response = await this.retryFetch(`${API_BASE_URL}/departments/${id}/employees`, {
        headers: this.getAuthHeaders(),
      })
      const result = await this.handleResponse<{ success: boolean; employees: any[] }>(response);
      console.log(`👥 Got ${result.employees?.length || 0} employees for department ${id}`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching employees for department ${id}:`, error);
      return { success: false, employees: [] };
    }
  }

  async getDepartmentHierarchy() {
    const response = await this.retryFetch(`${API_BASE_URL}/departments/hierarchy/all`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; departments: any[] }>(response)
  }

  async getDepartmentPayrolls(departmentId: string) {
    try {
      console.log(`💰 Fetching payrolls for department: ${departmentId}`);
      const response = await this.retryFetch(`${API_BASE_URL}/departments/${departmentId}/payrolls`, {
        headers: this.getAuthHeaders(),
      })
      const result = await this.handleResponse<{ success: boolean; payrolls: any[] }>(response);
      console.log(`💰 Got ${result.payrolls?.length || 0} payrolls for department ${departmentId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error fetching payrolls for department ${departmentId}:`, error);
      return { success: false, payrolls: [] };
    }
  }

  // Settings API
  async getSettings() {
    try {
      const response = await this.retryFetch(`${API_BASE_URL}/settings`, {
        headers: this.getAuthHeaders(),
      })
      return this.handleResponse<{ success: boolean; settings: any }>(response);
    } catch (error) {
      console.error('❌ Error fetching settings:', error);
      return { 
        success: false, 
        settings: {
          sssRate: 4.5,
          philhealthRate: 2.0,
          pagibigRate: 2.0,
          withholdingTaxRate: 15.0,
          overtimeMultiplier: 1.25,
          nightDiffRate: 10.0,
          holidayRate: 200.0,
          workingHoursPerDay: 8,
          workingDaysPerWeek: 5,
          currency: 'PHP',
          dateFormat: 'MM/DD/YYYY',
          timezone: 'Asia/Manila'
        }
      };
    }
  }

  async updateSettings(settings: any) {
    const response = await this.retryFetch(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(settings),
    })
    return this.handleResponse<{ success: boolean; message: string; settings: any }>(response);
  }

  // Update user profile (email, password, name)
  async updateProfile(data: { email?: string; currentPassword?: string; newPassword?: string; name?: string }) {
    const response = await this.retryFetch(`${API_BASE_URL}/auth/update-profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    })
    return this.handleResponse<{ success: boolean; message: string; user: any; token?: string }>(response);
  }

  // Export API calls
  async exportTemplate(): Promise<Blob> {
    const token = localStorage.getItem('token');
    const url = `${API_BASE_URL}/export/template`;
    const response = await fetch(url, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.blob();
  }

  async exportTimekeeping(cutoffStart?: string, cutoffEnd?: string): Promise<Blob> {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams();
    if (cutoffStart) params.append('cutoffStart', cutoffStart);
    if (cutoffEnd) params.append('cutoffEnd', cutoffEnd);
    
    const url = `${API_BASE_URL}/export/timekeeping${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.blob();
  }

  // Import API calls
  async importTimekeepingPreview(fileData: string): Promise<{
    success: boolean;
    data: {
      sheets: Record<string, { headers: string[]; rows: any[][]; rowCount: number }>;
      sheetNames: string[];
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/export/import-preview`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ fileData }),
    });
    return this.handleResponse(response);
  }

  async importTimekeeping(fileData: string, cutoffStart: string, cutoffEnd: string): Promise<{
    success: boolean;
    message: string;
    results: {
      created: number;
      updated: number;
      errors: string[];
      processed: any[];
    };
  }> {
    const response = await fetch(`${API_BASE_URL}/export/import`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ fileData, cutoffStart, cutoffEnd }),
    });
    return this.handleResponse(response);
  }

  // Imported Payroll Files API calls
  async saveImportedPayroll(fileData: string, cutoffStart: string, cutoffEnd: string, fileName?: string): Promise<{
    success: boolean;
    message: string;
    importedPayroll: any;
  }> {
    const response = await fetch(`${API_BASE_URL}/export/imported-payrolls`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ fileData, cutoffStart, cutoffEnd, fileName }),
    });
    return this.handleResponse(response);
  }

  async getImportedPayrolls(): Promise<{
    success: boolean;
    importedPayrolls: any[];
  }> {
    const response = await fetch(`${API_BASE_URL}/export/imported-payrolls`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getImportedPayroll(id: string): Promise<{
    success: boolean;
    importedPayroll: any;
  }> {
    const response = await fetch(`${API_BASE_URL}/export/imported-payrolls/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async deleteImportedPayroll(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/export/imported-payrolls/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async exportImportedPayroll(id: string): Promise<Blob> {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/export/imported-payrolls/${id}/export`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.blob();
  }
}

export const apiService = new ApiService()
