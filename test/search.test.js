import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeResult } from '../server/adapters/common.js';
import { QueryError, runSearch } from '../server/search.js';

const query = { origin: 'jfk', destination: 'lhr', date: '2026-11-02' };

function fare(program, flight, cabin, miles, taxes = 5.6) {
  return makeResult({
    program,
    segments: [{ from: 'JFK', to: 'LHR', departure: '2026-11-02T18:00', arrival: '2026-11-03T06:00', carrier: flight.slice(0, 2), flightNumber: flight }],
    cabin,
    miles,
    taxes: { amount: taxes, currency: 'USD' },
  });
}

const adapter = (id, fn) => ({ id, name: id, search: fn });

test('prices results in Citi points, sorts cheapest first and flags balance', async () => {
  const adapters = [
    adapter('american', async () => [fare('american', 'AA100', 'business', 57500)]),
    adapter('emirates', async () => [fare('emirates', 'EK2', 'business', 40000)]),
  ];
  const { results, sources } = await runSearch({ ...query, balance: 55000 }, { adapters });

  assert.deepEqual(results.map((r) => [r.program, r.citiPoints, r.affordable]), [
    ['emirates', 50000, true],
    ['american', 58000, false],
  ]);
  assert.equal(results[0].ratio, '5:4');
  assert.ok(sources.every((s) => s.ok));
});

test('one failing adapter does not sink the search', async () => {
  const adapters = [
    adapter('american', async () => [fare('american', 'AA100', 'economy', 30000)]),
    adapter('jetblue', async () => { throw new Error('bot check'); }),
  ];
  const { results, sources } = await runSearch(query, { adapters });
  assert.equal(results.length, 1);
  assert.deepEqual(sources.map((s) => [s.id, s.ok, s.error]), [
    ['american', true, null],
    ['jetblue', false, 'bot check'],
  ]);
});

test('slow adapters time out', async () => {
  const adapters = [adapter('american', () => new Promise(() => {}))];
  const { sources } = await runSearch(query, { adapters, timeoutMs: 20 });
  assert.match(sources[0].error, /Timed out/);
});

test('filters by cabin and program, keeps cheapest duplicate', async () => {
  const adapters = [
    adapter('american', async () => [
      fare('american', 'AA100', 'business', 70000),
      fare('american', 'AA100', 'business', 57500),
      fare('american', 'AA100', 'economy', 30000),
    ]),
    adapter('jetblue', async () => { throw new Error('should not run'); }),
  ];
  const { results, sources } = await runSearch(
    { ...query, cabin: 'business', programs: ['american'] },
    { adapters },
  );
  assert.deepEqual(results.map((r) => r.miles), [57500]);
  assert.deepEqual(sources.map((s) => s.id), ['american']);
});

test('manual links cover every Citi airline partner', async () => {
  const { links } = await runSearch(query, { adapters: [] });
  assert.equal(links.length, 15);
  assert.ok(links.find((l) => l.program === 'american').prefilled);
  assert.equal(links.find((l) => l.program === 'turkish').url, 'https://www.turkishairlines.com/');
});

test('rejects bad input', async () => {
  for (const bad of [
    { ...query, origin: 'JF' },
    { ...query, destination: 'JFK' },
    { ...query, date: '11/02/2026' },
    { ...query, cabin: 'suite' },
    { ...query, balance: -5 },
  ]) {
    await assert.rejects(runSearch(bad, { adapters: [] }), QueryError);
  }
});
