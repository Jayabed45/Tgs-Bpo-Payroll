# CSV Import Guide for Employee Management

## Overview
The Employee Management system now supports bulk importing employees from CSV files. This feature allows you to quickly add multiple employees to your payroll system without manually entering each one.

## How to Use

### 1. Access the Import Feature
- Navigate to the Employee Management section
- Click the "Import CSV" button in the top-right corner of the employee list
- Or use the floating green import button at the bottom-right of the screen

### 2. Download Template
- Click "Download Template" in the import modal to get a sample CSV file
- This template shows the exact format expected for your data

### 3. Prepare Your CSV File
Your CSV file should have the following columns (in order):

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| name | Yes | Full name of employee | John Doe |
| position | Yes | Job title/position | Software Developer |
| salary | Yes | Monthly salary amount | 50000 |
| workingDays | No | Working days per month (0-31) | 22 |
| sssNumber | No | SSS identification number | 1234567890 |
| philhealthNumber | No | PhilHealth identification number | PH1234567890 |
| pagibigNumber | No | Pag-IBIG identification number | PAG1234567890 |
| email | Yes | Email address | john.doe@example.com |
| contactNumber | No | Phone number | +639123456789 |
| hireDate | No | Date of hire (YYYY-MM-DD) | 2024-01-15 |
| departmentId | No | Department code or ID | IT, HR, SALES |

### 4. Upload Your File
- Drag and drop your CSV file onto the upload area, or
- Click the upload area to browse and select your file
- The system will automatically parse and validate your data

### 5. Review and Import
- Preview your data in the table
- Check for any validation errors
- Click "Import Employees" to complete the process

## Validation Rules

### Required Fields
- **name**: Must not be empty
- **position**: Must not be empty  
- **salary**: Must be a valid number greater than 0
- **email**: Must be a valid email format

### Optional Fields
- **workingDays**: Must be between 0-31 if provided
- **sssNumber**: Any text format
- **philhealthNumber**: Any text format
- **pagibigNumber**: Any text format
- **contactNumber**: Any text format
- **hireDate**: Must be in YYYY-MM-DD format if provided
- **departmentId**: Must be a valid department code or ID (e.g., IT, HR, SALES). You can find department codes in the Department Management section

## Error Handling

The system will:
- Skip rows with validation errors
- Show detailed error messages for each problematic row
- Continue processing valid rows
- Report the total number of successfully imported employees

## Tips for Success

1. **Use the template**: Download and use the provided template as a starting point
2. **Check your data**: Ensure all required fields are filled
3. **Validate emails**: Make sure email addresses are in correct format
4. **Check for duplicates**: The system will skip employees with existing email addresses
5. **Test with small files**: Start with a few employees to test the process

## File Format Requirements

- **File type**: CSV (Comma Separated Values)
- **Encoding**: UTF-8
- **Delimiter**: Comma (,)
- **Header row**: First row should contain column names
- **Date format**: YYYY-MM-DD for hire dates

## Example CSV Content

```csv
name,position,salary,workingDays,sssNumber,philhealthNumber,pagibigNumber,email,contactNumber,hireDate,departmentId
John Doe,Software Developer,50000,22,1234567890,PH1234567890,PAG1234567890,john.doe@example.com,+639123456789,2024-01-15,IT
Jane Smith,HR Manager,45000,22,0987654321,PH0987654321,PAG0987654321,jane.smith@example.com,+639098765432,2024-02-01,HR
Mike Johnson,Accountant,40000,22,1122334455,PH1122334455,PAG1122334455,mike.johnson@example.com,+639112233445,2024-01-20,FINANCE
```

## Troubleshooting

### Common Issues
1. **File not uploading**: Check file format is CSV
2. **Validation errors**: Review error messages and fix data format
3. **No employees imported**: Check for duplicate email addresses
4. **Date format errors**: Ensure dates are in YYYY-MM-DD format
5. **Invalid department errors**: Ensure the departmentId matches an existing department code or ID. Check the Department Management section for valid codes

### Support
If you encounter issues, check the validation error messages in the import modal for specific guidance on fixing your data.
