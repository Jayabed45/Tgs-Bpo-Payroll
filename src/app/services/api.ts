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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  // Employee API calls
  async getEmployees() {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; employees: any[]; total: number }>(response)
  }

  async getEmployee(id: string) {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; employee: any }>(response)
  }

  async createEmployee(employeeData: any) {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData),
    })
    return this.handleResponse<{ success: boolean; message: string; employee: any }>(response)
  }

  async updateEmployee(id: string, employeeData: any) {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData),
    })
    return this.handleResponse<{ success: boolean; message: string }>(response)
  }

  async deleteEmployee(id: string) {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; message: string }>(response)
  }

  async getEmployeeStats() {
    const response = await fetch(`${API_BASE_URL}/employees/stats/overview`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; stats: any }>(response)
  }

  // Payroll API calls
  async getPayrolls() {
    const response = await fetch(`${API_BASE_URL}/payroll`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; payrolls: any[]; total: number }>(response)
  }

  async getPayroll(id: string) {
    const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; payroll: any }>(response)
  }

  async createPayroll(payrollData: any) {
    const response = await fetch(`${API_BASE_URL}/payroll`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payrollData),
    })
    return this.handleResponse<{ success: boolean; message: string; payroll: any; calculations: any }>(response)
  }

  async updatePayroll(id: string, payrollData: any) {
    const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payrollData),
    })
    return this.handleResponse<{ success: boolean; message: string; calculations: any }>(response)
  }

  async processPayroll(id: string) {
    const response = await fetch(`${API_BASE_URL}/payroll/${id}/process`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<{ success: boolean; message: string }>(response)
  }

  async deletePayroll(id: string) {
    const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
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
    const response = await fetch(`${API_BASE_URL}/payroll/stats/overview`, {
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
    const response = await fetch(`${API_BASE_URL}/payslips`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; payslips: any[]; total: number }>(response);
  }

  async generatePayslip(payrollId: string) {
    const response = await fetch(`${API_BASE_URL}/payslips/generate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ payrollId })
    });
    return this.handleResponse<{ success: boolean; payslip: any; message: string }>(response);
  }

  async downloadPayslip(payslipId: string) {
    const response = await fetch(`${API_BASE_URL}/payslips/${payslipId}/download`, {
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return response.arrayBuffer();
  }

  async getPayslip(payslipId: string) {
    const response = await fetch(`${API_BASE_URL}/payslips/${payslipId}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; payslip: any }>(response);
  }
}

export const apiService = new ApiService()
