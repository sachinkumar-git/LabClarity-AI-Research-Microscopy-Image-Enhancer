#!/usr/bin/env node
/**
 * Enforces the project rule: every source file must stay within MAX_LINES.
 * Usage: node scripts/check-lines.mjs [maxLines]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_LINES = Number(process.argv[2]) || 150;
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SOURCE_EXTS = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.py', '.css']);
const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.venv', 'venv', '__pycache__', 'dist', 'build', 'coverage', 'storage', 'weights',
]);

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) files.push(...collectFiles(fullPath));
    else if (SOURCE_EXTS.has(extname(entry))) files.push(fullPath);
  }
  return files;
}

function countLines(file) {
  const content = readFileSync(file, 'utf8');
  return content.length === 0 ? 0 : content.trimEnd().split(/\r?\n/).length;
}

const files = collectFiles(ROOT);
const violations = files
  .map((file) => ({ file: relative(ROOT, file), lines: countLines(file) }))
  .filter(({ lines }) => lines > MAX_LINES);

if (violations.length > 0) {
  console.error(`✖ ${violations.length} file(s) exceed ${MAX_LINES} lines:`);
  violations.forEach(({ file, lines }) => console.error(`  ${file}: ${lines}`));
  process.exit(1);
}
console.log(`✔ All ${files.length} source files are within ${MAX_LINES} lines.`);
