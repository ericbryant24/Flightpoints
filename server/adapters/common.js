export const CABINS = ['economy', 'premium', 'business', 'first'];

// Builds the normalized result shape every adapter returns.
export function makeResult({ program, segments, cabin, miles, taxes, seats = null }) {
  const first = segments[0];
  const last = segments[segments.length - 1];
  return {
    program,
    origin: first.from,
    destination: last.to,
    departure: first.departure,
    arrival: last.arrival,
    stops: segments.length - 1,
    flightNumbers: segments.map((s) => s.flightNumber),
    carriers: [...new Set(segments.map((s) => s.carrier).filter(Boolean))],
    segments,
    cabin,
    miles: Number(miles),
    taxes: { amount: taxes?.amount ?? null, currency: taxes?.currency ?? 'USD' },
    seats,
  };
}

export function flightNumber(carrier, number) {
  const n = String(number ?? '').trim();
  // Already prefixed with an airline code (e.g. "B6123", "U2123")?
  if (/^([A-Z]{2}|[A-Z]\d|\d[A-Z])\d+$/.test(n)) return n;
  return `${carrier ?? ''}${n}`;
}
