import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ActionItem {
  label: string;
  icon: string;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
  title?: string;
}

interface ActionDropdownProps {
  actions: ActionItem[];
  triggerClassName?: string;
}

export default function ActionDropdown({ actions, triggerClassName = '' }: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Update dropdown position
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 200
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleActionClick = (action: ActionItem, e: React.MouseEvent) => {
    e.stopPropagation();
    action.onClick(e);
    setIsOpen(false);
  };

  const dropdownContent = isOpen && (
    <div 
      ref={dropdownRef}
      className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[9999] py-1"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={(e) => handleActionClick(action, e)}
          disabled={action.disabled}
          title={action.title}
          className={`w-full text-left px-4 py-2 text-sm flex items-center space-x-2 transition-colors ${
            action.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : action.className || 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <i className={`bi ${action.icon}`}></i>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors ${triggerClassName}`}
        title="Actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
        </svg>
      </button>

      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}
