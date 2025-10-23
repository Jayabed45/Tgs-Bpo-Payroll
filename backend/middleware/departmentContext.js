const { ObjectId } = require('mongodb');
const { clientPromise } = require('../config/database');

/**
 * Middleware to inject department context into requests
 * This allows consistent filtering and authorization by department
 */
const departmentContext = async (req, res, next) => {
  try {
    // Get department from various sources (header, query, user profile)
    let departmentId = req.headers['x-department'] || 
                     req.query.department || 
                     req.user?.departmentId;

    if (departmentId && ObjectId.isValid(departmentId)) {
      const client = await clientPromise;
      const db = client.db();
      
      // Verify department exists and is active
      const department = await db.collection('departments').findOne({
        _id: new ObjectId(departmentId),
        isActive: true
      });

      if (department) {
        req.department = {
          id: department._id.toString(),
          name: department.name,
          code: department.code,
          description: department.description
        };
      }
    }

    next();
  } catch (error) {
    console.error('Department context middleware error:', error);
    // Don't fail the request, just continue without department context
    next();
  }
};

/**
 * Middleware to require department context
 * Use this for routes that must have a department
 */
const requireDepartment = (req, res, next) => {
  if (!req.department) {
    return res.status(400).json({
      success: false,
      error: 'Department context is required',
      message: 'Please specify a valid department ID in the x-department header or department query parameter'
    });
  }
  next();
};

/**
 * Helper function to add department filter to MongoDB queries
 * Usage: const filter = addDepartmentFilter(req, { isActive: true });
 */
const addDepartmentFilter = (req, baseFilter = {}) => {
  if (req.department) {
    return {
      ...baseFilter,
      departmentId: new ObjectId(req.department.id)
    };
  }
  return baseFilter;
};

/**
 * Middleware to filter results by user's department (for non-admin users)
 * Admins can see all departments, regular users only see their department
 */
const departmentAccessControl = async (req, res, next) => {
  try {
    // If user is admin, allow access to all departments
    if (req.user?.role === 'admin') {
      return next();
    }

    // For non-admin users, restrict to their department
    if (req.user?.departmentId) {
      req.department = {
        id: req.user.departmentId,
        // We could fetch full department details here if needed
      };
    } else {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'User is not assigned to any department'
      });
    }

    next();
  } catch (error) {
    console.error('Department access control error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Utility function to get department-filtered aggregation pipeline
 * Usage in routes: const pipeline = getDepartmentAggregationPipeline(req, [...otherStages]);
 */
const getDepartmentAggregationPipeline = (req, additionalStages = []) => {
  const pipeline = [];

  // Add department filter if available
  if (req.department) {
    pipeline.push({
      $match: {
        departmentId: new ObjectId(req.department.id)
      }
    });
  }

  // Add department lookup for populated results
  pipeline.push({
    $lookup: {
      from: 'departments',
      localField: 'departmentId',
      foreignField: '_id',
      as: 'department'
    }
  });

  pipeline.push({
    $unwind: {
      path: '$department',
      preserveNullAndEmptyArrays: true
    }
  });

  // Add additional stages
  pipeline.push(...additionalStages);

  return pipeline;
};

module.exports = {
  departmentContext,
  requireDepartment,
  addDepartmentFilter,
  departmentAccessControl,
  getDepartmentAggregationPipeline
};
