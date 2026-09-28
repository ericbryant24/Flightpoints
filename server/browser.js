import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

// All browser state (airline logins, cookies) lives outside the repo so it
// can never be committed.
export const DATA_DIR = process.env.FP_DATA_DIR || join(homedir(), '.flightpoints');
const PROFILE_DIR = join(DATA_DIR, 'browser-profile');
const CAPTURE_DIR = join(DATA_DIR, 'captures');

let contextPromise;

// One persistent, visible browser shared by all adapters. Being visible lets
// you log in to loyalty accounts and answer any "are you human" prompts.
function getContext() {
  contextPromise ??= import('playwright').then(({ chromium }) =>
    chromium.launchPersistentContext(PROFILE_DIR, {
      headless: process.env.FP_HEADLESS === '1',
      channel: process.env.FP_BROWSER_CHANNEL || undefined,
      executablePath: process.env.FP_CHROMIUM_PATH || undefined,
      viewport: null,
    }),
  );
  return contextPromise;
}

async function withPage(fn) {
  const context = await getContext();
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

// Saves the raw airline response so a broken parser can be fixed against
// real data. Enabled with FP_CAPTURE=1.
async function capture(program, data) {
  if (process.env.FP_CAPTURE !== '1') return;
  await mkdir(CAPTURE_DIR, { recursive: true });
  await writeFile(join(CAPTURE_DIR, `${program}-latest.json`), JSON.stringify(data, null, 2));
}

export async function closeBrowser() {
  if (!contextPromise) return;
  const context = await contextPromise.catch(() => null);
  contextPromise = undefined;
  await context?.close();
}

// Opens `url` the way a person would and returns the JSON body of the first
// response whose URL matches `match` (the airline's own search API call).
export async function captureJsonResponse(page, { url, match, timeoutMs = 90_000 }) {
  const waiter = page.waitForResponse(
    (r) => match.test(r.url()) && r.request().method() !== 'OPTIONS',
    { timeout: timeoutMs },
  );
  waiter.catch(() => {});
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  let res;
  try {
    res = await waiter;
  } catch {
    throw new Error(
      'No search response from the airline site. It may have changed or shown a bot check; ' +
        'try again with the browser window visible.',
    );
  }
  if (!res.ok()) throw new Error(`${new URL(res.url()).host} returned HTTP ${res.status()}`);
  return res.json();
}

export const browserRuntime = { withPage, capture };
