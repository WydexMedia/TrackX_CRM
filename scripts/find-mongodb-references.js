/*
  Script to find all remaining MongoDB references in the codebase
  Usage: node scripts/find-mongodb-references.js
*/

const fs = require('fs');
const path = require('path');

const keywords = [
  'MongoClient',
  'MongoDB',
  'mongodb',
  'getMongoDb',
  'getMongoClient',
  'mongoClient',
  'mongoDb',
  'mongo',
  'ObjectId',
  'MONGODB_URI',
  'collection(',
  '.find(',
  '.findOne(',
  '.insertOne(',
  '.updateOne(',
  '.deleteOne(',
  '.toArray()'
];

function searchFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [];
    
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          matches.push({
            keyword,
            line: index + 1,
            content: line.trim()
          });
        }
      });
    });
    
    return matches.length > 0 ? { file: filePath, matches } : null;
  } catch (error) {
    return null;
  }
}

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  files.forEach(file => {
    const filePath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file.name)) {
        walkDir(filePath, fileList);
      }
    } else if (
      (file.name.endsWith('.js') || 
       file.name.endsWith('.ts') || 
       file.name.endsWith('.tsx') || 
       file.name.endsWith('.jsx')) &&
      !file.name.includes('migrate-mongodb') &&
      !file.name.includes('inspect-mongodb')
    ) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const srcDir = path.join(__dirname, '../src');
const files = walkDir(srcDir);

console.log('🔍 Searching for MongoDB references...\n');
console.log('='.repeat(60));

const results = [];

files.forEach(file => {
  const result = searchFile(file);
  if (result) {
    results.push(result);
  }
});

if (results.length === 0) {
  console.log('✅ No MongoDB references found!');
} else {
  console.log(`\n📋 Found ${results.length} files with MongoDB references:\n`);
  
  results.forEach(result => {
    console.log(`\n📁 ${result.file}`);
    console.log(`   ${result.matches.length} matches found:`);
    result.matches.forEach(match => {
      console.log(`   Line ${match.line}: ${match.keyword}`);
      console.log(`   ${match.content.substring(0, 80)}...`);
    });
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary: ${results.length} files need MongoDB removal\n`);
}

// Write results to file
fs.writeFileSync(
  'mongodb-references-report.json',
  JSON.stringify(results, null, 2)
);

console.log('\n✅ Report saved to: mongodb-references-report.json\n');

