const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const adminDir = path.join(process.cwd(), 'app', 'admin');

// Function to fix a file
async function fixFile(filePath) {
  try {
    console.log(`Fixing file: ${path.relative(process.cwd(), filePath)}`);
    
    let content = await readFile(filePath, 'utf8');
    
    // Remove the DashboardLayout import
    content = content.replace(/import\s+\{\s*DashboardLayout\s*\}\s*from\s*["']@\/components\/dashboard-layout["'];?(\r?\n)?/g, '');
    
    // Remove the DashboardLayout wrapper
    content = content.replace(/<DashboardLayout>\s*(\r?\n)?/g, '');
    content = content.replace(/\s*(\r?\n)*\s*<\/DashboardLayout>/g, '');
    
    // Write the updated content back to the file
    await writeFile(filePath, content, 'utf8');
    
    return { filePath, fixed: true };
  } catch (error) {
    console.error(`Error fixing file ${filePath}:`, error);
    return { filePath, fixed: false, error: error.message };
  }
}

// Function to check if a file needs fixing
async function checkFile(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    
    // Check if the file imports DashboardLayout
    const importsDashboardLayout = content.includes('import { DashboardLayout }') || 
                                 content.includes('import {DashboardLayout}');
    
    // Check if the file uses DashboardLayout wrapper
    const usesDashboardLayout = content.includes('<DashboardLayout>') && 
                              content.includes('</DashboardLayout>');
    
    if (importsDashboardLayout && usesDashboardLayout) {
      return { filePath, needsFix: true };
    }
    
    return { filePath, needsFix: false };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return { filePath, error: error.message };
  }
}

// Function to scan a directory for files that need fixing
async function scanDir(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    const results = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subResults = await scanDir(fullPath);
        results.push(...subResults);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
        // Skip layout.tsx files since they should have DashboardLayout
        if (entry.name === 'layout.tsx') continue;
        
        const result = await checkFile(fullPath);
        results.push(result);
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
    return [];
  }
}

async function main() {
  console.log('Scanning admin directory for pages with duplicate DashboardLayout...');
  
  const results = await scanDir(adminDir);
  const needsFix = results.filter(r => r.needsFix);
  
  console.log(`\nFound ${needsFix.length} file(s) that need to be fixed.`);
  
  if (needsFix.length === 0) {
    console.log('No files need fixing. All good!');
    return;
  }
  
  console.log('\nFiles to be fixed:');
  needsFix.forEach(file => {
    console.log(`- ${path.relative(process.cwd(), file.filePath)}`);
  });
  
  console.log('\nFixing files...');
  
  const fixResults = await Promise.all(needsFix.map(file => fixFile(file.filePath)));
  
  const successCount = fixResults.filter(r => r.fixed).length;
  const failCount = fixResults.filter(r => !r.fixed).length;
  
  console.log(`\nDone! Successfully fixed ${successCount} file(s).`);
  
  if (failCount > 0) {
    console.log(`Failed to fix ${failCount} file(s).`);
    fixResults.filter(r => !r.fixed).forEach(result => {
      console.log(`- ${path.relative(process.cwd(), result.filePath)}: ${result.error}`);
    });
  }
}

main().catch(console.error); 