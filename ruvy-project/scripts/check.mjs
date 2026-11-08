import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
function bin(name, key = name) {
  const packagePath = require.resolve(`${name}/package.json`);
  const info = JSON.parse(readFileSync(packagePath, 'utf8'));
  return resolve(
    dirname(packagePath),
    typeof info.bin === 'string' ? info.bin : info.bin[key],
  );
}
const commands = [
  ['scripts/sync-content.mjs', '--check'],
  [
    bin('prettier'),
    '--config',
    '.prettierrc.json',
    '--check',
    '../index.html',
    'styles.css',
    'app.js',
    'data/content.json',
    'scripts/*.mjs',
    '*.json',
    '*.js',
    'README.md',
  ],
  [bin('eslint'), 'app.js', 'scripts/*.mjs'],
  [bin('stylelint'), 'styles.css'],
  [bin('html-validate'), '--config', '.htmlvalidate.json', '../index.html'],
  ['--test', 'scripts/content.test.mjs'],
];
for (const command of commands) {
  const result = spawnSync(process.execPath, command, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
