// Local preview only. Exposes the page and its public assets, not the workspace.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
import { renderContent } from './content.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};
const qa = process.argv.includes('--qa');
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    );
    if (qa && pathname === '/__qa/no-js') {
      const html = await readFile(resolve(root, 'index.html'), 'utf8');
      response.writeHead(200, {
        'Content-Type': types['.html'],
        'Content-Security-Policy': "script-src 'none'",
      });
      response.end(html.replace('<head>', '<head><base href="/">'));
      return;
    }
    if (qa && pathname === '/__qa/dialog') {
      const html = await readFile(resolve(root, 'index.html'), 'utf8');
      const fixture = renderContent(html, {
        projects: [
          {
            published: true,
            title: 'Проверка диалога',
            video: 'ruvy-project/assets/qa-missing.webm',
          },
        ],
      });
      response.writeHead(200, { 'Content-Type': types['.html'] });
      response.end(fixture.replace('<head>', '<head><base href="/">'));
      return;
    }
    const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    const allowed =
      ['index.html', 'ruvy-project/styles.css', 'ruvy-project/app.js'].includes(
        relative,
      ) || relative.startsWith('ruvy-project/assets/');
    const path = resolve(root, relative);
    if (!allowed || !path.startsWith(root + sep)) {
      response.writeHead(404);
      response.end();
      return;
    }
    const body = await readFile(path);
    response.writeHead(200, {
      'Content-Type': types[extname(path)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});
server.listen(4192, '127.0.0.1', () =>
  console.log('Local preview: http://127.0.0.1:4192'),
);
