import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

function findTestFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const testFiles = findTestFiles('tests');
const isCoverage = process.argv.includes('--coverage');

const args = ['--import', 'tsx', '--test'];
if (isCoverage) {
  args.push('--experimental-test-coverage');
}
args.push(...testFiles);

const child = spawn(process.execPath, args, { stdio: 'inherit' });
child.on('close', (code) => {
  process.exit(code ?? 0);
});
