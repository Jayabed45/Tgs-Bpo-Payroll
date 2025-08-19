"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import { apiService } from "../services/api";
import EmployeeManagement from "../components/EmployeeManagement";
import PayrollProcessing from "../components/PayrollProcessing";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const router = useRouter();

  // Real data from backend
  const [monthlyPayrollData, setMonthlyPayrollData] = useState<any[]>([]);
  const [employeeDistribution, setEmployeeDistribution] = useState<any[]>([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Activity timestamps for dynamic relative time - load from localStorage or use defaults
  const [activityTimestamps, setActivityTimestamps] = useState(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activityTimestamps');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            payrollProcessed: new Date(parsed.payrollProcessed),
            newEmployee: new Date(parsed.newEmployee),
            payrollUpdated: new Date(parsed.payrollUpdated),
          };
        } catch (error) {
          console.error('Error parsing saved timestamps:', error);
        }
      }
    }
    return {
      payrollProcessed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      newEmployee: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      payrollUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    };
  });

  // Track previous values to detect actual changes
  const [previousValues, setPreviousValues] = useState({
    processedCount: 0,
    totalEmployees: 0,
  });

  // Time filter state
  const [activeTimeFilter, setActiveTimeFilter] = useState<'today' | 'week' | 'month'>('today');

  // Function to update activity timestamps when new activities occur
  const updateActivityTimestamp = (activityType: 'payrollProcessed' | 'newEmployee' | 'payrollUpdated') => {
    setActivityTimestamps(prev => {
      const newTimestamps = {
        ...prev,
        [activityType]: new Date() // Set to current time
      };
      
      // Save to localStorage only in browser environment
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('activityTimestamps', JSON.stringify({
            payrollProcessed: newTimestamps.payrollProcessed.toISOString(),
            newEmployee: newTimestamps.newEmployee.toISOString(),
            payrollUpdated: newTimestamps.payrollUpdated.toISOString(),
          }));
        } catch (error) {
          console.error('Error saving timestamps to localStorage:', error);
        }
      }
      
      return newTimestamps;
    });
  };

  // Function to manually trigger activity updates (call this when actual activities occur)
  const triggerActivityUpdate = (activityType: 'payrollProcessed' | 'newEmployee' | 'payrollUpdated') => {
    updateActivityTimestamp(activityType);
  };

  // Function to handle payroll status changes
  const handlePayrollStatusChange = async () => {
    // Refresh dashboard data
    await fetchDashboardData();
    
    // Update activity timestamp for payroll processing
    updateActivityTimestamp('payrollProcessed');
  };

  // Function to filter activities based on time period
  const getFilteredActivities = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activities = [
      {
        type: 'payrollProcessed',
        timestamp: activityTimestamps.payrollProcessed,
        title: 'Payroll Processed',
        description: 'Employee payroll completed',
        color: 'emerald'
      },
      {
        type: 'newEmployee',
        timestamp: activityTimestamps.newEmployee,
        title: 'New Employee Added',
        description: 'Added to payroll system',
        color: 'blue'
      },
      {
        type: 'payrollUpdated',
        timestamp: activityTimestamps.payrollUpdated,
        title: 'Payroll Updated',
        description: 'Draft payroll modified',
        color: 'amber'
      }
    ];

    return activities.filter(activity => {
      switch (activeTimeFilter) {
        case 'today':
          return activity.timestamp >= today;
        case 'week':
          return activity.timestamp >= weekAgo;
        case 'month':
          return activity.timestamp >= monthAgo;
        default:
          return true;
      }
    });
  };



  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      router.push('/');
      return;
    }
    
    setUser(JSON.parse(userData));
    fetchDashboardData();
    
    // Update clock every second
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    // Cleanup interval on component unmount
    return () => {
      clearInterval(clockInterval);
    };
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDashboardStats();
      
      setDashboardData(data);
      
      // Set employee stats
      if (data.employeeStats) {
        const newTotalEmployees = data.employeeStats.totalEmployees || 0;
        setTotalEmployees(newTotalEmployees);
        setEmployeeDistribution(data.employeeStats.departmentDistribution || []);
        
        // Update timestamp only if new employees were actually added (not on page refresh)
        if (newTotalEmployees > previousValues.totalEmployees && previousValues.totalEmployees > 0) {
          updateActivityTimestamp('newEmployee');
        }
      }
      
      // Set payroll stats
      if (data.payrollStats) {
        const newProcessedCount = data.payrollStats.processedPayrolls || 0;
        setPendingReports(data.payrollStats.pendingPayrolls || 0);
        setProcessedCount(newProcessedCount);
        setCompletedCount(data.payrollStats.completedPayrolls || 0);
        setMonthlyPayrollData(data.payrollStats.monthlyPayrollData || []);
        
        // Calculate total payroll from monthly data
        const total = data.payrollStats.monthlyPayrollData?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0;
        setTotalPayroll(total);
        
        // Update timestamp only if new payrolls were actually processed (not on page refresh)
        if (newProcessedCount > previousValues.processedCount && previousValues.processedCount > 0) {
          updateActivityTimestamp('payrollProcessed');
        }
      }
      
      // Update previous values for next comparison
      setPreviousValues({
        processedCount: data.payrollStats?.processedPayrolls || 0,
        totalEmployees: data.employeeStats?.totalEmployees || 0,
      });
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback to sample data if API fails
      setMonthlyPayrollData([
        { month: '2024-07', amount: 45000, count: 8 },
        { month: '2024-08', amount: 52000, count: 9 },
        { month: '2024-09', amount: 48000, count: 7 },
        { month: '2024-10', amount: 55000, count: 10 },
        { month: '2024-11', amount: 58000, count: 11 },
        { month: '2024-12', amount: 62000, count: 9 },
      ]);
      setEmployeeDistribution([
        { department: 'IT', count: 8 },
        { department: 'HR', count: 5 },
        { department: 'Finance', count: 6 },
        { department: 'Operations', count: 12 },
        { department: 'Sales', count: 9 },
      ]);
      setTotalEmployees(40);
      setTotalPayroll(62000);
      setPendingReports(3);
      setProcessedCount(12);
      setCompletedCount(24);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/');
  };

  // Function to calculate relative time
  const getRelativeTime = (timestamp: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  // Derived metrics for cards and chart
  const thisMonth = useMemo(() => monthlyPayrollData[monthlyPayrollData.length - 1], [monthlyPayrollData]);
  const prevMonth = useMemo(() => monthlyPayrollData[monthlyPayrollData.length - 2], [monthlyPayrollData]);
  const monthDeltaPct = useMemo(() => {
    if (!thisMonth || !prevMonth || !prevMonth.amount) return 0;
    return Number((((thisMonth.amount - prevMonth.amount) / prevMonth.amount) * 100).toFixed(2));
  }, [thisMonth, prevMonth]);

  const averageNetPay = useMemo(() => {
    const totalAmount = monthlyPayrollData.reduce((s, m) => s + (m.amount || 0), 0);
    const totalCount = monthlyPayrollData.reduce((s, m) => s + (m.count || 0), 0);
    if (!totalAmount || !totalCount) return 0;
    return Math.round(totalAmount / totalCount);
  }, [monthlyPayrollData]);

  // Build line chart data from monthlyPayrollData
  const lineChart = useMemo(() => {
    const values = monthlyPayrollData.map((m) => m.amount || 0);
    const labels = monthlyPayrollData.map((m) => m.month);
    if (!values.length) return { path: '', labels, points: [], width: 700, height: 240, padding: 20 };
    
    const width = 700;
    const height = 240;
    const padding = 40;
    const max = Math.max(...values);
    const min = Math.min(...values, 0);
    const range = max - min;
    const norm = (v: number) => range === 0 ? 0.5 : (v - min) / range;

    const points = values.map((v, i) => {
      const x = padding + (i * (width - padding * 2)) / (values.length - 1 || 1);
      const y = height - padding - norm(v) * (height - padding * 2);
      return { x, y, value: v };
    });

    const linePath = points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'} ${point.x},${point.y}`
    ).join(' ');

    // Generate Y-axis labels
    const yAxisLabels = [];
    const numYLabels = 5;
    for (let i = 0; i <= numYLabels; i++) {
      const value = min + (range * i) / numYLabels;
      const y = height - padding - (i * (height - padding * 2)) / numYLabels;
      yAxisLabels.push({ value: Math.round(value), y });
    }

    return { 
      path: linePath, 
      labels, 
      points, 
      width, 
      height, 
      padding,
      yAxisLabels,
      max,
      min
    };
  }, [monthlyPayrollData]);

	if (!user || loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
					<h1 className="text-2xl font-bold text-gray-900 mb-2">TGS PAYROLL SYSTEM</h1>
					<p className="text-gray-600">Loading dashboard data...</p>
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
            <div className="flex items-center space-x-6">
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'employees' && 'Employee Management'}
                {activeTab === 'payroll' && 'Payroll Processing'}
                {activeTab === 'reports' && 'Reports & Payslips'}
              </h2>
              
              {/* Breadcrumb */}
              <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-500">
                <span>Home</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-gray-900 font-medium capitalize">{activeTab}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Search Bar */}
              <div className="hidden md:flex items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 hover:border-gray-300 transition-colors">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/>
                </svg>
                <input 
                  className="bg-transparent outline-none text-sm ml-3 w-64 placeholder-gray-400" 
                  placeholder="Search or type command..." 
                />
              </div>
              
              {/* Clock */}
              <div className="hidden sm:flex items-center space-x-3 rounded-xl px-4 py-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-900">
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour12: true, 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    })}
                  </div>
                  <div className="text-xs text-blue-700">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
              
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
                
                {/* Mobile User Info */}
                <div className="sm:hidden flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Avg Net Pay</p>
                      <p className="text-3xl font-bold text-gray-900">₱{averageNetPay.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-50">
                      <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs">
                    <span className={`px-2 py-1 rounded-full mr-2 ${monthDeltaPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{monthDeltaPct >= 0 ? `+${monthDeltaPct}%` : `${monthDeltaPct}%`}</span>
                    <span className="text-gray-500">Vs last month</span>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Employees</p>
                      <p className="text-3xl font-bold text-gray-900">{totalEmployees}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50">
                      <svg className="w-7 h-7 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500">Active workforce</div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Payroll</p>
                      <p className="text-3xl font-bold text-gray-900">₱{totalPayroll.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50">
                      <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs">
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 mr-2">+{processedCount}</span>
                    <span className="text-gray-500">Processed this period</span>
                  </div>
                </div>
              </div>

              {/* Main graph + stats side panel */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Area Chart */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm xl:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Payroll Trend</h3>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">₱{(thisMonth?.amount || 0).toLocaleString()}</div>
                      <div className="text-xs text-gray-500">This month</div>
                    </div>
                  </div>
                  <div className="relative h-60">
                    <svg viewBox={`0 0 ${lineChart.width || 700} ${lineChart.height || 240}`} preserveAspectRatio="none" className="w-full h-full">
                      {/* Grid lines */}
                      {lineChart.yAxisLabels?.map((label, i) => (
                        <g key={i}>
                          <line 
                            x1={lineChart.padding} 
                            y1={label.y} 
                            x2={lineChart.width - lineChart.padding} 
                            y2={label.y} 
                            stroke="#E5E7EB" 
                            strokeWidth="1" 
                            strokeDasharray="2,2"
                          />
                          <text 
                            x={lineChart.padding - 8} 
                            y={label.y + 4} 
                            textAnchor="end" 
                            className="text-xs fill-gray-500"
                            fontSize="10"
                          >
                            ₱{(label.value / 1000).toFixed(0)}k
                          </text>
                        </g>
                      ))}
                      
                      {/* Line chart */}
                      <path 
                        d={lineChart.path} 
                        stroke="#3B82F6" 
                        strokeWidth="3" 
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Data points */}
                      {lineChart.points?.map((point, i) => (
                        <g key={i}>
                          <circle 
                            cx={point.x} 
                            cy={point.y} 
                            r="4" 
                            fill="#3B82F6" 
                            stroke="white" 
                            strokeWidth="2"
                          />
                          {/* Tooltip on hover */}
                          <circle 
                            cx={point.x} 
                            cy={point.y} 
                            r="8" 
                            fill="transparent" 
                            className="cursor-pointer hover:fill-blue-100 hover:opacity-50"
                          />
                        </g>
                      ))}
                    </svg>
                    
                    {/* X-axis labels */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 flex justify-between text-xs text-gray-500">
                      {lineChart.labels?.map((label, i) => (
                        <span key={i} className="transform -translate-x-1/2" style={{ marginLeft: `${lineChart.padding}px` }}>
                          {(label || '').slice(5)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Side Stats Panel */}
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
                    <div className="text-xs bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setActiveTimeFilter('today')}
                        className={`px-2 py-1 rounded-md transition-all ${
                          activeTimeFilter === 'today'
                            ? 'bg-white shadow-sm text-black font-medium'
                            : 'text-black hover:bg-gray-50'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setActiveTimeFilter('week')}
                        className={`px-2 py-1 rounded-md transition-all ${
                          activeTimeFilter === 'week'
                            ? 'bg-white shadow-sm text-black font-medium'
                            : 'text-black hover:bg-gray-50'
                        }`}
                      >
                        Week
                      </button>
                      <button
                        onClick={() => setActiveTimeFilter('month')}
                        className={`px-2 py-1 rounded-md transition-all ${
                          activeTimeFilter === 'month'
                            ? 'bg-white shadow-sm text-black font-medium'
                            : 'text-black hover:bg-gray-50'
                        }`}
                      >
                        Month
                      </button>
                    </div>
                  </div>



                  <div className="space-y-4">
                    {/* This Week's Activity */}
                    <div className="border-l-4 border-blue-500 pl-3">
                      <div className="text-xs text-gray-500 mb-1">This Week</div>
                      <div className="text-sm font-medium text-gray-900">New Processed Payroll</div>
                      <div className="text-xs text-gray-500">+{processedCount} payrolls processed</div>
                    </div>

                    {/* Recent Activity Items */}
                    <div className="space-y-3">
                      {getFilteredActivities().length > 0 ? (
                        getFilteredActivities().map((activity, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{activity.title}</div>
                              <div className="text-xs text-gray-500">{activity.description}</div>
                            </div>
                            <div className="text-xs text-gray-400">{getRelativeTime(activity.timestamp)}</div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4">
                          <div className="text-sm text-gray-500">No activities in this time period</div>
                        </div>
                      )}
                    </div>

                    {/* Weekly Summary */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-2">Weekly Summary</div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-gray-500">Processed</div>
                          <div className="font-semibold text-gray-900">{processedCount}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Pending</div>
                          <div className="font-semibold text-gray-900">{pendingReports}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Employee Management Tab */}
          {activeTab === 'employees' && (
            <EmployeeManagement />
          )}

          {/* Payroll Processing Tab */}
          {activeTab === 'payroll' && (
            <PayrollProcessing onPayrollStatusChange={handlePayrollStatusChange} />
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