// scripts/copy-dist.js
// Cross-platform script to copy dist/ to api/dist/
const fs = require('fs');
const path = require('path');

const src = path.join(process.cwd(), 'dist');
const dest = path.join(process.cwd(), 'api', 'dist');

console.log('📦 [Copy Script] Copying dist/ to api/dist/...');
console.log('📦 [Copy Script] Source:', src);
console.log('📦 [Copy Script] Destination:', dest);

if (!fs.existsSync(src)) {
  console.error('❌ [Copy Script] Source directory does not exist:', src);
  process.exit(1);
}

// Create destination directory if it doesn't exist
if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
  console.log('✅ [Copy Script] Created destination directory:', dest);
}

// Recursive copy function
function copyRecursive(srcDir, destDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  copyRecursive(src, dest);
  console.log('✅ [Copy Script] Successfully copied dist/ to api/dist/');
  
  // Verify app.js was copied
  const appJsPath = path.join(dest, 'app.js');
  if (fs.existsSync(appJsPath)) {
    console.log('✅ [Copy Script] Verified: api/dist/app.js exists');
  } else {
    console.error('❌ [Copy Script] Warning: api/dist/app.js not found after copy');
  }
} catch (error) {
  console.error('❌ [Copy Script] Error copying files:', error);
  process.exit(1);
}

