#!/usr/bin/env node

/**
 * Script to remove all authenticatedFetch imports and replace with fetch
 * Usage: node scripts/remove-authenticatedFetch.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = [
  'src/app/team-leader/team-management/page.tsx',
  'src/app/team-leader/tasks/page.tsx',
  'src/app/team-leader/leads/[phone]/page.tsx',
  'src/app/team-leader/leads/AddLeadModals.tsx',
  'src/app/team-leader/reports/page.tsx',
  'src/app/team-leader/leads/page.tsx',
  'src/app/team-leader/queue/page.tsx',
  'src/components/tasks/TaskList.tsx',
  'src/components/tasks/LeadModal.tsx',
  'src/app/team-leader/kpis/page.tsx',
  'src/app/team-leader/settings/page.tsx',
  'src/app/team-leader/profile/page.tsx',
  'src/app/team-leader/analytics/page.tsx',
  'src/app/team-leader/integrations/page.tsx',
  'src/app/admin/tenants/[id]/page.tsx',
  'src/app/admin/tenants/page.tsx',
  'src/app/team-leader/daily-leaderboard/page.tsx',
  'src/app/team-leader/automations/page.tsx',
  'src/app/team-leader/agents/page.tsx',
  'src/app/team-leader/leads/ListCreateModal.tsx',
];

const projectRoot = path.join(__dirname, '..');

files.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove imports
  const importPatterns = [
    /import\s+{\s*authenticatedFetch\s*}\s+from\s+["']@\/lib\/tokenValidation["'];?\n?/g,
    /import\s+{\s*setupPeriodicTokenValidation,\s*authenticatedFetch\s*}\s+from\s+["']@\/lib\/tokenValidation["'];?\n?/g,
    /import\s+{\s*authenticatedFetch,\s*setupPeriodicTokenValidation\s*}\s+from\s+["']@\/lib\/tokenValidation["'];?\n?/g,
  ];

  importPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '// Clerk handles authentication automatically via cookies - no need for authenticatedFetch\n');
      modified = true;
    }
  });

  // Replace authenticatedFetch with fetch
  if (content.includes('authenticatedFetch')) {
    content = content.replace(/authenticatedFetch/g, 'fetch');
    modified = true;
  }

  // Remove setupPeriodicTokenValidation calls
  if (content.includes('setupPeriodicTokenValidation')) {
    content = content.replace(/setupPeriodicTokenValidation\([^)]+\);?/g, '// Clerk handles authentication automatically');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${file}`);
  } else {
    console.log(`⏭️  Skipped ${file} - no changes needed`);
  }
});

console.log('\n✅ Done! All authenticatedFetch imports and calls have been removed.');


