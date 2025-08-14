"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PayrollPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [payrollData, setPayrollData] = useState({
    employeeId: "",
    employeeName: "",
    cutoffStart: "",
    cutoffEnd: "",
    basicSalary: 0,
    workedHours: 0,
    overtimeHours: 0,
    holidayPay: 0,
    nightDifferential: 0,
    salaryAdjustment: 0,
    absences: 0,
    lateDeductions: 0,
    sssContribution: 0,
    philhealthContribution: 0,
    pagibigContribution: 0,
    withholdingTax: 0,
    grossPay: 0,
    totalDeductions: 0,
    netPay: 0
  });
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
    setLoading(false);
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    setPayrollData(prev => ({
      ...prev,
      [name]: numValue
    }));
  };

  const calculatePayroll = () => {
    const grossPay = payrollData.basicSalary + 
                    payrollData.holidayPay + 
                    payrollData.nightDifferential + 
                    payrollData.salaryAdjustment - 
                    payrollData.absences - 
                    payrollData.lateDeductions;

    const totalDeductions = payrollData.sssContribution + 
                           payrollData.philhealthContribution + 
                           payrollData.pagibigContribution + 
                           payrollData.withholdingTax;

    const netPay = grossPay - totalDeductions;

    setPayrollData(prev => ({
      ...prev,
      grossPay,
      totalDeductions,
      netPay
    }));
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">TGS PAYROLL SYSTEM</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-100 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => router.push('/admin')}
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Payroll Processing</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user.name || user.email}</span>
              <button 
                onClick={() => {
                  localStorage.removeItem('user');
                  router.push('/');
                }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 px-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Process Payroll</h2>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee Name</label>
                <input
                  type="text"
                  name="employeeName"
                  value={payrollData.employeeName}
                  onChange={(e) => setPayrollData(prev => ({ ...prev, employeeName: e.target.value }))}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Basic Salary</label>
                <input
                  type="number"
                  name="basicSalary"
                  value={payrollData.basicSalary}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Worked Hours</label>
                <input
                  type="number"
                  name="workedHours"
                  value={payrollData.workedHours}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            {/* Additional Earnings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Additional Earnings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Overtime Hours</label>
                <input
                  type="number"
                  name="overtimeHours"
                  value={payrollData.overtimeHours}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Holiday Pay</label>
                <input
                  type="number"
                  name="holidayPay"
                  value={payrollData.holidayPay}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Night Differential</label>
                <input
                  type="number"
                  name="nightDifferential"
                  value={payrollData.nightDifferential}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Deductions</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SSS Contribution</label>
                <input
                  type="number"
                  name="sssContribution"
                  value={payrollData.sssContribution}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PhilHealth</label>
                <input
                  type="number"
                  name="philhealthContribution"
                  value={payrollData.philhealthContribution}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pag-IBIG</label>
                <input
                  type="number"
                  name="pagibigContribution"
                  value={payrollData.pagibigContribution}
                  onChange={handleInputChange}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <div className="mt-8">
            <button
              onClick={calculatePayroll}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"
            >
              Calculate Payroll
            </button>
          </div>

          {/* Results */}
          {payrollData.grossPay > 0 && (
            <div className="mt-8 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payroll Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Gross Pay</p>
                  <p className="text-xl font-bold text-gray-900">₱{payrollData.grossPay.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Deductions</p>
                  <p className="text-xl font-bold text-red-600">₱{payrollData.totalDeductions.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Pay</p>
                  <p className="text-xl font-bold text-green-600">₱{payrollData.netPay.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
