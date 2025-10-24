"use client";
import React, { useMemo } from "react";
import DashboardKPI from "./KPI/DashboardKPI";

interface DashboardProps {
  monthlyPayrollData: any[];
  employeeDistribution: any[];
  totalEmployees: number;
  totalPayroll: number;
  pendingReports: number;
  processedCount: number;
  completedCount: number;
  activityTimestamps: {
    payrollProcessed: Date;
    newEmployee: Date;
    payrollUpdated: Date;
  };
  activeTimeFilter: 'today' | 'week' | 'month';
  setActiveTimeFilter: (filter: 'today' | 'week' | 'month') => void;
  getRelativeTime: (timestamp: Date) => string;
  getFilteredActivities: () => any[];
  departments: any[];
  payrolls: any[];
  employees: any[];
}

export default function Dashboard({
  monthlyPayrollData,
  employeeDistribution,
  totalEmployees,
  totalPayroll,
  pendingReports,
  processedCount,
  completedCount,
  activityTimestamps,
  activeTimeFilter,
  setActiveTimeFilter,
  getRelativeTime,
  getFilteredActivities,
  departments,
  payrolls,
  employees
}: DashboardProps) {
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

  return (
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
        {/* Left Column - Payroll Trend and Employee Growth */}
        <div className="xl:col-span-2 space-y-6">
          {/* Payroll Trend Chart */}
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
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
          
          {/* Employee Growth Chart - Separate Box Below Payroll Trend */}
          <DashboardKPI 
            departments={departments}
            payrolls={payrolls}
            employees={employees}
            showEmployeeGrowth={true}
            showOtherKPIs={false}
            showPayrollStatus={false}
          />
          
          {/* Department Distribution Chart - Below Employee Growth */}
          <DashboardKPI 
            departments={departments}
            payrolls={payrolls}
            employees={employees}
            showEmployeeGrowth={false}
            showOtherKPIs={true}
            showPayrollStatus={false}
          />
        </div>

        {/* Right Column - Recent Activity and Payroll Status */}
        <div className="space-y-6">
          {/* Recent Activity Panel */}
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

          {/* Payroll Status Chart - Below Recent Activity */}
          <DashboardKPI 
            departments={departments}
            payrolls={payrolls}
            employees={employees}
            showEmployeeGrowth={false}
            showOtherKPIs={false}
            showPayrollStatus={true}
          />
        </div>
      </div>
    </div>
  );
}
