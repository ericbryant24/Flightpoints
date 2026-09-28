import { captureJsonResponse } from '../browser.js';
import { flightNumber, makeResult } from './common.js';

// aa.com award search. AAdvantage also prices many oneworld partner flights
// (British Airways, Qatar, JAL, Iberia, ...), which appear in these results.

const CABIN_BY_PRODUCT = {
  COACH: 'economy',
  PREMIUM_ECONOMY: 'premium',
  BUSINESS: 'business',
  FIRST: 'first',
};

// aa.com reports "no flights found" as error 309 rather than an empty list.
const NO_RESULTS_ERROR = '309';

export function deepLink({ origin, destination, date }) {
  const slices = JSON.stringify([
    { orig: origin, origNearby: false, dest: destination, destNearby: false, date },
  ]);
  const params = new URLSearchParams({
    locale: 'en_US',
    pax: '1',
    adult: '1',
    type: 'OneWay',
    searchType: 'Award',
    cabin: '',
    carriers: 'ALL',
    slices,
  });
  return `https://www.aa.com/booking/search?${params}`;
}

export function parseAmerican(json) {
  if (json?.error && String(json.error) !== NO_RESULTS_ERROR) {
    throw new Error(`aa.com error ${json.error}`);
  }
  const results = [];
  for (const slice of json?.slices ?? []) {
    const segments = (slice.segments ?? []).map((s) => ({
      from: s.origin?.code,
      to: s.destination?.code,
      departure: s.departureDateTime,
      arrival: s.arrivalDateTime,
      carrier: s.flight?.carrierCode,
      flightNumber: flightNumber(s.flight?.carrierCode, s.flight?.flightNumber),
      aircraft: s.legs?.[0]?.aircraft?.name ?? null,
    }));
    if (segments.length === 0) continue;
    for (const price of slice.pricingDetail ?? []) {
      const cabin = CABIN_BY_PRODUCT[price.productType];
      if (!price.productAvailable || !cabin || !price.perPassengerAwardPoints) continue;
      results.push(
        makeResult({
          program: 'american',
          segments,
          cabin,
          miles: price.perPassengerAwardPoints,
          taxes: {
            amount: price.perPassengerTaxesAndFees?.amount ?? null,
            currency: price.perPassengerTaxesAndFees?.currency ?? 'USD',
          },
          seats: price.seatsRemaining ?? null,
        }),
      );
    }
  }
  return results;
}

export default {
  id: 'american',
  name: 'American AAdvantage',
  deepLink,
  async search(query, { withPage, capture }) {
    return withPage(async (page) => {
      const json = await captureJsonResponse(page, {
        url: deepLink(query),
        match: /\/booking\/api\/search\/itinerary/,
      });
      await capture('american', json);
      return parseAmerican(json);
    });
  },
};
