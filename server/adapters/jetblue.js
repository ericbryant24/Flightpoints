import { captureJsonResponse } from '../browser.js';
import { flightNumber, makeResult } from './common.js';

// jetblue.com "pay with points" search. TrueBlue awards are priced from the
// cash fare, so points costs move with cash prices.

const BUSINESS_CLASSES = new Set(['J', 'C', 'D', 'I']);

export function deepLink({ origin, destination, date }) {
  const params = new URLSearchParams({
    from: origin,
    to: destination,
    depart: date,
    isMultiCity: 'false',
    noOfRoute: '1',
    lang: 'en',
    adults: '1',
    children: '0',
    infants: '0',
    sharedMarket: 'false',
    roundTripFaresFlag: 'false',
    usePoints: 'true',
  });
  return `https://www.jetblue.com/booking/flights?${params}`;
}

function cabinFor(bundle) {
  if (/mint/i.test(bundle.code ?? '') || BUSINESS_CLASSES.has(bundle.cabinclass)) return 'business';
  return 'economy';
}

export function parseJetBlue(json) {
  const results = [];
  for (const itin of json?.itinerary ?? []) {
    const segments = (itin.segments ?? []).map((s) => ({
      from: s.from,
      to: s.to,
      departure: s.depart,
      arrival: s.arrive,
      carrier: s.operatingAirlineCode ?? 'B6',
      flightNumber: flightNumber(s.operatingAirlineCode ?? 'B6', s.flightno),
      aircraft: s.aircraft ?? null,
    }));
    if (segments.length === 0) continue;
    for (const bundle of itin.bundles ?? []) {
      const points = Number.parseInt(bundle.points, 10);
      if (bundle.status !== 'AVAILABLE' || !Number.isFinite(points) || points <= 0) continue;
      results.push(
        makeResult({
          program: 'jetblue',
          segments,
          cabin: cabinFor(bundle),
          miles: points,
          taxes: { amount: Number(bundle.fareTax ?? 0), currency: json.currency ?? 'USD' },
        }),
      );
    }
  }
  return results;
}

export default {
  id: 'jetblue',
  name: 'JetBlue TrueBlue',
  deepLink,
  async search(query, { withPage, capture }) {
    return withPage(async (page) => {
      const json = await captureJsonResponse(page, {
        url: deepLink(query),
        match: /outboundLFS/i,
      });
      await capture('jetblue', json);
      return parseJetBlue(json);
    });
  },
};
