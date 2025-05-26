const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const adminDir = path.join(process.cwd(), 'app', 'admin');

async function scanFile(filePath) {
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
        
        const result = await scanFile(fullPath);
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
  
  console.log('\nFiles that need to be fixed:');
  needsFix.forEach(file => {
    console.log(`- ${path.relative(process.cwd(), file.filePath)}`);
  });
  
  console.log(`\nTotal: ${needsFix.length} file(s) need to be fixed.`);
}

main().catch(console.error); 