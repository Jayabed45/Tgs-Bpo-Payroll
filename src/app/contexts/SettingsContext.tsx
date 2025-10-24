"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '../services/api';

interface SystemSettings {
  currency: string;
  dateFormat: string;
  timezone: string;
}

interface SettingsContextType {
  settings: SystemSettings;
  refreshSettings: () => Promise<void>;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string) => string;
}

const defaultSettings: SystemSettings = {
  currency: 'PHP',
  dateFormat: 'MM/DD/YYYY',
  timezone: 'Asia/Manila'
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  refreshSettings: async () => {},
  formatCurrency: (amount: number) => `₱${amount.toFixed(2)}`,
  formatDate: (date: Date | string) => new Date(date).toLocaleDateString()
});

export const useSettings = () => useContext(SettingsContext);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  const refreshSettings = async () => {
    try {
      const response = await apiService.getSettings();
      if (response.success && response.settings) {
        setSettings({
          currency: response.settings.currency || 'PHP',
          dateFormat: response.settings.dateFormat || 'MM/DD/YYYY',
          timezone: response.settings.timezone || 'Asia/Manila'
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const formatCurrency = (amount: number): string => {
    const currencySymbols: { [key: string]: string } = {
      'PHP': '₱',
      'USD': '$',
      'EUR': '€'
    };

    const symbol = currencySymbols[settings.currency] || '₱';
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    switch (settings.dateFormat) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
      default:
        return `${month}/${day}/${year}`;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings, formatCurrency, formatDate }}>
      {children}
    </SettingsContext.Provider>
  );
}
