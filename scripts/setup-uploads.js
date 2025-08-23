const fs = require('fs');
const path = require('path');

// Create uploads directory structure
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const logosDir = path.join(uploadsDir, 'logos');

// Create directories if they don't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
  console.log('✅ Created logos directory');
}

console.log('📁 Uploads directory structure ready!');
console.log('   - public/uploads/');
console.log('   - public/uploads/logos/');
console.log('');
console.log('💡 Logos will be stored in: public/uploads/logos/{tenantId}/logo.{extension}'); 