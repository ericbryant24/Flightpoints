# Flightpoints

A local award-flight search that prices every result in **Citi ThankYou points**
(Citi Strata Premier / Premier). It runs on your own computer: a small Node
server drives a real, visible browser, searches airline award sites the way you
would by hand, and shows how many Citi points to transfer for each fare.

## Setup

Requires Node.js 20+.

```sh
npm install
npx playwright install chromium   # or use your installed Chrome, see below
npm start
```

Open <http://localhost:4310>. The first search opens a browser window; leave it
open. If an airline shows a "verify you're human" check, complete it in that
window and search again. You can also log in to your loyalty accounts there —
the session is remembered between runs.

Try the UI without touching any airline site:

```sh
npm run demo
```

## What it searches

| Citi partner | Ratio (Citi : partner) | Search |
|---|---|---|
| American AAdvantage | 1:1 | **Live** (includes oneworld partners like British Airways, JAL, Qatar, Iberia) |
| JetBlue TrueBlue | 1:1 | **Live** |
| Aeromexico, Avianca LifeMiles, Cathay Pacific, Etihad, EVA Air, Flying Blue, Qantas, Qatar, Singapore, Thai, Turkish, Virgin Atlantic | 1:1 | Link to search manually |
| Emirates Skywards | 5:4 | Link to search manually |

Citi transfers in 1,000-point increments, so "Citi points" is rounded up to the
next 1,000. Partner ratios change; confirm on thankyou.com before
transferring. Ratios live in `server/data/citi.js`.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4310` | Local port (server only listens on 127.0.0.1) |
| `FP_BROWSER_CHANNEL` | *(Playwright Chromium)* | Set to `chrome` to use your installed Google Chrome |
| `FP_HEADLESS` | `0` | `1` hides the browser (airlines block this more often) |
| `FP_CAPTURE` | `0` | `1` saves each airline's raw response for debugging |
| `FP_DATA_DIR` | `~/.flightpoints` | Browser profile and captures (outside the repo) |
| `FP_DEMO` | `0` | `1` returns fake results |

## When a search breaks

Airline sites change, and each adapter can break independently; the others
keep working. To fix one:

1. Run with `FP_CAPTURE=1 npm start` and search again.
2. The raw response is saved to `~/.flightpoints/captures/<program>-latest.json`.
3. Update that program's parser in `server/adapters/` and its fixture in
   `test/fixtures/`, then run `npm test`.

If no response is captured at all, the site's search API URL has likely
changed: open the browser's DevTools → Network tab while searching on the
airline site and update the `match` pattern in the adapter.

## Adding a program

Create `server/adapters/<id>.js` exporting `{ id, name, deepLink(query), search(query, runtime) }`,
where `id` matches a partner in `server/data/citi.js` and `search` returns
results built with `makeResult()`. Register it in `server/adapters/index.js`.
The usual pattern is `captureJsonResponse()`: open the airline's own search
page and read the JSON its front end fetches.

## Use responsibly

This is for personal use. Automated access usually goes against airline
terms of service; keep volume low (searches you'd otherwise run by hand),
don't run it as a public service, and accept that an airline may block or
log you out.

## Development

```sh
npm test
```

Test fixtures in `test/fixtures/` are small hand-written samples of each
airline's response format; replace them with real captures when updating a
parser.
