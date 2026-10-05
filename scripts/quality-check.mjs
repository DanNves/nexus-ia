import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const roots = ['src', 'public'];
const extensions = new Set(['.ts', '.html', '.css']);
const forbidden = [
  { pattern: /!important\b/g, label: '!important' },
  { pattern: /100vh\b/g, label: '100vh' },
  { pattern: /\$any\(/g, label: '$any()' }
];

function files(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return extensions.has(path.slice(path.lastIndexOf('.'))) ? [path] : [];
  });
}

const violations = [];
for (const relativeRoot of roots) {
  const absoluteRoot = join(root, relativeRoot);
  if (!statSync(absoluteRoot).isDirectory()) continue;
  for (const file of files(absoluteRoot)) {
    const content = readFileSync(file, 'utf8');
    for (const rule of forbidden) {
      if (rule.pattern.test(content)) violations.push(`${file}: contém ${rule.label}`);
      rule.pattern.lastIndex = 0;
    }
  }
}

if (violations.length) {
  console.error('Quality gate falhou:');
  for (const violation of violations) console.error('- ' + violation);
  process.exit(1);
}

console.log('Quality gate NEXUS: sem !important, 100vh ou $any() em src/public.');
