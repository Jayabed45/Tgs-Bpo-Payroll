"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "../services/api";
import { useSettings } from "../contexts/SettingsContext";

interface SettingsProps {
  onClose?: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { refreshSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<"profile" | "system" | "payroll" | "locations">("profile");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Modal states
  const [successModal, setSuccessModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });
  const [errorModal, setErrorModal] = useState<{ open: boolean; message?: string }>({
    open: false,
  });

  // Profile Settings State
  const [profileData, setProfileData] = useState({
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // System Settings State (Regional only)
  const [systemSettings, setSystemSettings] = useState({
    currency: "PHP",
    dateFormat: "MM/DD/YYYY",
    timezone: "Asia/Manila",
  });

  // Payroll Configuration State
  const [payrollSettings, setPayrollSettings] = useState({
    sssRate: "4.5",
    philhealthRate: "2.0",
    pagibigRate: "2.0",
    withholdingTaxRate: "15.0",
    overtimeMultiplier: "1.25",
    nightDiffRate: "10.0",
    holidayRate: "200.0",
    workingHoursPerDay: "8",
    workingDaysPerWeek: "5",
  });

  // Site Locations State
  const [siteLocations, setSiteLocations] = useState<string[]>(["Cebu", "Dumaguete", "Tuburan"]);
  const [newLocation, setNewLocation] = useState("");
  const [editingLocation, setEditingLocation] = useState<{ index: number; value: string } | null>(null);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSystemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSystemSettings(prev => ({ ...prev, [name]: value }));
  };

  const handlePayrollChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPayrollSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Validate password fields if changing password
      if (profileData.newPassword || profileData.currentPassword) {
        if (!profileData.currentPassword) {
          setErrorModal({ open: true, message: "Please enter your current password" });
          setLoading(false);
          return;
        }
        if (!profileData.newPassword) {
          setErrorModal({ open: true, message: "Please enter a new password" });
          setLoading(false);
          return;
        }
        if (profileData.newPassword !== profileData.confirmPassword) {
          setErrorModal({ open: true, message: "New passwords do not match" });
          setLoading(false);
          return;
        }
        if (profileData.newPassword.length < 6) {
          setErrorModal({ open: true, message: "Password must be at least 6 characters long" });
          setLoading(false);
          return;
        }
      }

      // Prepare update data
      const updateData: any = {
        name: profileData.adminName,
        email: profileData.adminEmail,
      };

      // Add password fields if changing password
      if (profileData.newPassword && profileData.currentPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      // Call API to update profile
      const response = await apiService.updateProfile(updateData);

      if (response.success) {
        // Get current user
        const userData = localStorage.getItem("user");
        if (userData) {
          const user = JSON.parse(userData);
          
          // Save profile settings specific to this user
          const userProfileKey = `profileSettings_${user.id || user.email}`;
          localStorage.setItem(userProfileKey, JSON.stringify({
            adminName: profileData.adminName,
            adminPhone: profileData.adminPhone,
          }));
          
          // Update user in localStorage with new data
          const updatedUser = {
            ...user,
            name: response.user.name,
            email: response.user.email,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));

          // If email changed, update token
          if (response.token) {
            localStorage.setItem("token", response.token);
          }

          // Clear password fields
          setProfileData(prev => ({
            ...prev,
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
            adminEmail: response.user.email, // Update email in form
          }));
        }
        
        setSuccessModal({ open: true, message: "Profile updated successfully!" });
      } else {
        setErrorModal({ open: true, message: response.message || "Failed to update profile" });
      }
    } catch (error: any) {
      console.error("Error saving profile:", error);
      setErrorModal({ open: true, message: error.message || "Failed to update profile" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystem = async () => {
    setLoading(true);
    try {
      // Combine all settings for API
      const allSettings = {
        ...payrollSettings,
        ...systemSettings,
        sssRate: parseFloat(payrollSettings.sssRate),
        philhealthRate: parseFloat(payrollSettings.philhealthRate),
        pagibigRate: parseFloat(payrollSettings.pagibigRate),
        withholdingTaxRate: parseFloat(payrollSettings.withholdingTaxRate),
        overtimeMultiplier: parseFloat(payrollSettings.overtimeMultiplier),
        nightDiffRate: parseFloat(payrollSettings.nightDiffRate),
        holidayRate: parseFloat(payrollSettings.holidayRate),
        workingHoursPerDay: parseInt(payrollSettings.workingHoursPerDay),
        workingDaysPerWeek: parseInt(payrollSettings.workingDaysPerWeek),
      };
      
      await apiService.updateSettings(allSettings);
      await refreshSettings(); // Refresh settings context
      setSuccessModal({ open: true, message: "System settings saved successfully!" });
    } catch (error: any) {
      console.error("Error saving system settings:", error);
      setErrorModal({ open: true, message: error.message || "Failed to save system settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayroll = async () => {
    setLoading(true);
    try {
      // Combine all settings for API
      const allSettings = {
        ...payrollSettings,
        ...systemSettings,
        sssRate: parseFloat(payrollSettings.sssRate),
        philhealthRate: parseFloat(payrollSettings.philhealthRate),
        pagibigRate: parseFloat(payrollSettings.pagibigRate),
        withholdingTaxRate: parseFloat(payrollSettings.withholdingTaxRate),
        overtimeMultiplier: parseFloat(payrollSettings.overtimeMultiplier),
        nightDiffRate: parseFloat(payrollSettings.nightDiffRate),
        holidayRate: parseFloat(payrollSettings.holidayRate),
        workingHoursPerDay: parseInt(payrollSettings.workingHoursPerDay),
        workingDaysPerWeek: parseInt(payrollSettings.workingDaysPerWeek),
      };
      
      await apiService.updateSettings(allSettings);
      await refreshSettings(); // Refresh settings context
      setSuccessModal({ open: true, message: "Payroll configuration saved successfully!" });
    } catch (error: any) {
      console.error("Error saving payroll settings:", error);
      setErrorModal({ open: true, message: error.message || "Failed to save payroll settings" });
    } finally {
      setLoading(false);
    }
  };

  // Site Location handlers
  const handleAddLocation = async () => {
    if (!newLocation.trim()) {
      setErrorModal({ open: true, message: "Please enter a location name" });
      return;
    }
    if (siteLocations.includes(newLocation.trim())) {
      setErrorModal({ open: true, message: "This location already exists" });
      return;
    }
    
    setLoading(true);
    try {
      const updatedLocations = [...siteLocations, newLocation.trim()];
      await apiService.updateSettings({ siteLocations: updatedLocations });
      setSiteLocations(updatedLocations);
      setNewLocation("");
      setSuccessModal({ open: true, message: "Site location added successfully!" });
    } catch (error: any) {
      setErrorModal({ open: true, message: error.message || "Failed to add location" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation || !editingLocation.value.trim()) {
      setErrorModal({ open: true, message: "Please enter a location name" });
      return;
    }
    
    const newValue = editingLocation.value.trim();
    const existingIndex = siteLocations.findIndex((loc, i) => loc === newValue && i !== editingLocation.index);
    if (existingIndex !== -1) {
      setErrorModal({ open: true, message: "This location already exists" });
      return;
    }
    
    setLoading(true);
    try {
      const updatedLocations = [...siteLocations];
      updatedLocations[editingLocation.index] = newValue;
      await apiService.updateSettings({ siteLocations: updatedLocations });
      setSiteLocations(updatedLocations);
      setEditingLocation(null);
      setSuccessModal({ open: true, message: "Site location updated successfully!" });
    } catch (error: any) {
      setErrorModal({ open: true, message: error.message || "Failed to update location" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (index: number) => {
    if (siteLocations.length <= 1) {
      setErrorModal({ open: true, message: "You must have at least one site location" });
      return;
    }
    
    setLoading(true);
    try {
      const updatedLocations = siteLocations.filter((_, i) => i !== index);
      await apiService.updateSettings({ siteLocations: updatedLocations });
      setSiteLocations(updatedLocations);
      setSuccessModal({ open: true, message: "Site location deleted successfully!" });
    } catch (error: any) {
      setErrorModal({ open: true, message: error.message || "Failed to delete location" });
    } finally {
      setLoading(false);
    }
  };

  // Load saved settings and user data on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setInitialLoading(true);
        
        // Get logged-in user data
        const userData = localStorage.getItem("user");
        let user = null;
        if (userData) {
          user = JSON.parse(userData);
        }

        // Always load profile settings from the currently logged-in user
        if (user) {
          // Check if we have saved profile settings for this specific user
          const userProfileKey = `profileSettings_${user.id || user.email}`;
          const savedProfile = localStorage.getItem(userProfileKey);
          
          if (savedProfile) {
            // Use saved profile for this user
            const profile = JSON.parse(savedProfile);
            setProfileData({
              adminName: profile.adminName || user.name || user.email?.split('@')[0] || "Administrator",
              adminEmail: user.email || "admin@tgsbpo.com", // Always use current user's email
              adminPhone: profile.adminPhone || "+63 912 345 6789",
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
          } else {
            // Set default profile data from logged-in user
            setProfileData({
              adminName: user.name || user.email?.split('@')[0] || "Administrator",
              adminEmail: user.email || "admin@tgsbpo.com",
              adminPhone: "+63 912 345 6789",
              currentPassword: "",
              newPassword: "",
              confirmPassword: "",
            });
          }
        } else {
          // Fallback if no user is logged in
          setProfileData({
            adminName: "Administrator",
            adminEmail: "admin@tgsbpo.com",
            adminPhone: "+63 912 345 6789",
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        }
        
        // Fetch settings from API
        const response = await apiService.getSettings();
        if (response.success && response.settings) {
          const settings = response.settings;
          
          // Set payroll settings
          setPayrollSettings({
            sssRate: String(settings.sssRate || 4.5),
            philhealthRate: String(settings.philhealthRate || 2.0),
            pagibigRate: String(settings.pagibigRate || 2.0),
            withholdingTaxRate: String(settings.withholdingTaxRate || 15.0),
            overtimeMultiplier: String(settings.overtimeMultiplier || 1.25),
            nightDiffRate: String(settings.nightDiffRate || 10.0),
            holidayRate: String(settings.holidayRate || 200.0),
            workingHoursPerDay: String(settings.workingHoursPerDay || 8),
            workingDaysPerWeek: String(settings.workingDaysPerWeek || 5),
          });
          
          // Set system settings
          setSystemSettings({
            currency: settings.currency || "PHP",
            dateFormat: settings.dateFormat || "MM/DD/YYYY",
            timezone: settings.timezone || "Asia/Manila",
          });

          // Set site locations
          if (settings.siteLocations && Array.isArray(settings.siteLocations)) {
            setSiteLocations(settings.siteLocations);
          }
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Show loading state while fetching initial data
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "profile"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile Settings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("payroll")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "payroll"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Payroll Configuration</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("system")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "system"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>System Settings</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("locations")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "locations"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Site Locations</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "profile" && (
            <ProfileSettings
              data={profileData}
              onChange={handleProfileChange}
              onSave={handleSaveProfile}
              loading={loading}
            />
          )}
          {activeTab === "payroll" && (
            <PayrollConfigTab
              data={payrollSettings}
              onChange={handlePayrollChange}
              onSave={handleSavePayroll}
              loading={loading}
            />
          )}
          {activeTab === "system" && (
            <SystemSettingsTab
              data={systemSettings}
              onChange={handleSystemChange}
              onSave={handleSaveSystem}
              loading={loading}
            />
          )}
          {activeTab === "locations" && (
            <SiteLocationsTab
              locations={siteLocations}
              newLocation={newLocation}
              editingLocation={editingLocation}
              onNewLocationChange={setNewLocation}
              onEditingLocationChange={setEditingLocation}
              onAdd={handleAddLocation}
              onUpdate={handleUpdateLocation}
              onDelete={handleDeleteLocation}
              loading={loading}
            />
          )}
        </div>
      </div>

      {/* Success Modal */}
      {successModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[9999]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
            <h2 className="text-lg font-semibold text-green-600">Success</h2>
            <p className="mt-3 text-sm text-gray-700">
              {successModal.message || "Settings saved successfully!"}
            </p>
            <div className="mt-5">
              <button
                onClick={() => setSuccessModal({ open: false })}
                className="px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModal.open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-[9999]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
            <h2 className="text-lg font-semibold text-red-600">Error</h2>
            <p className="mt-3 text-sm text-gray-700">
              {errorModal.message || "An error occurred. Please try again."}
            </p>
            <div className="mt-5">
              <button
                onClick={() => setErrorModal({ open: false })}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Profile Settings Component
interface ProfileSettingsProps {
  data: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSave: () => void;
  loading: boolean;
}

function ProfileSettings({ data, onChange, onSave, loading }: ProfileSettingsProps) {
  return (
    <div className="space-y-8">
      {/* Administrator Information */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
          <h4 className="text-base font-semibold text-gray-900">Administrator Information</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Name
            </label>
            <input
              type="text"
              name="adminName"
              value={data.adminName}
              onChange={onChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email (Login Credential)
            </label>
            <input
              type="email"
              name="adminEmail"
              value={data.adminEmail}
              onChange={onChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Phone
            </label>
            <input
              type="tel"
              name="adminPhone"
              value={data.adminPhone}
              onChange={onChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Change Password Section */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
          <h4 className="text-base font-semibold text-gray-900">Change Password</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              name="currentPassword"
              value={data.currentPassword || ""}
              onChange={onChange}
              placeholder="Enter current password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <input
              type="password"
              name="newPassword"
              value={data.newPassword || ""}
              onChange={onChange}
              placeholder="Enter new password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={data.confirmPassword || ""}
              onChange={onChange}
              placeholder="Confirm new password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-gray-900"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">Leave password fields empty if you don't want to change your password</p>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={onSave}
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Profile Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Payroll Configuration Component
interface PayrollConfigTabProps {
  data: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSave: () => void;
  loading: boolean;
}

function PayrollConfigTab({ data, onChange, onSave, loading }: PayrollConfigTabProps) {
  return (
    <div className="space-y-8">
      {/* Government Contributions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-6 bg-green-500 rounded-full"></div>
            <h4 className="text-base font-semibold text-gray-900">Government Contributions</h4>
          </div>
          <div className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
            🇵🇭 Philippine Payroll System (2024)
          </div>
        </div>
        
        {/* Information Box */}
        <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-900 mb-1">• SSS (Social Security System)</p>
              <p className="text-xs text-gray-600">Salary bracket-based contributions</p>
              <p className="text-xs text-gray-500">₱4,250 - ₱30,000+ range • Employee share: ₱180 - ₱1,350</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">• Pag-IBIG (HDMF)</p>
              <p className="text-xs text-gray-600">Tiered contribution rates</p>
              <p className="text-xs text-gray-500">≤₱1,500: 1% • &gt;₱1,500: 2% • Max: ₱100/month</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">• PhilHealth</p>
              <p className="text-xs text-gray-600">Income-based premium rates</p>
              <p className="text-xs text-gray-500">≤₱10,000: ₱250 • ₱10,001-₱99,999: 2.5% • ≥₱100,000: ₱2,500</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">• Withholding Tax (TRAIN Law)</p>
              <p className="text-xs text-gray-600">Graduated tax brackets</p>
              <p className="text-xs text-gray-500">₱0-₱250k: 0% • ₱250k-₱400k: 15% • Up to 35% for ₱8M+</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-green-200">
            <p className="text-xs text-gray-600 italic">
              ✓ Contributions are automatically calculated based on official 2024 tables and TRAIN Law tax brackets
            </p>
          </div>
        </div>

        {/* Editable Override Rates */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-semibold text-amber-800">Manual Override (Optional)</p>
          </div>
          <p className="text-xs text-amber-700 mb-4">
            Use these fields only for testing or special cases. Leave at default to use official Philippine rates.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SSS Rate Override
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="sssRate"
                  value={data.sssRate}
                  onChange={onChange}
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="Auto (Official)"
                  className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                />
                <span className="absolute right-3 top-2.5 text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PhilHealth Rate Override
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="philhealthRate"
                  value={data.philhealthRate}
                  onChange={onChange}
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="Auto (Official)"
                  className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                />
                <span className="absolute right-3 top-2.5 text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pag-IBIG Rate Override
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="pagibigRate"
                  value={data.pagibigRate}
                  onChange={onChange}
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="Auto (Official)"
                  className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                />
                <span className="absolute right-3 top-2.5 text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Withholding Tax Override
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="withholdingTaxRate"
                  value={data.withholdingTaxRate}
                  onChange={onChange}
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="Auto (Official)"
                  className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900"
                />
                <span className="absolute right-3 top-2.5 text-gray-500">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pay Calculation Settings */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
          <h4 className="text-base font-semibold text-gray-900">Pay Calculation Settings</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overtime Multiplier
            </label>
            <input
              type="number"
              name="overtimeMultiplier"
              value={data.overtimeMultiplier}
              onChange={onChange}
              step="0.05"
              min="1"
              max="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Night Differential Rate (%)
            </label>
            <div className="relative">
              <input
                type="number"
                name="nightDiffRate"
                value={data.nightDiffRate}
                onChange={onChange}
                step="1"
                min="0"
                max="100"
                className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
              <span className="absolute right-3 top-2.5 text-gray-500">%</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Holiday Rate (₱)
            </label>
            <input
              type="number"
              name="holidayRate"
              value={data.holidayRate}
              onChange={onChange}
              step="10"
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Working Hours Settings */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-6 bg-orange-500 rounded-full"></div>
          <h4 className="text-base font-semibold text-gray-900">Working Hours Settings</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Working Hours Per Day
            </label>
            <input
              type="number"
              name="workingHoursPerDay"
              value={data.workingHoursPerDay}
              onChange={onChange}
              min="1"
              max="24"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Working Days Per Week
            </label>
            <input
              type="number"
              name="workingDaysPerWeek"
              value={data.workingDaysPerWeek}
              onChange={onChange}
              min="1"
              max="7"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={onSave}
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save Payroll Configuration</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// System Settings Component
interface SystemSettingsTabProps {
  data: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSave: () => void;
  loading: boolean;
}

function SystemSettingsTab({ data, onChange, onSave, loading }: SystemSettingsTabProps) {
  return (
    <div className="space-y-8">
      {/* Regional Settings */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
          <h4 className="text-base font-semibold text-gray-900">Regional Settings</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              name="currency"
              value={data.currency}
              onChange={onChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
            >
              <option value="PHP">PHP - Philippine Peso</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Format
            </label>
            <select
              name="dateFormat"
              value={data.dateFormat}
              onChange={onChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              name="timezone"
              value={data.timezone}
              onChange={onChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900"
            >
              <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="Europe/London">Europe/London (GMT+0)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={onSave}
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save System Settings</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Site Locations Component
interface SiteLocationsTabProps {
  locations: string[];
  newLocation: string;
  editingLocation: { index: number; value: string } | null;
  onNewLocationChange: (value: string) => void;
  onEditingLocationChange: (value: { index: number; value: string } | null) => void;
  onAdd: () => void;
  onUpdate: () => void;
  onDelete: (index: number) => void;
  loading: boolean;
}

function SiteLocationsTab({
  locations,
  newLocation,
  editingLocation,
  onNewLocationChange,
  onEditingLocationChange,
  onAdd,
  onUpdate,
  onDelete,
  loading,
}: SiteLocationsTabProps) {
  return (
    <div className="space-y-8">
      {/* Site Locations Management */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-1 h-6 bg-teal-500 rounded-full"></div>
          <h4 className="text-base font-semibold text-gray-900">Site Locations</h4>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Manage the site locations available for departments. These locations will appear in the department creation form.
        </p>

        {/* Add New Location */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add New Location
          </label>
          <div className="flex space-x-3">
            <input
              type="text"
              value={newLocation}
              onChange={(e) => onNewLocationChange(e.target.value)}
              placeholder="Enter location name (e.g., Manila)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAdd();
                }
              }}
            />
            <button
              onClick={onAdd}
              disabled={loading || !newLocation.trim()}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Existing Locations List */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Current Locations ({locations.length})
          </label>
          {locations.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500">No locations added yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {locations.map((location, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                >
                  {editingLocation?.index === index ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <input
                        type="text"
                        value={editingLocation.value}
                        onChange={(e) =>
                          onEditingLocationChange({ index, value: e.target.value })
                        }
                        className="flex-1 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-gray-900 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onUpdate();
                          } else if (e.key === "Escape") {
                            onEditingLocationChange(null);
                          }
                        }}
                      />
                      <button
                        onClick={onUpdate}
                        disabled={loading}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Save"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onEditingLocationChange(null)}
                        className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                        title="Cancel"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <span className="text-gray-900 font-medium">{location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onEditingLocationChange({ index, value: location })}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDelete(index)}
                          disabled={loading || locations.length <= 1}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={locations.length <= 1 ? "Cannot delete last location" : "Delete"}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">How Site Locations Work</p>
            <p className="text-xs text-blue-700 mt-1">
              Site locations are used when creating or editing departments. Each department can be assigned to one site location.
              Changes made here will be reflected in the department management form immediately.
            </p>
          </div>
        </div>
      </div> */}
    </div>
  );
}
