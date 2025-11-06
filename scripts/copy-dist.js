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
  
  let copiedFiles = 0;
  let copiedDirs = 0;
  
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      const subResult = copyRecursive(srcPath, destPath);
      copiedFiles += subResult.files;
      copiedDirs += subResult.dirs + 1; // +1 for this directory
    } else {
      fs.copyFileSync(srcPath, destPath);
      copiedFiles++;
      // Log important files
      if (entry.name === 'app.js' || entry.name === 'server.js') {
        console.log(`✅ [Copy Script] Copied ${entry.name} to ${destPath}`);
      }
    }
  }
  
  return { files: copiedFiles, dirs: copiedDirs };
}

try {
  const result = copyRecursive(src, dest);
  console.log(`✅ [Copy Script] Successfully copied dist/ to api/dist/ (${result.files} files, ${result.dirs} directories)`);
  
  // Verify app.js was copied
  const appJsPath = path.join(dest, 'app.js');
  console.log('🔍 [Copy Script] Checking for app.js at:', appJsPath);
  if (fs.existsSync(appJsPath)) {
    console.log('✅ [Copy Script] Verified: api/dist/app.js exists');
    const stats = fs.statSync(appJsPath);
    console.log('✅ [Copy Script] app.js size:', stats.size, 'bytes');
  } else {
    console.error('❌ [Copy Script] Warning: api/dist/app.js not found after copy');
    console.error('❌ [Copy Script] Checking what files exist in api/dist/...');
    try {
      const files = fs.readdirSync(dest);
      console.error('❌ [Copy Script] Files in api/dist/:', files.slice(0, 10).join(', '));
      const appJsInSrc = path.join(src, 'app.js');
      console.error('🔍 [Copy Script] Checking if app.js exists in source:', appJsInSrc, 'exists:', fs.existsSync(appJsInSrc));
    } catch (e) {
      console.error('❌ [Copy Script] Error listing files:', e.message);
    }
  }
} catch (error) {
  console.error('❌ [Copy Script] Error copying files:', error);
  process.exit(1);
}

