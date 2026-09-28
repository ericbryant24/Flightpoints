import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import demo from '../server/adapters/demo.js';
import { createApp } from '../server/index.js';

let server;
let base;

before(async () => {
  server = createApp({ adapters: [demo], runtime: {} });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('serves the UI', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Flightpoints/);
});

test('lists programs and flags demo mode', async () => {
  const body = await (await fetch(`${base}/api/programs`)).json();
  assert.equal(body.demo, true);
  assert.ok(body.partners.some((p) => p.id === 'virgin' && p.ratio === '1:1'));
});

test('searches end to end', async () => {
  const res = await fetch(`${base}/api/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ origin: 'JFK', destination: 'CDG', date: '2026-11-02', cabin: 'business' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.results.length > 0);
  assert.ok(body.results.every((r) => r.cabin === 'business' && r.citiPoints >= r.miles));
  assert.ok(body.results.every((r) => /^[A-Z0-9]{2}\d+$/.test(r.flightNumbers[0])));
});

test('returns 400 for invalid searches', async () => {
  const res = await fetch(`${base}/api/search`, { method: 'POST', body: '{"origin":"X"}' });
  assert.equal(res.status, 400);
  assert.match((await res.json()).error, /Origin/);
});
