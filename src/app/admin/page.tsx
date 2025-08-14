"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const router = useRouter();

  // Sample data for charts
  const monthlyPayrollData = [
    { month: 'Jan', amount: 45000 },
    { month: 'Feb', amount: 52000 },
    { month: 'Mar', amount: 48000 },
    { month: 'Apr', amount: 55000 },
    { month: 'May', amount: 58000 },
    { month: 'Jun', amount: 62000 },
  ];

  const employeeDistribution = [
    { department: 'IT', count: 8 },
    { department: 'HR', count: 5 },
    { department: 'Finance', count: 6 },
    { department: 'Operations', count: 12 },
    { department: 'Sales', count: 9 },
  ];

  const payrollTrends = [
    { month: 'Jan', total: 45000, processed: 42000 },
    { month: 'Feb', total: 52000, processed: 50000 },
    { month: 'Mar', total: 48000, processed: 46000 },
    { month: 'Apr', total: 55000, processed: 53000 },
    { month: 'May', total: 58000, processed: 56000 },
    { month: 'Jun', total: 62000, processed: 60000 },
  ];

  const totalEmployees = employeeDistribution.reduce((sum, dept) => sum + dept.count, 0);
  const totalPayroll = monthlyPayrollData[monthlyPayrollData.length - 1]?.amount || 0;
  const pendingReports = 3;

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

	if (!user) {
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        user={user}
      />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'employees' && 'Employee Management'}
              {activeTab === 'payroll' && 'Payroll Processing'}
              {activeTab === 'reports' && 'Reports & Payslips'}
            </h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Welcome back, {user.name || user.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
                      <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div className="ml-4 flex-1">
                      <dt className="text-sm font-medium text-gray-600">Total Employees</dt>
                      <dd className="text-2xl font-bold text-gray-800">{totalEmployees}</dd>
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl group-hover:from-emerald-100 group-hover:to-emerald-200 transition-all duration-300">
                      <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4 flex-1">
                      <dt className="text-sm font-medium text-gray-600">Total Payroll</dt>
                      <dd className="text-2xl font-bold text-gray-800">₱{totalPayroll.toLocaleString()}</dd>
                    </div>
                  </div>
                </div>

                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-6 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl group-hover:from-amber-100 group-hover:to-amber-200 transition-all duration-300">
                      <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4 flex-1">
                      <dt className="text-sm font-medium text-gray-600">Pending Reports</dt>
                      <dd className="text-2xl font-bold text-gray-800">{pendingReports}</dd>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Payroll Bar Chart */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-8 hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full mr-3"></div>
                    Monthly Payroll Trend
                  </h3>
                  <div className="h-72 flex items-end justify-between space-x-3">
                    {monthlyPayrollData.map((data, index) => {
                      const maxAmount = Math.max(...monthlyPayrollData.map(d => d.amount));
                      const height = (data.amount / maxAmount) * 100;
                      return (
                        <div key={index} className="flex flex-col items-center flex-1 group">
                          <div className="text-sm font-medium text-gray-600 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            ₱{(data.amount / 1000).toFixed(0)}k
                          </div>
                          <div 
                            className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                            style={{ height: `${height}%` }}
                          ></div>
                          <div className="text-sm font-medium text-gray-700 mt-2">{data.month}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Employee Distribution Pie Chart */}
                <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-8 hover:shadow-md transition-shadow duration-300">
                  <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                    <div className="w-2 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full mr-3"></div>
                    Employee Distribution
                  </h3>
                  <div className="h-72 flex items-center justify-center">
                    <div className="relative w-56 h-56">
                      {employeeDistribution.map((dept, index) => {
                        const total = employeeDistribution.reduce((sum, d) => sum + d.count, 0);
                        const percentage = (dept.count / total) * 100;
                        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                        const startAngle = employeeDistribution
                          .slice(0, index)
                          .reduce((sum, d) => sum + (d.count / total) * 360, 0);
                        
                        return (
                          <div key={index} className="absolute inset-0 flex items-center justify-center">
                            <div 
                              className="w-40 h-40 rounded-full border-8 shadow-sm"
                              style={{
                                borderColor: colors[index],
                                transform: `rotate(${startAngle}deg)`,
                                clipPath: `polygon(50% 50%, 50% 0%, ${50 + percentage * 0.5}% 0%, ${50 + percentage * 0.5}% 50%)`
                              }}
                            ></div>
                          </div>
                        );
                      })}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-gray-800">{totalEmployees}</div>
                          <div className="text-sm text-gray-500 font-medium">Total</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {employeeDistribution.map((dept, index) => {
                      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                      return (
                        <div key={index} className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                          <div 
                            className="w-4 h-4 rounded-full mr-3 shadow-sm"
                            style={{ backgroundColor: colors[index] }}
                          ></div>
                          <span className="text-sm font-medium text-gray-700">{dept.department}: {dept.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Payroll Processing Line Chart */}
              <div className="bg-white shadow-sm border border-gray-100 rounded-xl p-8 hover:shadow-md transition-shadow duration-300">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
                  <div className="w-2 h-8 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full mr-3"></div>
                  Payroll Processing Status
                </h3>
                <div className="h-72 flex items-end justify-between space-x-4">
                  {payrollTrends.map((data, index) => {
                    const maxAmount = Math.max(...payrollTrends.map(d => d.total));
                    const totalHeight = (data.total / maxAmount) * 100;
                    const processedHeight = (data.processed / maxAmount) * 100;
                    
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 group">
                        <div className="text-sm font-medium text-gray-600 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          ₱{(data.total / 1000).toFixed(0)}k
                        </div>
                        <div className="w-full flex flex-col items-center space-y-1">
                          <div 
                            className="w-full bg-gradient-to-t from-red-400 to-red-300 rounded-t-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                            style={{ height: `${totalHeight}%` }}
                            title={`Total: ₱${data.total.toLocaleString()}`}
                          ></div>
                          <div 
                            className="w-full bg-gradient-to-t from-emerald-400 to-emerald-300 rounded-t-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                            style={{ height: `${processedHeight}%` }}
                            title={`Processed: ₱${data.processed.toLocaleString()}`}
                          ></div>
                        </div>
                        <div className="text-sm font-medium text-gray-700 mt-2">{data.month}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 flex justify-center space-x-8">
                  <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-red-300 rounded mr-3 shadow-sm"></div>
                    <span className="text-sm font-medium text-gray-700">Total Payroll</span>
                  </div>
                  <div className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-300 rounded mr-3 shadow-sm"></div>
                    <span className="text-sm font-medium text-gray-700">Processed</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employee Management Tab */}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Employee List</h3>
                  <p className="text-sm text-gray-500">Manage your employees and their information</p>
                </div>
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                  Add New Employee
                </button>
              </div>
              
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No employees</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding your first employee.</p>
                    <div className="mt-6">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                        Add Employee
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payroll Processing Tab */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Payroll Processing</h3>
                  <p className="text-sm text-gray-500">Calculate and process employee payroll</p>
                </div>
                <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                  Process Payroll
                </button>
              </div>
              
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No payroll data</h3>
                    <p className="mt-1 text-sm text-gray-500">Start processing payroll for your employees.</p>
                    <div className="mt-6">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                        Process Payroll
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reports & Payslips Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Reports & Payslips</h3>
                  <p className="text-sm text-gray-500">Generate and view payroll reports and payslips</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                  Generate Report
                </button>
              </div>
              
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-center text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No reports available</h3>
                    <p className="mt-1 text-sm text-gray-500">Generate reports and payslips for your payroll data.</p>
                    <div className="mt-6">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                        Generate Report
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
} 