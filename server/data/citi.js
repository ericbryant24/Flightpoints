// Citi ThankYou transfer partners available to Citi Strata Premier (formerly
// Citi Premier) cardholders.
//
// Ratios are stored as integers to avoid floating-point rounding:
//   `citi` ThankYou points  ->  `partner` miles/points.
// Partners and ratios change; confirm on thankyou.com before transferring.

export const TRANSFER_INCREMENT = 1000;

export const PARTNERS = [
  { id: 'aeromexico', name: 'Aeromexico Rewards', type: 'airline', alliance: 'SkyTeam', citi: 1, partner: 1, url: 'https://www.aeromexico.com/' },
  { id: 'american', name: 'American AAdvantage', type: 'airline', alliance: 'oneworld', citi: 1, partner: 1, url: 'https://www.aa.com/' },
  { id: 'avianca', name: 'Avianca LifeMiles', type: 'airline', alliance: 'Star Alliance', citi: 1, partner: 1, url: 'https://www.lifemiles.com/' },
  { id: 'cathay', name: 'Cathay Pacific Asia Miles', type: 'airline', alliance: 'oneworld', citi: 1, partner: 1, url: 'https://www.cathaypacific.com/' },
  { id: 'emirates', name: 'Emirates Skywards', type: 'airline', alliance: null, citi: 5, partner: 4, url: 'https://www.emirates.com/' },
  { id: 'etihad', name: 'Etihad Guest', type: 'airline', alliance: null, citi: 1, partner: 1, url: 'https://www.etihad.com/' },
  { id: 'eva', name: 'EVA Air Infinity MileageLands', type: 'airline', alliance: 'Star Alliance', citi: 1, partner: 1, url: 'https://www.evaair.com/' },
  { id: 'flyingblue', name: 'Air France-KLM Flying Blue', type: 'airline', alliance: 'SkyTeam', citi: 1, partner: 1, url: 'https://www.flyingblue.com/' },
  { id: 'jetblue', name: 'JetBlue TrueBlue', type: 'airline', alliance: null, citi: 1, partner: 1, url: 'https://www.jetblue.com/' },
  { id: 'qantas', name: 'Qantas Frequent Flyer', type: 'airline', alliance: 'oneworld', citi: 1, partner: 1, url: 'https://www.qantas.com/' },
  { id: 'qatar', name: 'Qatar Airways Privilege Club', type: 'airline', alliance: 'oneworld', citi: 1, partner: 1, url: 'https://www.qatarairways.com/' },
  { id: 'singapore', name: 'Singapore KrisFlyer', type: 'airline', alliance: 'Star Alliance', citi: 1, partner: 1, url: 'https://www.singaporeair.com/' },
  { id: 'thai', name: 'Thai Royal Orchid Plus', type: 'airline', alliance: 'Star Alliance', citi: 1, partner: 1, url: 'https://www.thaiairways.com/' },
  { id: 'turkish', name: 'Turkish Miles&Smiles', type: 'airline', alliance: 'Star Alliance', citi: 1, partner: 1, url: 'https://www.turkishairlines.com/' },
  { id: 'virgin', name: 'Virgin Atlantic Flying Club', type: 'airline', alliance: 'SkyTeam', citi: 1, partner: 1, url: 'https://www.virginatlantic.com/' },

  { id: 'accor', name: 'Accor Live Limitless', type: 'hotel', alliance: null, citi: 2, partner: 1, url: 'https://all.accor.com/' },
  { id: 'choice', name: 'Choice Privileges', type: 'hotel', alliance: null, citi: 1, partner: 2, url: 'https://www.choicehotels.com/' },
  { id: 'preferred', name: 'I Prefer (Preferred Hotels)', type: 'hotel', alliance: null, citi: 1, partner: 4, url: 'https://preferredhotels.com/' },
  { id: 'wyndham', name: 'Wyndham Rewards', type: 'hotel', alliance: null, citi: 1, partner: 1, url: 'https://www.wyndhamhotels.com/' },
];

export const PARTNERS_BY_ID = new Map(PARTNERS.map((p) => [p.id, p]));

export function ratioLabel({ citi, partner }) {
  return `${citi}:${partner}`;
}

// ThankYou points to transfer so the program receives at least `miles`,
// rounded up to Citi's transfer increment.
export function citiPointsNeeded(miles, { citi, partner }, increment = TRANSFER_INCREMENT) {
  const raw = Math.ceil((miles * citi) / partner);
  return Math.ceil(raw / increment) * increment;
}
