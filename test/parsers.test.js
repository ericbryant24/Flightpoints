import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { deepLink as aaLink, parseAmerican } from '../server/adapters/american.js';
import { deepLink as b6Link, parseJetBlue } from '../server/adapters/jetblue.js';

const fixture = async (name) =>
  JSON.parse(await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

test('parseAmerican keeps available cabins and connecting partner flights', async () => {
  const results = parseAmerican(await fixture('american'));
  assert.equal(results.length, 3);

  const business = results.find((r) => r.cabin === 'business');
  assert.deepEqual(business.flightNumbers, ['AA100']);
  assert.equal(business.miles, 57500);
  assert.equal(business.taxes.amount, 205.6);
  assert.equal(business.seats, 2);
  assert.equal(business.segments[0].aircraft, 'Boeing 777-300ER');

  const connection = results.find((r) => r.cabin === 'premium');
  assert.equal(connection.stops, 1);
  assert.deepEqual(connection.carriers, ['AA', 'BA']);
  assert.deepEqual(connection.flightNumbers, ['AA2012', 'BA192']);
  assert.equal(connection.origin, 'JFK');
  assert.equal(connection.destination, 'LHR');
});

test('parseAmerican treats error 309 as no results and throws on others', () => {
  assert.deepEqual(parseAmerican({ error: '309' }), []);
  assert.throws(() => parseAmerican({ error: '500' }), /aa\.com error 500/);
});

test('parseJetBlue maps Mint to business and skips unavailable bundles', async () => {
  const results = parseJetBlue(await fixture('jetblue'));
  assert.deepEqual(
    results.map((r) => [r.cabin, r.miles]),
    [['economy', 9800], ['economy', 11900], ['business', 52000]],
  );
  assert.deepEqual(results[0].flightNumbers, ['B623']);
  assert.equal(results[0].taxes.amount, 5.6);
});

test('deep links carry the search', () => {
  const q = { origin: 'JFK', destination: 'LHR', date: '2026-11-02' };
  const aa = new URL(aaLink(q));
  assert.equal(aa.searchParams.get('searchType'), 'Award');
  assert.deepEqual(JSON.parse(aa.searchParams.get('slices'))[0], {
    orig: 'JFK', origNearby: false, dest: 'LHR', destNearby: false, date: '2026-11-02',
  });
  const b6 = new URL(b6Link(q));
  assert.equal(b6.searchParams.get('usePoints'), 'true');
  assert.equal(b6.searchParams.get('depart'), '2026-11-02');
});
