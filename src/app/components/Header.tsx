"use client";
import React from "react";

interface HeaderProps {
  activeTab: string;
  currentTime: Date;
}

export default function Header({ activeTab, currentTime }: HeaderProps) {
  return (
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
  );
}
