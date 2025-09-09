"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Dashboard from "../components/Dashboard";
import EmployeeManagement from "../components/EmployeeManagement";
import PayrollProcessing from "../components/PayrollProcessing";
import Reports from "../components/Reports";
import { apiService } from "../services/api";

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
      payrollProcessed: new Date(0), // 1970-01-01 - won't show up until actual activity
      newEmployee: new Date(0), // 1970-01-01 - won't show up until actual activity
      payrollUpdated: new Date(0), // 1970-01-01 - won't show up until actual activity
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

  // Function to clear activity history
  const clearActivityHistory = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('activityTimestamps');
      // Reset timestamps to very old dates so they don't show up
      setActivityTimestamps({
        payrollProcessed: new Date(0), // 1970-01-01
        newEmployee: new Date(0), // 1970-01-01
        payrollUpdated: new Date(0), // 1970-01-01
      });
    }
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

    // Filter out activities with very old timestamps (cleared activities)
    const validActivities = activities.filter(activity => {
      // Check if timestamp is not from 1970 (cleared timestamp)
      const isCleared = activity.timestamp.getTime() === 0;
      return !isCleared;
    });

    return validActivities.filter(activity => {
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
      
      // Check if database is empty or has no meaningful data
      const hasEmployees = data.employeeStats?.totalEmployees > 0;
      const hasPayrolls = data.payrollStats?.processedPayrolls > 0 || data.payrollStats?.completedPayrolls > 0;
      const hasPayrollData = data.payrollStats?.monthlyPayrollData?.length > 0;
      
      // If database is empty, clear activity timestamps
      if (!hasEmployees && !hasPayrolls && !hasPayrollData) {
        clearActivityHistory();
        return;
      }
      
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

  // Handle search results from header
  const handleSearchResult = (type: string, id: string) => {
    setActiveTab(type);
    // You can add additional logic here to highlight specific items
    // For example, scroll to a specific employee, payroll, or payslip
    console.log(`Search result: ${type} with ID: ${id}`);
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
        <Header activeTab={activeTab} currentTime={currentTime} onSearchResult={handleSearchResult} />

        {/* Page Content */}
        <main className="p-6">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <Dashboard
              monthlyPayrollData={monthlyPayrollData}
              employeeDistribution={employeeDistribution}
              totalEmployees={totalEmployees}
              totalPayroll={totalPayroll}
              pendingReports={pendingReports}
              processedCount={processedCount}
              completedCount={completedCount}
              activityTimestamps={activityTimestamps}
              activeTimeFilter={activeTimeFilter}
              setActiveTimeFilter={setActiveTimeFilter}
              getRelativeTime={getRelativeTime}
              getFilteredActivities={getFilteredActivities}
            />
          )}

          {/* Employee Management Tab */}
          {activeTab === 'employees' && (
            <EmployeeManagement onEmployeeChange={fetchDashboardData} />
          )}

          {/* Payroll Processing Tab */}
          {activeTab === 'payroll' && (
            <PayrollProcessing 
              onPayrollStatusChange={handlePayrollStatusChange} 
              onPayrollChange={fetchDashboardData}
            />
          )}

          {/* Reports & Payslips Tab */}
          {activeTab === 'reports' && (
            <Reports />
          )}

        </main>
      </div>
    </div>
  );
} 