/**
 * ACCESS SETTINGS CONFIGURATION
 * 
 * This file centralizes all access control settings for the application.
 * Modify this file to control which users can access which pages.
 * 
 * Access can be granted based on:
 * - Department (emp_DeptID): e.g., 'NT', 'PL', 'PC'
 * - User ID (log_NIK): e.g., 'JDV', 'ABC'
 * - Job Level (emp_JobLevelID): e.g., 'MGR', 'SPV', 'STF'
 * - Specific Combinations: e.g., only MGR from PC department
 * 
 * HOW ACCESS CONTROL WORKS:
 * 
 * 1. allowedUserIds - These users ALWAYS have access (bypass all other checks)
 * 
 * 2. specificCombinations - Define exact department + job level combinations
 *    Example: Only MGR from PC, but anyone from NT/PL:
 *    {
 *      allowedDepartments: ['NT', 'PL'],  // NT and PL: all job levels allowed
 *      allowedJobLevels: [],               // No general job level restriction
 *      specificCombinations: [
 *        { department: 'PC', jobLevel: 'MGR' }  // PC: only MGR allowed
 *      ]
 *    }
 * 
 * 3. allowedDepartments + allowedJobLevels - General criteria (uses AND logic)
 *    - User must be in an allowed department AND have an allowed job level
 *    - Empty array = all allowed for that criterion
 * 
 * ACCESS GRANTED IF:
 * - User ID in allowedUserIds, OR
 * - User matches any specificCombination, OR
 * - User matches allowedDepartments AND allowedJobLevels
 */

// Page-specific access configuration
export const PAGE_ACCESS = {
  // Landing/Home Page - Accessible to all authenticated users
  'home': {
    requireAuth: true, // Must be logged in
    allowedDepartments: [], // Empty = all departments allowed
    allowedUserIds: [], // Empty = all users allowed
    allowedJobLevels: [], // Empty = all job levels allowed
    // Specific department-role combinations (optional)
    // If specified, user must match at least one combination OR meet the general criteria above
    specificCombinations: [
      // Example: { department: 'PC', jobLevel: 'MGR' }
    ],
  },

  // Production Dashboard
  'production': {
    requireAuth: true,
    allowedDepartments: ['HQ', 'HC', 'PL', 'HC', 'DS'], // Full access for these departments
    allowedUserIds: ['HWA'], // Specific users who always have access
    allowedJobLevels: [], // No general job level restriction
    specificCombinations: [
      // PN1 - accessible for MGR, SPV, and OFC
      { department: 'PN1', jobLevel: 'MGR' },
      { department: 'PN1', jobLevel: 'SPV' },
      { department: 'PN1', jobLevel: 'OFC' },
      
      // PN2 - accessible for MGR, ASM, SPV, and OFC
      { department: 'PN2', jobLevel: 'MGR' },
      { department: 'PN2', jobLevel: 'ASM' },
      { department: 'PN2', jobLevel: 'SPV' },
      { department: 'PN2', jobLevel: 'OFC' },
      
      // QC - accessible for MGR, ASM, SPV, and OFC
      { department: 'QC', jobLevel: 'MGR' },
      { department: 'QC', jobLevel: 'ASM' },
      { department: 'QC', jobLevel: 'SPV' },
      { department: 'QC', jobLevel: 'OFC' },
      
      // MC - accessible for MGR, SPV, and OFC
      { department: 'MC', jobLevel: 'MGR' },
      { department: 'MC', jobLevel: 'SPV' },
      { department: 'MC', jobLevel: 'OFC' },
      
      // QA - accessible for MGR, SPV, and OFC
      { department: 'QA', jobLevel: 'MGR' },
      { department: 'QA', jobLevel: 'SPV' },
      { department: 'QA', jobLevel: 'OFC' },
      
      // PC - accessible for MGR, ASM, and SPV
      { department: 'PC', jobLevel: 'MGR' },
      { department: 'PC', jobLevel: 'ASM' },
      { department: 'PC', jobLevel: 'SPV' },
      { department: 'PC', jobLevel: 'OFC' },
      
      // WH - accessible for MGR, ASM, and SPV
      { department: 'WH', jobLevel: 'MGR' },
      { department: 'WH', jobLevel: 'ASM' },
      { department: 'WH', jobLevel: 'SPV' },
      { department: 'WH', jobLevel: 'OFC' },

      // NT - accessible for MGR, SPV, and OFC
      { department: 'NT', jobLevel: 'MGR' },
      { department: 'NT', jobLevel: 'SPV' },
      { department: 'NT', jobLevel: 'OFC' },

      { department: 'MS', jobLevel: 'MGR' },
    ],
  },

  // Line PN1 Dashboard
  'line-pn1': {
    requireAuth: true,
    allowedDepartments: ['HQ', 'PL', 'NT', 'HC', 'DS'], // Full access for these departments
    allowedUserIds: ['HWA'], // Specific users who always have access
    allowedJobLevels: [], // No general job level restriction
    specificCombinations: [
      // Example: { department: 'PC', jobLevel: 'MGR' }
      // Department PN1 access
      { department: 'PN1', jobLevel: 'MGR' },
      { department: 'PN1', jobLevel: 'SPV' },
      { department: 'PN1', jobLevel: 'OFC' },
      // Department NT access
      { department: 'NT', jobLevel: 'MGR' },
      { department: 'NT', jobLevel: 'SPV' },
      { department: 'NT', jobLevel: 'OFC' },
      // PC - accessible for MGR, ASM, and SPV
      { department: 'PC', jobLevel: 'MGR' },
      { department: 'PC', jobLevel: 'ASM' },
      { department: 'PC', jobLevel: 'SPV' },
      { department: 'PC', jobLevel: 'OFC' },

      { department: 'MS', jobLevel: 'MGR' },
    ],
  },

  // Line PN2 Dashboard
  'line-pn2': {
    requireAuth: true,
    allowedDepartments: ['HQ', 'PL', 'NT', 'HC', 'DS'], // Full access for these departments
    allowedUserIds: ['HWA'], // Specific users who always have access
    allowedJobLevels: [], // No general job level restriction
    specificCombinations: [
      // Example: { department: 'PC', jobLevel: 'MGR' }
      // Department PN2 access
      { department: 'PN2', jobLevel: 'MGR' },
      { department: 'PN2', jobLevel: 'ASM' },
      { department: 'PN2', jobLevel: 'SPV' },
      { department: 'PN2', jobLevel: 'OFC' },
      // Department NT access
      { department: 'NT', jobLevel: 'MGR' },
      { department: 'NT', jobLevel: 'SPV' },
      { department: 'NT', jobLevel: 'OFC' },
      // PC - accessible for MGR, ASM, and SPV
      { department: 'PC', jobLevel: 'MGR' },
      { department: 'PC', jobLevel: 'ASM' },
      { department: 'PC', jobLevel: 'SPV' },
      { department: 'PC', jobLevel: 'OFC' },

       { department: 'MS', jobLevel: 'MGR' },
    ],
  },

  'quality': {
    requireAuth: true,
    allowedDepartments: ['HQ', 'PL', 'NT', 'HC', 'DS'], // Full access for these departments
    allowedUserIds: ['HWA'], // Specific users who always have access
    allowedJobLevels: [], // No general job level restriction
    specificCombinations: [
      // Example: { department: 'PC', jobLevel: 'MGR' }
      { department: 'NT', jobLevel: 'MGR' },
      { department: 'NT', jobLevel: 'SPV' },
      { department: 'NT', jobLevel: 'OFC' },

      // QC - accessible for MGR, ASM, SPV, and OFC
      { department: 'QC', jobLevel: 'MGR' },
      { department: 'QC', jobLevel: 'ASM' },
      { department: 'QC', jobLevel: 'SPV' },
      { department: 'QC', jobLevel: 'OFC' },
      // MC - accessible for MGR, SPV, and OFC
      { department: 'MC', jobLevel: 'MGR' },
      { department: 'MC', jobLevel: 'SPV' },
      { department: 'MC', jobLevel: 'OFC' },
      // QA - accessible for MGR, SPV, and OFC
      { department: 'QA', jobLevel: 'MGR' },
      { department: 'QA', jobLevel: 'SPV' },
      { department: 'QA', jobLevel: 'OFC' },
      // PC - accessible for MGR, ASM, and SPV
      { department: 'PC', jobLevel: 'MGR' },
      { department: 'PC', jobLevel: 'ASM' },
      { department: 'PC', jobLevel: 'SPV' },
      { department: 'PC', jobLevel: 'OFC' },

       { department: 'MS', jobLevel: 'MGR' },
       { department: 'DS', jobLevel: 'DIR' },
    ],
  },

  // WIP Report Page
  'wip': {
    requireAuth: true,
    allowedDepartments: ['NT', 'PL', 'PC', 'HC', 'DS'],
    allowedUserIds: ['JDV', 'HWA'],
    allowedJobLevels: [],
    specificCombinations: [],
  },

  // PCT Reports (Monthly and Yearly)
  'pct-reports': {
    requireAuth: true,
    allowedDepartments: ['NT', 'PL', 'PC', 'HC', 'DS'],
    allowedUserIds: ['JDV', 'HWA'],
    allowedJobLevels: [],
    specificCombinations: [],
  },

  // Summary Dashboard
  'summary': {
    requireAuth: true,
    allowedDepartments: ['NT', 'PL', 'PC', 'HC', 'DS'],
    allowedUserIds: ['JDV', 'HWA'],
    allowedJobLevels: [],
    specificCombinations: [
      { department: 'DS', jobLevel: 'DIR' },
      { department: 'MS', jobLevel: 'MGR' },
    ],
  },

  // Stock Forecast Dashboard
  'stock-forecast': {
    requireAuth: true,
    allowedDepartments: ['NT', 'PL', 'PC', 'HC', 'DS'],
    allowedUserIds: ['JDV', 'HWA'],
    allowedJobLevels: [],
    specificCombinations: [],
  },

  // Reports Page
  'reports': {
    requireAuth: true,
    allowedDepartments: ['NT', 'PL', 'PC', 'HC', 'DS'],
    allowedUserIds: ['JDV', 'HWA'],
    allowedJobLevels: [],
    specificCombinations: [],
  },

  // Beta Page (legacy)
  'beta': {
    requireAuth: true,
    allowedDepartments: ['NT', 'PL', 'PC', 'HC', 'DS'],
    allowedUserIds: ['JDV', 'HWA'],
    allowedJobLevels: [],
    specificCombinations: [],
  },
};

/**
 * Check if user has access to a specific page
 * @param {string} pageName - The page identifier from PAGE_ACCESS
 * @param {object} user - User object containing emp_DeptID, log_NIK, emp_JobLevelID
 * @returns {object} { hasAccess: boolean, reason: string }
 */
export const checkPageAccess = (pageName, user) => {
  const pageConfig = PAGE_ACCESS[pageName];

  // If page config not found, deny access by default
  if (!pageConfig) {
    return { 
      hasAccess: false, 
      reason: 'Page configuration not found' 
    };
  }

  // If page doesn't require authentication, allow access
  if (!pageConfig.requireAuth) {
    return { 
      hasAccess: true, 
      reason: 'No authentication required' 
    };
  }

  // If no user object provided, deny access
  if (!user) {
    return { 
      hasAccess: false, 
      reason: 'User not authenticated' 
    };
  }

  // Extract user information
  const userDepartment = user?.emp_DeptID;
  const userId = user?.log_NIK;
  const userJobLevel = user?.emp_JobLevelID;

  // Check if user ID is in allowed list (always grants access regardless of other checks)
  if (pageConfig.allowedUserIds.length > 0 && userId && pageConfig.allowedUserIds.includes(userId)) {
    return { 
      hasAccess: true, 
      reason: 'User ID in allowed list' 
    };
  }

  // Check specific combinations first (if defined)
  // Specific combinations use OR logic with general criteria
  if (pageConfig.specificCombinations && pageConfig.specificCombinations.length > 0) {
    const matchesSpecificCombination = pageConfig.specificCombinations.some(combo => {
      const deptMatches = !combo.department || combo.department === userDepartment;
      const jobLevelMatches = !combo.jobLevel || combo.jobLevel === userJobLevel;
      const userIdMatches = !combo.userId || combo.userId === userId;
      
      return deptMatches && jobLevelMatches && userIdMatches;
    });

    if (matchesSpecificCombination) {
      return { 
        hasAccess: true, 
        reason: 'Matches specific combination criteria' 
      };
    }
  }

  // Check general criteria (department AND job level)
  // Empty arrays mean "all allowed" for that criterion
  
  // Check department access
  const hasDepartmentAccess = 
    pageConfig.allowedDepartments.length === 0 || // Empty = all allowed
    (userDepartment && pageConfig.allowedDepartments.includes(userDepartment));

  if (!hasDepartmentAccess) {
    return { 
      hasAccess: false, 
      reason: `Department '${userDepartment}' not authorized` 
    };
  }

  // Check job level access
  const hasJobLevelAccess = 
    pageConfig.allowedJobLevels.length === 0 || // Empty = all allowed
    (userJobLevel && pageConfig.allowedJobLevels.includes(userJobLevel));

  if (!hasJobLevelAccess) {
    return { 
      hasAccess: false, 
      reason: `Job level '${userJobLevel}' not authorized` 
    };
  }

  // All checks passed
  return { 
    hasAccess: true, 
    reason: 'Access granted' 
  };
};

/**
 * Quick access check - returns boolean only
 * @param {string} pageName - The page identifier
 * @param {object} user - User object
 * @returns {boolean}
 */
export const hasPageAccess = (pageName, user) => {
  return checkPageAccess(pageName, user).hasAccess;
};
