import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultAdapters } from './adapters/index.js';
import { browserRuntime, closeBrowser } from './browser.js';
import { PARTNERS, ratioLabel } from './data/citi.js';
import { QueryError, runSearch } from './search.js';

const WEB_DIR = fileURLToPath(new URL('../web/', import.meta.url));
const STATIC_FILES = new Map([
  ['/', 'index.html'],
  ['/app.js', 'app.js'],
  ['/styles.css', 'styles.css'],
]);
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};
const MAX_BODY_BYTES = 64 * 1024;

function sendJson(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new QueryError('Request body too large');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new QueryError('Request body must be JSON');
  }
}

export function createApp({ adapters = defaultAdapters(), runtime = browserRuntime } = {}) {
  return createServer(async (req, res) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (req.method === 'GET' && STATIC_FILES.has(pathname)) {
        const file = STATIC_FILES.get(pathname);
        const body = await readFile(join(WEB_DIR, file));
        res.writeHead(200, { 'content-type': CONTENT_TYPES[extname(file)] });
        return res.end(body);
      }
      if (req.method === 'GET' && pathname === '/api/programs') {
        return sendJson(res, 200, {
          demo: adapters.some((a) => a.demo),
          adapters: adapters.map((a) => ({ id: a.id, name: a.name })),
          partners: PARTNERS.map((p) => ({ ...p, ratio: ratioLabel(p) })),
        });
      }
      if (req.method === 'POST' && pathname === '/api/search') {
        const body = await readJsonBody(req);
        return sendJson(res, 200, await runSearch(body, { adapters, runtime }));
      }
      sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      if (err instanceof QueryError) return sendJson(res, 400, { error: err.message });
      console.error(err);
      sendJson(res, 500, { error: 'Internal error' });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4310);
  // Bind to localhost only: this app drives a browser holding your airline logins.
  const server = createApp().listen(port, '127.0.0.1', () => {
    console.log(`Flightpoints running at http://localhost:${port}`);
    if (process.env.FP_DEMO === '1') console.log('Demo mode: results are fake.');
  });
  const shutdown = async () => {
    server.close();
    await closeBrowser();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
