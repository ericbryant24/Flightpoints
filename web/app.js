const form = document.querySelector('#search');
const programsBox = document.querySelector('#programs');
const statusEl = document.querySelector('#status');
const resultsSection = document.querySelector('#results-section');
const resultsBody = document.querySelector('#results');
const linksSection = document.querySelector('#links-section');
const linksList = document.querySelector('#links');

const CABIN_LABELS = { economy: 'Economy', premium: 'Premium econ.', business: 'Business', first: 'First' };
const BALANCE_KEY = 'flightpoints.balance';

const fmt = new Intl.NumberFormat('en-US');

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...children.filter((c) => c !== null && c !== undefined));
  return node;
}

function time(iso) {
  return iso ? iso.slice(11, 16) : '';
}

function dayOffset(depart, arrive) {
  if (!depart || !arrive) return '';
  const days = Math.round((Date.parse(arrive.slice(0, 10)) - Date.parse(depart.slice(0, 10))) / 86_400_000);
  return days > 0 ? ` +${days}` : '';
}

function money({ amount, currency }) {
  if (amount === null || amount === undefined) return '–';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
}

function loadBalance() {
  try {
    return localStorage.getItem(BALANCE_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveBalance(value) {
  try {
    localStorage.setItem(BALANCE_KEY, value);
  } catch {
    // Storage unavailable; the balance just won't be remembered.
  }
}

async function init() {
  form.balance.value = loadBalance();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  form.date.min = tomorrow;
  form.date.value ||= tomorrow;

  const res = await fetch('/api/programs');
  const info = await res.json();
  document.querySelector('#demo-banner').hidden = !info.demo;
  for (const a of info.adapters) {
    programsBox.append(
      el('label', {}, el('input', { type: 'checkbox', name: 'program', value: a.id, checked: '' }), ` ${a.name}`),
    );
  }
}

function renderStatus(sources) {
  const list = el('ul');
  for (const s of sources) {
    const secs = (s.ms / 1000).toFixed(1);
    list.append(
      s.ok
        ? el('li', { class: 'ok' }, `✓ ${s.name}: ${s.count} fares (${secs}s)`)
        : el('li', { class: 'err' }, `✗ ${s.name}: ${s.error}`),
    );
  }
  statusEl.replaceChildren(list);
}

function renderResults(results) {
  resultsSection.hidden = false;
  if (results.length === 0) {
    resultsBody.replaceChildren(el('tr', {}, el('td', { colspan: '7' }, 'No award space found.')));
    return;
  }
  resultsBody.replaceChildren(
    ...results.map((r) => {
      const route = r.segments.map((s) => s.from).concat(r.destination).join(' → ');
      const stops = r.stops === 0 ? 'Nonstop' : `${r.stops} stop${r.stops > 1 ? 's' : ''}`;
      const points = el('td', { class: `num${r.affordable === false ? ' short' : ''}` }, fmt.format(r.citiPoints));
      if (r.affordable === false) points.title = 'More than your Citi balance';
      return el(
        'tr',
        {},
        el('td', {}, r.flightNumbers.join(' · '), r.demo ? el('span', { class: 'tag' }, 'demo') : null,
          el('div', { class: 'detail' }, `${route} · ${stops}`)),
        el('td', {}, `${time(r.departure)} – ${time(r.arrival)}${dayOffset(r.departure, r.arrival)}`),
        el('td', {}, CABIN_LABELS[r.cabin] ?? r.cabin,
          r.seats ? el('div', { class: 'detail' }, `${r.seats} seat${r.seats > 1 ? 's' : ''} left`) : null),
        el('td', {}, r.programName, el('div', { class: 'detail' }, `Citi ${r.ratio}`)),
        el('td', { class: 'num' }, fmt.format(r.miles)),
        el('td', { class: 'num' }, money(r.taxes)),
        points,
      );
    }),
  );
}

function renderLinks(links, liveIds) {
  const manual = links.filter((l) => !liveIds.has(l.program));
  linksSection.hidden = manual.length === 0;
  linksList.replaceChildren(
    ...manual.map((l) =>
      el('li', {}, el('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.name), ` (${l.ratio})`),
    ),
  );
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const programs = data.getAll('program');
  saveBalance(data.get('balance'));

  const button = form.querySelector('button');
  button.disabled = true;
  statusEl.textContent = 'Searching… airline sites can take a minute or two.';
  try {
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        origin: data.get('origin'),
        destination: data.get('destination'),
        date: data.get('date'),
        cabin: data.get('cabin'),
        balance: data.get('balance'),
        programs,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      statusEl.replaceChildren(el('p', { class: 'err' }, body.error));
      return;
    }
    renderStatus(body.sources);
    renderResults(body.results);
    renderLinks(body.links, new Set(programs));
  } catch (err) {
    statusEl.replaceChildren(el('p', { class: 'err' }, `Search failed: ${err.message}`));
  } finally {
    button.disabled = false;
  }
});

init();
