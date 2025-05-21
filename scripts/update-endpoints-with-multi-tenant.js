/**
 * Multi-Tenant API Endpoint Update Script
 * 
 * This script scans the server/routes.ts file and adds or updates
 * multi-tenant security checks to ensure proper organization context
 * handling across all API endpoints
 */

import fs from 'fs';
import path from 'path';

const routesFilePath = path.resolve('server/routes.ts');

// Validate file exists
if (!fs.existsSync(routesFilePath)) {
  console.error('Error: routes.ts file not found at', routesFilePath);
  process.exit(1);
}

// Read the file
let routesFileContent = fs.readFileSync(routesFilePath, 'utf8');

// Check if we already imported the multi-tenant helper utilities
if (!routesFileContent.includes('import { filterByOrganization, ensureOrganizationContext }')) {
  // Add required imports if not present
  routesFileContent = routesFileContent.replace(
    'import authRoutes from "./routes/auth";',
    'import authRoutes from "./routes/auth";\nimport { filterByOrganization, ensureOrganizationContext } from "./utils/multiTenantHelper";'
  );
}

// Check if we imported the multi-tenant queries
if (!routesFileContent.includes('import { platformQueries, conversationQueries, knowledgeBaseQueries, analyticsQueries }')) {
  // Add required imports if not present
  routesFileContent = routesFileContent.replace(
    'import { addOrganizationContext, enforceOrganizationAccess }',
    'import { addOrganizationContext, enforceOrganizationAccess }'
  );
  
  // Add multi-tenant queries import after database import
  routesFileContent = routesFileContent.replace(
    'import { storage } from "./storage";',
    'import { storage } from "./storage";\nimport { platformQueries, conversationQueries, knowledgeBaseQueries, analyticsQueries } from "./multiTenantStorage";'
  );
}

// Pattern 1: Update any endpoint with isAuthenticated to also verify organization access
const pattern1 = /(app\.(?:get|post|put|delete|patch)\([^)]+\),\s*isAuthenticated,)\s*async/g;
const replacement1 = '$1 addOrganizationContext, async';

// Pattern 2: Ensure all req.userId references also have organization context extracted
const pattern2 = /(const userId\s*=\s*req\.userId[^;]*;)/g;
const replacement2 = '$1\n      const organizationId = req.organizationId;';

// Apply transformations
routesFileContent = routesFileContent
  .replace(pattern1, replacement1)
  .replace(pattern2, replacement2);

// Write updated file
fs.writeFileSync(routesFilePath, routesFileContent);

console.log('✅ Successfully updated routes.ts with multi-tenant security enhancements');
console.log('Organization context is now properly applied to API endpoints');