import { makeResult } from './common.js';

// Fake but deterministic results for trying the UI without touching airline
// sites. Enabled with FP_DEMO=1.

const PROGRAMS = [
  { program: 'flyingblue', carrier: 'AF', cabin: 'business', miles: 55000, taxes: 210 },
  { program: 'virgin', carrier: 'DL', cabin: 'business', miles: 50000, taxes: 5.6 },
  { program: 'turkish', carrier: 'UA', cabin: 'business', miles: 45000, taxes: 5.6 },
  { program: 'emirates', carrier: 'EK', cabin: 'first', miles: 136000, taxes: 540 },
  { program: 'american', carrier: 'AA', cabin: 'economy', miles: 30000, taxes: 5.6 },
  { program: 'qatar', carrier: 'QR', cabin: 'business', miles: 70000, taxes: 150 },
];

function seed(text) {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export default {
  id: 'demo',
  name: 'Demo data',
  demo: true,
  async search({ origin, destination, date }) {
    const s = seed(`${origin}${destination}${date}`);
    return PROGRAMS.map((p, i) => {
      const hour = 8 + ((s + i * 5) % 12);
      const depart = `${date}T${String(hour).padStart(2, '0')}:15:00`;
      const arriveHour = (hour + 7) % 24;
      const arrive = `${date}T${String(arriveHour).padStart(2, '0')}:40:00`;
      const number = 100 + ((s >>> i) % 800);
      return {
        ...makeResult({
          program: p.program,
          segments: [
            {
              from: origin,
              to: destination,
              departure: depart,
              arrival: arrive,
              carrier: p.carrier,
              flightNumber: `${p.carrier}${number}`,
              aircraft: null,
            },
          ],
          cabin: p.cabin,
          miles: p.miles + ((s + i) % 4) * 2500,
          taxes: { amount: p.taxes, currency: 'USD' },
          seats: 1 + ((s + i) % 4),
        }),
        demo: true,
      };
    });
  },
};
