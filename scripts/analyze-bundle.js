#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing bundle size...\n');

try {
  // Build the application
  console.log('📦 Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Analyze the build output
  const buildDir = path.join(process.cwd(), '.next');
  
  if (!fs.existsSync(buildDir)) {
    console.error('❌ Build directory not found. Make sure the build completed successfully.');
    process.exit(1);
  }
  
  // Get build manifest
  const manifestPath = path.join(buildDir, 'build-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    console.log('\n📊 Bundle Analysis:');
    console.log('==================');
    
    // Analyze pages
    Object.entries(manifest.pages).forEach(([page, files]) => {
      console.log(`\n📄 ${page}:`);
      let totalSize = 0;
      
      files.forEach(file => {
        const filePath = path.join(buildDir, 'static', file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const sizeKB = (stats.size / 1024).toFixed(2);
          totalSize += stats.size;
          console.log(`  ${file}: ${sizeKB} KB`);
        }
      });
      
      console.log(`  Total: ${(totalSize / 1024).toFixed(2)} KB`);
    });
    
    // Analyze polyfills
    if (manifest.polyfillFiles) {
      console.log('\n🔧 Polyfills:');
      let polyfillSize = 0;
      manifest.polyfillFiles.forEach(file => {
        const filePath = path.join(buildDir, 'static', file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          const sizeKB = (stats.size / 1024).toFixed(2);
          polyfillSize += stats.size;
          console.log(`  ${file}: ${sizeKB} KB`);
        }
      });
      console.log(`  Total: ${(polyfillSize / 1024).toFixed(2)} KB`);
    }
  }
  
  // Check for large files
  console.log('\n🔍 Large Files (>100KB):');
  console.log('========================');
  
  const staticDir = path.join(buildDir, 'static');
  if (fs.existsSync(staticDir)) {
    const findLargeFiles = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
          findLargeFiles(filePath);
        } else if (stats.size > 100 * 1024) {
          const sizeKB = (stats.size / 1024).toFixed(2);
          const relativePath = path.relative(buildDir, filePath);
          console.log(`  ${relativePath}: ${sizeKB} KB`);
        }
      });
    };
    
    findLargeFiles(staticDir);
  }
  
  // Performance recommendations
  console.log('\n💡 Performance Recommendations:');
  console.log('===============================');
  console.log('1. Consider code splitting for large pages');
  console.log('2. Use dynamic imports for heavy components');
  console.log('3. Optimize images and use Next.js Image component');
  console.log('4. Remove unused dependencies');
  console.log('5. Use tree shaking for better bundle optimization');
  console.log('6. Consider using React.lazy() for route-based code splitting');
  
} catch (error) {
  console.error('❌ Bundle analysis failed:', error.message);
  process.exit(1);
}





