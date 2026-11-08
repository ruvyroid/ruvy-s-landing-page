import { readFile, writeFile } from 'node:fs/promises';
import { format } from 'prettier';
import { renderContent } from './content.mjs';

const page = new URL('../../index.html', import.meta.url);
const data = JSON.parse(
  await readFile(new URL('../data/content.json', import.meta.url), 'utf8'),
);
const before = await readFile(page, 'utf8');
const after = await format(renderContent(before, data), {
  parser: 'html',
  printWidth: 90,
  singleQuote: true,
  trailingComma: 'all',
});
if (process.argv.includes('--check')) {
  if (before !== after)
    throw new Error('HTML is out of sync. Run npm run sync in ruvy-project.');
  console.log('HTML matches content.json.');
} else {
  await writeFile(page, after);
  console.log('Updated index.html from content.json.');
}
