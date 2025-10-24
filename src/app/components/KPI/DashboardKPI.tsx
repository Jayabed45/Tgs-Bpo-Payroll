"use client";
import React, { useMemo } from "react";

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  employeeCount: number;
  payrollCount: number;
}

interface PayrollData {
  id: string;
  status: string;
  netPay: number;
  createdAt: Date;
}

interface EmployeeData {
  id: string;
  name: string;
  hireDate: Date;
  position: string;
  departmentId: string;
}

interface DashboardKPIProps {
  departments: DepartmentData[];
  payrolls: PayrollData[];
  employees: EmployeeData[];
  showEmployeeGrowth?: boolean;
  showOtherKPIs?: boolean;
  showPayrollStatus?: boolean;
}

export default function DashboardKPI({
  departments,
  payrolls,
  employees,
  showEmployeeGrowth = true,
  showOtherKPIs = true,
  showPayrollStatus = true,
}: DashboardKPIProps) {
  // Department KPI: Employee Distribution by Department (Donut Chart)
  const departmentDistribution = useMemo(() => {
    const sorted = [...departments].sort((a, b) => b.employeeCount - a.employeeCount);
    const totalEmployees = sorted.reduce((sum, dept) => sum + dept.employeeCount, 0) || 1;
    
    // Define colors for departments
    const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];
    
    let cumulativePercentage = 0;
    return sorted.map((dept, index) => {
      const percentage = (dept.employeeCount / totalEmployees) * 100;
      const startPercentage = cumulativePercentage;
      cumulativePercentage += percentage;
      
      return {
        name: dept.name,
        code: dept.code,
        count: dept.employeeCount,
        percentage,
        startPercentage,
        endPercentage: cumulativePercentage,
        color: colors[index % colors.length]
      };
    });
  }, [departments]);

  // Payroll KPI: Status Distribution
  const payrollStatusDistribution = useMemo(() => {
    const statusCounts = payrolls.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = payrolls.length || 1;
    const statuses = [
      { name: 'Pending', key: 'pending', color: '#F59E0B', count: statusCounts.pending || 0 },
      { name: 'Processed', key: 'processed', color: '#3B82F6', count: statusCounts.processed || 0 },
      { name: 'Completed', key: 'completed', color: '#10B981', count: statusCounts.completed || 0 },
    ];

    let cumulativePercentage = 0;
    return statuses.map(status => {
      const percentage = (status.count / total) * 100;
      const startPercentage = cumulativePercentage;
      cumulativePercentage += percentage;
      
      return {
        ...status,
        percentage,
        startPercentage,
        endPercentage: cumulativePercentage
      };
    });
  }, [payrolls]);

  // Employee KPI: Growth Trend (last 6 months)
  const employeeGrowthTrend = useMemo(() => {
    const now = new Date();
    const months: { month: string; count: number; label: string }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      
      const count = employees.filter(emp => {
        const hireDate = new Date(emp.hireDate);
        return hireDate <= date;
      }).length;
      
      months.push({ month: monthKey, count, label: monthLabel });
    }

    // Calculate chart dimensions
    const width = 700;
    const height = 240;
    const padding = 40;
    const values = months.map(m => m.count);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const norm = (v: number) => (v - min) / range;

    const points = values.map((v, i) => {
      const x = padding + (i * (width - padding * 2)) / (values.length - 1 || 1);
      const y = height - padding - norm(v) * (height - padding * 2);
      return { x, y, value: v };
    });

    const linePath = points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'} ${point.x},${point.y}`
    ).join(' ');

    // Y-axis labels
    const yAxisLabels = [];
    const numYLabels = 5;
    for (let i = 0; i <= numYLabels; i++) {
      const value = min + (range * i) / numYLabels;
      const y = height - padding - (i * (height - padding * 2)) / numYLabels;
      yAxisLabels.push({ value: Math.round(value), y });
    }

    return {
      months,
      path: linePath,
      points,
      width,
      height,
      padding,
      yAxisLabels,
      currentCount: values[values.length - 1],
      growth: values.length > 1 ? values[values.length - 1] - values[values.length - 2] : 0
    };
  }, [employees]);

  // Calculate donut chart path
  const createDonutPath = (startPercentage: number, endPercentage: number, radius: number, thickness: number) => {
    const startAngle = (startPercentage / 100) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (endPercentage / 100) * 2 * Math.PI - Math.PI / 2;
    
    const outerRadius = radius;
    const innerRadius = radius - thickness;
    
    const x1 = 100 + outerRadius * Math.cos(startAngle);
    const y1 = 100 + outerRadius * Math.sin(startAngle);
    const x2 = 100 + outerRadius * Math.cos(endAngle);
    const y2 = 100 + outerRadius * Math.sin(endAngle);
    
    const x3 = 100 + innerRadius * Math.cos(endAngle);
    const y3 = 100 + innerRadius * Math.sin(endAngle);
    const x4 = 100 + innerRadius * Math.cos(startAngle);
    const y4 = 100 + innerRadius * Math.sin(startAngle);
    
    const largeArc = endPercentage - startPercentage > 50 ? 1 : 0;
    
    return `
      M ${x1} ${y1}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}
      Z
    `;
  };

  // Calculate grid columns based on what's showing
  const getGridCols = () => {
    const visibleCount = [showOtherKPIs, showPayrollStatus, showEmployeeGrowth].filter(Boolean).length;
    if (visibleCount === 3) return 'grid-cols-1 xl:grid-cols-3';
    if (visibleCount === 2) return 'grid-cols-1 xl:grid-cols-2';
    return 'grid-cols-1';
  };

  return (
    <div className="space-y-6">
      {/* KPI Charts Grid */}
      <div className={`grid gap-6 ${getGridCols()}`}>
        
        {/* 1. Department KPI: Employee Distribution (Donut Chart) */}
        {showOtherKPIs && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Department Distribution</h3>
              <p className="text-xs text-gray-500 mt-1">Employees by department</p>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50">
              <svg className="w-5 h-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-40 h-40">
              {departmentDistribution.map((dept, index) => (
                dept.percentage > 0 && (
                  <path
                    key={index}
                    d={createDonutPath(dept.startPercentage, dept.endPercentage, 80, 30)}
                    fill={dept.color}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                )
              ))}
            </svg>
          </div>
          
          <div className="mt-4">
            {/* Department and Employee Counts */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Departments</div>
                <div className="text-2xl font-bold text-gray-900">{departmentDistribution.length}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Employees</div>
                <div className="text-2xl font-bold text-gray-900">
                  {departmentDistribution.reduce((sum, dept) => sum + dept.count, 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 2. Payroll KPI: Status Distribution */}
        {showPayrollStatus && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Payroll Status</h3>
              <p className="text-xs text-gray-500 mt-1">Current payroll breakdown</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50">
              <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-40 h-40">
              {payrollStatusDistribution.map((status, index) => (
                status.percentage > 0 && (
                  <path
                    key={index}
                    d={createDonutPath(status.startPercentage, status.endPercentage, 80, 30)}
                    fill={status.color}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                )
              ))}
              <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold fill-gray-900">
                {payrolls.length}
              </text>
              <text x="100" y="115" textAnchor="middle" className="text-xs fill-gray-500">
                Total
              </text>
            </svg>
          </div>
          
          <div className="mt-4 space-y-2">
            {payrollStatusDistribution.map((status, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="text-gray-700">{status.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{status.count}</span>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* 3. Employee KPI: Growth Trend */}
        {showEmployeeGrowth && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Employee Growth</h3>
              <p className="text-xs text-gray-500 mt-1">Last 6 months trend</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50">
              <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
          </div>
          
          <div className="mb-3">
            <div className="text-2xl font-bold text-gray-900">{employeeGrowthTrend.currentCount}</div>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className={`px-2 py-1 rounded-full ${
                employeeGrowthTrend.growth >= 0 
                  ? 'bg-emerald-50 text-emerald-700' 
                  : 'bg-rose-50 text-rose-700'
              }`}>
                {employeeGrowthTrend.growth >= 0 ? '+' : ''}{employeeGrowthTrend.growth}
              </span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </div>
          
          <div className="relative h-32">
            <svg viewBox={`0 0 ${employeeGrowthTrend.width} ${employeeGrowthTrend.height}`} preserveAspectRatio="none" className="w-full h-full">
              {/* Grid lines */}
              {employeeGrowthTrend.yAxisLabels.map((label, i) => (
                <g key={i}>
                  <line 
                    x1={employeeGrowthTrend.padding} 
                    y1={label.y} 
                    x2={employeeGrowthTrend.width - employeeGrowthTrend.padding} 
                    y2={label.y} 
                    stroke="#E5E7EB" 
                    strokeWidth="1" 
                    strokeDasharray="2,2"
                  />
                </g>
              ))}
              
              {/* Line chart */}
              <path 
                d={employeeGrowthTrend.path} 
                stroke="#10B981" 
                strokeWidth="3" 
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {employeeGrowthTrend.points.map((point, i) => (
                <g key={i}>
                  <circle 
                    cx={point.x} 
                    cy={point.y} 
                    r="4" 
                    fill="#10B981" 
                    stroke="white" 
                    strokeWidth="2"
                  />
                </g>
              ))}
            </svg>
            
            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-8">
              {employeeGrowthTrend.months.map((m, i) => (
                <span key={i}>{m.label}</span>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
