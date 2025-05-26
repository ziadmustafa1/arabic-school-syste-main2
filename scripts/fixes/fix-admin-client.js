// Script to fix non-awaited createAdminClient calls in the codebase
const fs = require('fs');
const path = require('path');

console.log('Starting to scan for files with non-awaited createAdminClient calls...');
const filesToFix = new Set();

// Recursively scan directories
const scanDirectory = (dir) => {
  console.log(`Scanning directory: ${dir}`);
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // Skip node_modules, .git, .next directories
          if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
            scanDirectory(filePath);
          }
        } else if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')) {
          // Check file content
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('const adminClient = await createAdminClient()')) {
            console.log(`Found issue in file: ${filePath}`);
            filesToFix.add(filePath);
          }
        }
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }
};

// Start scanning from current directory
scanDirectory('.');

console.log(`Found ${filesToFix.size} files to fix`);

// Fix each file
let fixedCount = 0;
filesToFix.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace non-awaited calls with awaited ones
    const newContent = content.replace(
      /const adminClient = createAdminClient\(\)/g, 
      'const adminClient = await createAdminClient()'
    );
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Fixed: ${filePath}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error.message);
  }
});

console.log(`Finished fixing ${fixedCount} files with adminClient calls`); 