"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";

interface HeaderProps {
  activeTab: string;
  currentTime: Date;
  onSearchResult?: (type: string, id: string) => void;
}

interface SearchResult {
  type: 'employee' | 'payroll' | 'payslip';
  id: string;
  title: string;
  subtitle: string;
  description: string;
  action: () => void;
}

export default function Header({ activeTab, currentTime, onSearchResult }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Search across all data types
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];

    try {
      // Search employees
      const employeeResponse = await apiService.getEmployees();
      if (employeeResponse.success) {
        const matchingEmployees = employeeResponse.employees.filter(emp => 
          emp.name?.toLowerCase().includes(query.toLowerCase()) ||
          emp.employeeId?.toLowerCase().includes(query.toLowerCase()) ||
          emp.position?.toLowerCase().includes(query.toLowerCase()) ||
          emp.department?.toLowerCase().includes(query.toLowerCase())
        );

        matchingEmployees.forEach(emp => {
          results.push({
            type: 'employee',
            id: emp._id || emp.id,
            title: emp.name || 'Unknown Employee',
            subtitle: `${emp.position || 'Unknown Position'} • ${emp.department || 'Unknown Department'}`,
            description: `Employee ID: ${emp.employeeId || 'N/A'}`,
            action: () => {
              // Navigate to employee management tab and highlight the employee
              onSearchResult?.('employees', emp._id || emp.id);
              setShowSearchModal(false);
              setSearchQuery('');
            }
          });
        });
      }

      // Search payrolls
      const payrollResponse = await apiService.getPayrolls();
      if (payrollResponse.success) {
        const matchingPayrolls = payrollResponse.payrolls.filter(payroll => 
          payroll.employeeName?.toLowerCase().includes(query.toLowerCase()) ||
          payroll.status?.toLowerCase().includes(query.toLowerCase()) ||
          payroll.payrollPeriod?.toLowerCase().includes(query.toLowerCase())
        );

        matchingPayrolls.forEach(payroll => {
          results.push({
            type: 'payroll',
            id: payroll._id || payroll.id,
            title: `${payroll.employeeName || 'Unknown Employee'} - ${payroll.payrollPeriod || 'Unknown Period'}`,
            subtitle: `Status: ${payroll.status || 'Unknown'} • Net Pay: ₱${payroll.netPay || 0}`,
            description: `Gross: ₱${payroll.grossPay || 0} • Deductions: ₱${payroll.totalDeductions || 0}`,
            action: () => {
              // Navigate to payroll processing tab and highlight the payroll
              onSearchResult?.('payroll', payroll._id || payroll.id);
              setShowSearchModal(false);
              setSearchQuery('');
            }
          });
        });
      }

      // Search payslips
      try {
        const payslipResponse = await apiService.getPayslips();
        if (payslipResponse.success) {
          const matchingPayslips = payslipResponse.payslips.filter(payslip => 
            payslip.employeeName?.toLowerCase().includes(query.toLowerCase()) ||
            payslip.payrollPeriod?.toLowerCase().includes(query.toLowerCase())
          );

          matchingPayslips.forEach(payslip => {
            results.push({
              type: 'payslip',
              id: payslip._id || payslip.id,
              title: `${payslip.employeeName || 'Unknown Employee'} - ${payslip.payrollPeriod || 'Unknown Period'}`,
              subtitle: `Generated: ${new Date(payslip.createdAt || payslip.generatedAt).toLocaleDateString()}`,
              description: `Net Pay: ₱${payslip.netPay || 0}`,
              action: () => {
                // Navigate to reports tab and highlight the payslip
                onSearchResult?.('reports', payslip._id || payslip.id);
                setShowSearchModal(false);
                setSearchQuery('');
              }
            });
          });
        }
      } catch (error) {
        // Payslips might not be available, skip silently
      }

    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }

    setSearchResults(results);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearchFocus = () => {
    if (searchQuery.trim()) {
      setShowSearchModal(true);
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim()) {
      setShowSearchModal(true);
    } else {
      setShowSearchModal(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearchModal(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' && searchResults.length > 0) {
      searchResults[0].action();
    }
  };

  return (
    <>
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
            <div className="hidden md:flex items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 hover:border-gray-300 transition-colors relative">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/>
              </svg>
              <input 
                className="bg-transparent outline-none text-sm ml-3 w-64 placeholder-gray-400" 
                placeholder="Search employees, payrolls, payslips..." 
                value={searchQuery}
                onChange={handleSearchInput}
                onFocus={handleSearchFocus}
                onKeyDown={handleKeyDown}
              />
              {isSearching && (
                <div className="absolute right-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                </div>
              )}
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/>
              </svg>
            </button>
            
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

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen pt-16 px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowSearchModal(false)}></div>
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/>
                  </svg>
                  <input 
                    className="flex-1 bg-transparent outline-none text-lg placeholder-gray-400" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={handleSearchInput}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                  <button 
                    onClick={() => setShowSearchModal(false)}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-gray-600">Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {searchResults.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}-${index}`}
                        onClick={result.action}
                        className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50"
                      >
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mr-3">
                            {result.type === 'employee' && (
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                            )}
                            {result.type === 'payroll' && (
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            )}
                            {result.type === 'payslip' && (
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {result.subtitle}
                            </div>
                            <div className="text-xs text-gray-400 truncate">
                              {result.description}
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-3">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/>
                    </svg>
                    <p className="text-lg font-medium">No results found</p>
                    <p className="text-sm">Try searching with different keywords</p>
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 100-16 8 8 0 000 16z"/>
                    </svg>
                    <p className="text-lg font-medium">Start typing to search</p>
                    <p className="text-sm">Search for employees, payrolls, or payslips</p>
                  </div>
                )}
              </div>
              
              {searchResults.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Press Enter to select first result • Press Esc to close
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
