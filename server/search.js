import { CABINS } from './adapters/common.js';
import { LIVE_ADAPTERS } from './adapters/index.js';
import { PARTNERS, PARTNERS_BY_ID, citiPointsNeeded, ratioLabel } from './data/citi.js';

const DEFAULT_TIMEOUT_MS = 120_000;

export class QueryError extends Error {}

export function parseQuery(input = {}) {
  const origin = String(input.origin ?? '').trim().toUpperCase();
  const destination = String(input.destination ?? '').trim().toUpperCase();
  const date = String(input.date ?? '').trim();
  const cabin = input.cabin ? String(input.cabin) : 'any';
  const balance = input.balance === undefined || input.balance === '' ? null : Number(input.balance);

  if (!/^[A-Z]{3}$/.test(origin)) throw new QueryError('Origin must be a 3-letter airport code');
  if (!/^[A-Z]{3}$/.test(destination)) throw new QueryError('Destination must be a 3-letter airport code');
  if (origin === destination) throw new QueryError('Origin and destination must differ');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    throw new QueryError('Date must be YYYY-MM-DD');
  }
  if (cabin !== 'any' && !CABINS.includes(cabin)) throw new QueryError(`Unknown cabin "${cabin}"`);
  if (balance !== null && (!Number.isFinite(balance) || balance < 0)) {
    throw new QueryError('Balance must be a positive number');
  }
  const programs = Array.isArray(input.programs) ? input.programs.map(String) : null;
  return { origin, destination, date, cabin, balance, programs };
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${Math.round(ms / 1000)}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function resultKey(r) {
  return `${r.program}|${r.flightNumbers.join(',')}|${r.departure}|${r.cabin}`;
}

// Keeps the cheapest fare for each flight/cabin/program combination.
function dedupe(results) {
  const best = new Map();
  for (const r of results) {
    const key = resultKey(r);
    const prev = best.get(key);
    if (!prev || r.miles < prev.miles) best.set(key, r);
  }
  return [...best.values()];
}

function manualLinks(query) {
  const adapterById = new Map(LIVE_ADAPTERS.map((a) => [a.id, a]));
  return PARTNERS.filter((p) => p.type === 'airline').map((p) => ({
    program: p.id,
    name: p.name,
    ratio: ratioLabel(p),
    url: adapterById.get(p.id)?.deepLink?.(query) ?? p.url,
    prefilled: Boolean(adapterById.get(p.id)?.deepLink),
  }));
}

export async function runSearch(input, { adapters, runtime, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const query = parseQuery(input);
  const selected = query.programs ? adapters.filter((a) => query.programs.includes(a.id)) : adapters;

  const settled = await Promise.all(
    selected.map(async (adapter) => {
      const started = Date.now();
      try {
        const results = await withTimeout(adapter.search(query, runtime), timeoutMs);
        return { adapter, results, ms: Date.now() - started };
      } catch (err) {
        return { adapter, results: [], error: err.message || String(err), ms: Date.now() - started };
      }
    }),
  );

  const sources = settled.map(({ adapter, results, error, ms }) => ({
    id: adapter.id,
    name: adapter.name,
    ok: !error,
    count: results.length,
    error: error ?? null,
    ms,
  }));

  const results = dedupe(settled.flatMap((s) => s.results))
    .filter((r) => query.cabin === 'any' || r.cabin === query.cabin)
    .flatMap((r) => {
      const partner = PARTNERS_BY_ID.get(r.program);
      if (!partner) return [];
      const citiPoints = citiPointsNeeded(r.miles, partner);
      return [
        {
          ...r,
          programName: partner.name,
          ratio: ratioLabel(partner),
          citiPoints,
          affordable: query.balance === null ? null : citiPoints <= query.balance,
        },
      ];
    })
    .sort((a, b) => a.citiPoints - b.citiPoints || (a.taxes.amount ?? 0) - (b.taxes.amount ?? 0));

  return { query, results, sources, links: manualLinks(query) };
}
