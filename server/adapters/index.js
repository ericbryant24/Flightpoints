import american from './american.js';
import demo from './demo.js';
import jetblue from './jetblue.js';

// Programs with live, automated search. Every other Citi partner gets a
// "search manually" link in the UI.
export const LIVE_ADAPTERS = [american, jetblue];

export function defaultAdapters() {
  return process.env.FP_DEMO === '1' ? [demo] : LIVE_ADAPTERS;
}
