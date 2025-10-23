# Department Integration Documentation

## Overview
This document outlines the complete integration of a global department system into the TGS BPO Payroll application. The department feature allows for better organization, filtering, and management of employees, payroll, and other business processes across different organizational units.

## Architecture

### Database Schema Design
```
Department Collection:
{
  _id: ObjectId,
  name: String (required, unique),
  code: String (required, unique, uppercase),
  description: String (optional),
  manager: ObjectId (optional, references Employee),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}

Employee Collection (Updated):
{
  // ... existing fields
  departmentId: ObjectId (required, references Department)
}

Payroll Collection (Updated):
{
  // ... existing fields
  departmentId: ObjectId (required, references Department)
}
```

### System Hierarchy
```
Department → Employees → Payroll → Transactions
     ↓         ↓          ↓           ↓
   Users    Projects    KPIs      Reports
```

## Implementation Details

### 1. Backend Models

#### Department Model (`/backend/models/Department.js`)
- **Fields**: name, code, description, manager, isActive
- **Validation**: Required fields, code format validation
- **Methods**: Static methods for hierarchy and statistics

#### Updated Employee Model (`/backend/models/Employee.js`)
- **Added**: `departmentId` field (ObjectId reference)
- **Validation**: Department is now required

#### Updated Payroll Model (`/backend/models/Payroll.js`)
- **Added**: `departmentId` field (ObjectId reference)

### 2. API Endpoints

#### Department Routes (`/api/departments`)
- `GET /` - List all departments
- `GET /:id` - Get department by ID with statistics
- `POST /` - Create new department
- `PUT /:id` - Update department
- `DELETE /:id` - Soft delete department
- `GET /:id/employees` - Get employees by department
- `GET /hierarchy/all` - Get department hierarchy with counts

### 3. Middleware

#### Department Context (`/backend/middleware/departmentContext.js`)
- **departmentContext**: Injects department info into requests
- **requireDepartment**: Ensures department context exists
- **addDepartmentFilter**: Helper for MongoDB queries
- **departmentAccessControl**: Role-based department access
- **getDepartmentAggregationPipeline**: Aggregation helper

### 4. Frontend Integration

#### Updated Employee Interface
```typescript
interface Employee {
  // ... existing fields
  departmentId: string;
  department?: Department; // Populated department info
}
```

#### Department Management Component
- Full CRUD operations for departments
- Employee count and payroll statistics
- Modern UI with modals and forms

## Database Optimization

### Indexing Strategy
```javascript
// Department Collection
{ code: 1 } // Unique index
{ name: 1 }
{ isActive: 1 }
{ createdAt: -1 }

// Employee Collection
{ departmentId: 1, isActive: 1 } // Primary filter
{ departmentId: 1, position: 1 }
{ departmentId: 1, hireDate: -1, isActive: 1 }

// Payroll Collection
{ departmentId: 1, cutoffStart: -1 }
{ departmentId: 1, status: 1 }
{ departmentId: 1, cutoffStart: -1, status: 1 }
```

### Query Performance
- **Fast**: `db.employees.find({ departmentId: ObjectId("..."), isActive: true })`
- **Fast**: `db.payroll.find({ departmentId: ObjectId("...") }).sort({ cutoffStart: -1 })`
- **Avoid**: Queries without department filtering on large collections

## Sample Data

### Pre-seeded Departments
1. **Human Resources (HR)** - Employee relations and recruitment
2. **Information Technology (IT)** - Technology infrastructure
3. **Finance and Accounting (FIN)** - Financial operations
4. **Customer Service (CS)** - Customer support
5. **Operations (OPS)** - Daily business operations
6. **Quality Assurance (QA)** - Service quality
7. **Business Development (BD)** - Business growth
8. **Training and Development (TD)** - Employee training
9. **Administration (ADMIN)** - Administrative tasks
10. **Marketing (MKT)** - Marketing campaigns

## Usage Examples

### 1. Filter Employees by Department
```javascript
// Backend
const employees = await db.collection('employees')
  .find({ departmentId: new ObjectId(departmentId), isActive: true })
  .toArray();

// Frontend
const response = await apiService.getDepartmentEmployees(departmentId);
```

### 2. Department-filtered Payroll Query
```javascript
const payrolls = await db.collection('payroll')
  .find({ departmentId: new ObjectId(departmentId) })
  .sort({ cutoffStart: -1 })
  .toArray();
```

### 3. Using Department Middleware
```javascript
// In routes
app.use(departmentContext); // Inject department info
app.use(requireDepartment); // Require department

// In route handler
const filter = addDepartmentFilter(req, { isActive: true });
const employees = await db.collection('employees').find(filter).toArray();
```

### 4. Aggregation with Department Lookup
```javascript
const pipeline = getDepartmentAggregationPipeline(req, [
  { $match: { status: 'active' } },
  { $sort: { createdAt: -1 } }
]);
const results = await db.collection('employees').aggregate(pipeline).toArray();
```

## Setup Instructions

### 1. Database Setup
```bash
# Navigate to backend directory
cd backend

# Seed departments and create indexes
npm run setup:db

# Or run individually
npm run seed:departments
npm run create:indexes
```

### 2. API Testing
```bash
# Test department endpoints
GET /api/departments
POST /api/departments
GET /api/departments/:id/employees
```

### 3. Frontend Integration
- Import `DepartmentManagement` component
- Update employee forms to include department selection
- Use department filtering in employee lists

## Migration Notes

### Existing Data
- Run `assignDefaultDepartment()` to assign existing employees to HR
- Update existing payroll records with department references
- Verify all employees have valid department assignments

### Validation
- All new employees must have a department
- Department codes must be unique and uppercase
- Soft delete prevents data loss

## Security Considerations

### Access Control
- Admin users can manage all departments
- Regular users restricted to their assigned department
- Department context prevents cross-department data access

### Data Integrity
- Foreign key constraints through application logic
- Cascade delete prevention (employees must be reassigned)
- Audit trail through createdAt/updatedAt timestamps

## Performance Monitoring

### Key Metrics
- Query execution time for department-filtered operations
- Index usage statistics
- Department distribution of employees and payroll

### Optimization Tips
- Always include department filter in queries
- Use compound indexes for multi-field queries
- Monitor slow query logs for optimization opportunities

## Future Enhancements

### Potential Features
- Department hierarchy (parent/child relationships)
- Department-specific permissions and roles
- Department budget tracking
- Cross-department reporting and analytics
- Department-based notifications and workflows

### Scalability Considerations
- Sharding strategy based on department
- Caching department information
- Async processing for department statistics
- Real-time department metrics dashboard

## Troubleshooting

### Common Issues
1. **Missing Department**: Ensure all employees have departmentId
2. **Query Performance**: Check if proper indexes are being used
3. **Access Denied**: Verify department context middleware is applied
4. **Validation Errors**: Check department code format and uniqueness

### Debug Commands
```javascript
// Check department assignment
db.employees.find({ departmentId: { $exists: false } }).count()

// Verify indexes
db.employees.getIndexes()

// Query performance
db.employees.find({ departmentId: ObjectId("...") }).explain("executionStats")
```

## Conclusion

The department integration provides a robust foundation for organizing and managing BPO operations. It enables:

- **Better Organization**: Clear departmental structure
- **Improved Performance**: Optimized queries with proper indexing
- **Enhanced Security**: Department-based access control
- **Scalable Architecture**: Ready for future enhancements
- **Data Integrity**: Consistent relationships across collections

This implementation follows MongoDB best practices and provides a solid foundation for scaling the BPO system across multiple departments and business units.
