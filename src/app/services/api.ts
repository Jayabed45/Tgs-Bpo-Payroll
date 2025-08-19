const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Employee API calls
  async getEmployees() {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; employees: any[]; total: number }>(response);
  }

  async getEmployee(id: string) {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; employee: any }>(response);
  }

  async createEmployee(employeeData: any) {
    const response = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData)
    });
    return this.handleResponse<{ success: boolean; message: string; employee: any }>(response);
  }

  async updateEmployee(id: string, employeeData: any) {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(employeeData)
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  async deleteEmployee(id: string) {
    const response = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  async getEmployeeStats() {
    const response = await fetch(`${API_BASE_URL}/employees/stats/overview`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; stats: any }>(response);
  }

  // Payroll API calls
  async getPayrolls() {
    const response = await fetch(`${API_BASE_URL}/payroll`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; payrolls: any[]; total: number }>(response);
  }

  async getPayroll(id: string) {
    const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; payroll: any }>(response);
  }

  async createPayroll(payrollData: any) {
    const response = await fetch(`${API_BASE_URL}/payroll`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payrollData)
    });
    return this.handleResponse<{ success: boolean; message: string; payroll: any; calculations: any }>(response);
  }

  async updatePayroll(id: string, payrollData: any) {
    const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payrollData)
    });
    return this.handleResponse<{ success: boolean; message: string; calculations: any }>(response);
  }

  async processPayroll(id: string) {
    const response = await fetch(`${API_BASE_URL}/payroll/${id}/process`, {
      method: 'PATCH',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  async deletePayroll(id: string) {
    const response = await fetch(`${API_BASE_URL}/payroll/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; message: string }>(response);
  }

  async calculatePayroll(payrollData: any) {
    const response = await fetch(`${API_BASE_URL}/payroll/calculate`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payrollData)
    });
    return this.handleResponse<{ success: boolean; calculations: any; breakdown: any }>(response);
  }

  async getPayrollStats() {
    const response = await fetch(`${API_BASE_URL}/payroll/stats/overview`, {
      headers: this.getAuthHeaders()
    });
    return this.handleResponse<{ success: boolean; stats: any }>(response);
  }

  // Dashboard API calls
  async getDashboardStats() {
    try {
      const [employeeStats, payrollStats] = await Promise.all([
        this.getEmployeeStats(),
        this.getPayrollStats()
      ]);

      return {
        success: true,
        employeeStats: employeeStats.stats,
        payrollStats: payrollStats.stats
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
