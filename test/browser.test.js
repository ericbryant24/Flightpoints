import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { parseAmerican } from '../server/adapters/american.js';
import { captureJsonResponse } from '../server/browser.js';

// Exercises the real browser plumbing against a fake airline site whose page
// calls its own search API, the way aa.com's front end does.

let browser;
let site;
let base;
let skip = false;

before(async () => {
  try {
    const { chromium } = await import('playwright');
    browser = await chromium.launch({ executablePath: process.env.FP_CHROMIUM_PATH || undefined });
  } catch (err) {
    skip = `no browser available (${err.message.split('\n')[0]})`;
    return;
  }
  const fixture = await readFile(new URL('./fixtures/american.json', import.meta.url));
  site = createServer((req, res) => {
    if (req.url.startsWith('/booking/api/search/itinerary')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(fixture);
    }
    if (req.url.startsWith('/broken/api/search/itinerary')) {
      res.writeHead(403);
      return res.end();
    }
    const api = req.url.startsWith('/broken') ? '/broken/api/search/itinerary' : '/booking/api/search/itinerary';
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<script>setTimeout(() => fetch('${api}', { method: 'POST', body: '{}' }), 50)</script>`);
  });
  await new Promise((resolve) => site.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${site.address().port}`;
});

after(async () => {
  await browser?.close();
  site?.close();
});

test('captures and parses the search response a page fetches', async (t) => {
  if (skip) return t.skip(skip);
  const page = await browser.newPage();
  const json = await captureJsonResponse(page, {
    url: `${base}/booking/search`,
    match: /\/booking\/api\/search\/itinerary/,
  });
  assert.equal(parseAmerican(json).length, 3);
  await page.close();
});

test('reports HTTP errors from the airline API', async (t) => {
  if (skip) return t.skip(skip);
  const page = await browser.newPage();
  await assert.rejects(
    captureJsonResponse(page, { url: `${base}/broken`, match: /\/api\/search\/itinerary/ }),
    /returned HTTP 403/,
  );
  await page.close();
});

test('times out with a helpful message when no search call happens', async (t) => {
  if (skip) return t.skip(skip);
  const page = await browser.newPage();
  await assert.rejects(
    captureJsonResponse(page, { url: `${base}/booking/search`, match: /never-called/, timeoutMs: 1500 }),
    /No search response from the airline site/,
  );
  await page.close();
});
