const tage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function tick() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  document.getElementById('uhr').textContent = h + ':' + m + ':' + s;
  document.getElementById('datum').textContent = tage[d.getDay()] + ', ' + d.toLocaleDateString('de-DE');
}
tick();
setInterval(tick, 1000);

// ── Card Stack (komplex-Architektur) ──────────────────────────────────────
const TAB     = 100;             // px — muss mit --tab-h in CSS übereinstimmen
const OVERLAP = 55;             // px — muss mit border-radius in CSS übereinstimmen!
const NET     = TAB - OVERLAP;  // px — netto Scroll-Abstand pro Tab
const PAUSE   = 150;            // px — Scroll-Stop am Ende jeder Card

const scroller = document.getElementById('scroll-container');
const spacer   = document.getElementById('scroll-spacer');
const stackEl  = document.getElementById('stack');
const cards    = [...document.querySelectorAll('.card')];
const N        = cards.length;

let TOTAL, TRANS_DIST, OPEN_H, FOOTER_H;
let ranges = [];  // [{type, start, end, ...}]

// Gesamthöhe + Übergangs-/Inhaltsdistanzen berechnen
// Footer (letztes card) ist aus dem normalen Stack-System ausgenommen
function measure() {
  TOTAL      = stackEl.clientHeight;
  FOOTER_H   = 150;                   // ~⅓ Viewport-Höhe
  TRANS_DIST = TOTAL - OVERLAP - (N - 1) * NET;         // N-1 content cards
  OPEN_H     = TOTAL - (N - 2) * NET;                   // aktive Card ohne Footer
}

// Wie viel Inhalt in Card i über die sichtbare Fläche hinausgeht
function contentScrollable(i) {
  const body   = cards[i].querySelector('.card__body');
  // Abfahrten: scrollt eigenständig, kein JS-gestützter Scroll
  if (cards[i].querySelector('.abfahrten-sticky')) return 0;
  return Math.max(0, body.scrollHeight - (OPEN_H - TAB));
}

// Scroll → Layout-Segmente aufbauen und Spacer setzen
function buildRanges() {
  ranges = [];
  let pos = 0;

  for (let i = 0; i < N - 1; i++) {  // nur content cards (Footer ausgenommen)
    if (i > 0) {
      ranges.push({ type: 'transition', from: i - 1, to: i, start: pos, end: pos + TRANS_DIST });
      pos += TRANS_DIST;
    }
    const cs = contentScrollable(i);
    if (cs > 0) {
      ranges.push({ type: 'content', idx: i, start: pos, end: pos + cs });
      pos += cs;
    }

    // Pause am Ende jeder Card bevor die nächste Transition startet
    if (i < N - 2) {
      ranges.push({ type: 'pause', idx: i, start: pos, end: pos + PAUSE });
      pos += PAUSE;
    }
  }

  // Footer fährt von unten rein (kein Tab, keine Collapse der letzten Card)
  ranges.push({ type: 'footer', start: pos, end: pos + FOOTER_H });
  pos += FOOTER_H;

  spacer.style.height = pos + 'px';
}

// Wo liegt Card i wenn Card activeIdx offen ist?
function pinnedPos(i, activeIdx) {
  if (i < activeIdx)   return { top: i * NET,                          height: TAB    };
  if (i === activeIdx) return { top: activeIdx * NET,                  height: OPEN_H };
  /* i > activeIdx */  return { top: TOTAL - OVERLAP - (N - 1 - i) * NET, height: TAB    };
}

function setCard(card, top, height) {
  card.style.top    = top    + 'px';
  card.style.height = height + 'px';
}

function applyPinned(activeIdx) {
  for (let i = 0; i < N - 1; i++) {  // Footer wird separat positioniert
    const p = pinnedPos(i, activeIdx);
    setCard(cards[i], p.top, p.height);
    cards[i].style.zIndex = i + 1;
    const active = i === activeIdx;
    cards[i].classList.toggle('is-active', active);
    if (!active) cards[i].classList.remove('is-scrolled');
  }
  cards[N - 1].style.zIndex = N;  // Footer immer oben
}

// Hauptfunktion — bei jedem Scroll-Tick
function update() {
  const s = scroller.scrollTop;

  // Aktives Segment finden
  let range = null;
  for (const r of ranges) {
    if (s < r.end) { range = r; break; }
  }

  if (!range) {
    // Hinter allem: letzte Content-Card offen, Footer vollständig sichtbar
    applyPinned(N - 2);
    setCard(cards[N - 1], TOTAL - FOOTER_H, FOOTER_H);
    return;
  }

  if (range.type === 'footer') {
    // Footer fährt von unten rein — letzte Content-Card bleibt voll offen
    applyPinned(N - 2);
    const delta = s - range.start;
    setCard(cards[N - 1], TOTAL - delta, FOOTER_H);
    return;
  }

  // Footer komplett unterhalb des Viewports verstecken
  setCard(cards[N - 1], TOTAL, FOOTER_H);

  if (range.type === 'pause') {
    // Card bleibt offen, nichts bewegt sich
    applyPinned(range.idx);

  } else if (range.type === 'content') {
    applyPinned(range.idx);
    const scrolled = s - range.start;
    cards[range.idx].querySelector('.card__body').scrollTop = scrolled;
    cards[range.idx].classList.toggle('is-scrolled', scrolled > 10);

  } else {
    // Übergang: Card 'to' schiebt sich rein, Card 'from' klappt zu
    const { from, to } = range;
    const delta = s - range.start;

    for (let i = 0; i < N - 1; i++) {
      const card = cards[i];
      if (i < from) {
        const p = pinnedPos(i, from);
        setCard(card, p.top, p.height);

      } else if (i === from) {
        setCard(card, from * NET, Math.max(TAB, OPEN_H - delta));

      } else if (i === to) {
        const startTop = TOTAL - OVERLAP - (N - 1 - to) * NET;
        setCard(card, startTop - delta, Math.min(OPEN_H, TAB + delta));
        card.querySelector('.card__body').scrollTop = 0;

      } else {
        const p = pinnedPos(i, from);
        setCard(card, p.top, p.height);
      }

      // Titel wächst wenn die Card ~70% ihrer finalen Höhe erreicht hat
      const toCardHeight = Math.min(OPEN_H, TAB + delta);
      const active = (i === to && toCardHeight >= OPEN_H * 0.2);
      card.classList.toggle('is-active', active);
      // Keep from-card's header suppressed so its title doesn't re-expand mid-transition
      if (i === from) card.classList.add('is-scrolled');
      else card.classList.remove('is-scrolled');
      card.style.zIndex = i + 1;
    }
  }
}

// Tab-Klick → zur Card scrollen
function scrollToCard(idx) {
  let target = 0;
  for (const r of ranges) {
    if (r.type === 'transition' && r.to === idx) { target = r.end; break; }
  }
  scroller.scrollTo({ top: target, behavior: 'smooth' });
}

cards.forEach((card, i) => {
  if (i === N - 1) return;  // Footer hat keinen Header
  const header = card.querySelector('.card__header, .card__tab');
  if (header) header.addEventListener('click', () => scrollToCard(i));
});

// Tastatur: Pfeiltasten durch alle fokussierbaren Elemente navigieren
const FOCUSABLE_CONTENT = [
  '.card__body > p',
  '.card__body h3',
  'figure',
  'blockquote',
  'article.timeline-entry',
  '#map',
  '.karte-liste li',
  '.kaiser-note',
].join(', ');

document.querySelectorAll(FOCUSABLE_CONTENT).forEach(el => {
  if (!el.getAttribute('tabindex')) el.setAttribute('tabindex', '0');
});

function allFocusable() {
  return [...document.querySelectorAll('a[href], button, [tabindex="0"]')];
}

// Pfeiltasten: nur fokussieren — focusin übernimmt das Scrollen
document.addEventListener('keydown', e => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  e.preventDefault();

  const all  = allFocusable();
  const idx  = all.indexOf(document.activeElement);
  const next = e.key === 'ArrowDown'
    ? all[Math.min(idx + 1, all.length - 1)]
    : all[Math.max(idx - 1, 0)];

  if (!next || next === document.activeElement) return;
  next.focus({ preventScroll: true });
});

// focusin: bei jedem Fokus zur richtigen Stelle scrollen
function offsetInBody(el, body) {
  let offset = 0;
  let node = el;
  while (node && node !== body) {
    offset += node.offsetTop;
    node = node.offsetParent;
  }
  return offset;
}

document.addEventListener('focusin', e => {
  if (e.target.closest('#abfahrten nav')) return;  // Filter-Buttons ausschliessen
  const cardEl  = e.target.closest('.card');
  if (!cardEl) return;
  const cardIdx = cards.indexOf(cardEl);
  if (cardIdx < 0 || cardIdx >= N - 1) return;  // Footer ignorieren

  // Wo endet der Übergang zu dieser Card?
  let transEnd = 0;
  for (const r of ranges) {
    if (r.type === 'transition' && r.to === cardIdx) { transEnd = r.end; break; }
  }

  const body   = cardEl.querySelector('.card__body');
  const elOff  = offsetInBody(e.target, body);
  const target = transEnd + Math.max(0, elOff - 20);

  scroller.scrollTo({ top: target, behavior: 'smooth' });
});

// Resize: neu messen
window.addEventListener('resize', () => { measure(); buildRanges(); update(); });

// Init
measure();
buildRanges();
update();

scroller.addEventListener('scroll', update, { passive: true });

// Abfahrten: Header schrumpft beim Tabellen-Scroll
const abfahrtenBody = document.querySelector('#abfahrten .card__body');
if (abfahrtenBody) {
  abfahrtenBody.addEventListener('scroll', () => {
    document.getElementById('abfahrten')
      .classList.toggle('is-scrolled', abfahrtenBody.scrollTop > 10);
  }, { passive: true });
}

// ── Abfahrten Filter & Live-Daten ─────────────────────────────
const filterMap = {
  'ICE':    'badge-ice',
  'IC':     'badge-ic',
  'EC':     'badge-ec',
  'RB':     'badge-rb',
  'RE':     'badge-re',
  'S-Bahn': 'badge-s',
  'Bus':    'badge-bus',
};

const filterBtns = [...document.querySelectorAll('#abfahrten nav button')];

function applyCurrentFilter() {
  const activeBtn = document.querySelector('#abfahrten nav button.active');
  const filter    = activeBtn ? activeBtn.textContent.trim() : 'Alle';
  document.querySelectorAll('.timetable tbody tr').forEach(row => {
    row.hidden = filter !== 'Alle' && !row.querySelector('.' + filterMap[filter]);
  });
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyCurrentFilter();
    buildRanges();
    update();
  });
});

// ── Simulierte Abfahrten ───────────────────────────────────────

const SIM_TEMPLATES = [
  { name: 'ICE 505', badge: 'badge-ice', direction: 'München Hbf',           via: ['Frankfurt (Main) Hbf', 'Nürnberg Hbf'],     gleis: '4',   interval: 60,  offset: 5  },
  { name: 'ICE 11',  badge: 'badge-ice', direction: 'Berlin Hbf',            via: ['Frankfurt (Main) Hbf', 'Erfurt Hbf'],       gleis: '4',   interval: 120, offset: 35 },
  { name: 'IC 2028', badge: 'badge-ic',  direction: 'Köln Hbf',              via: ['Koblenz Hbf'],                              gleis: '3',   interval: 120, offset: 52 },
  { name: 'EC 9',    badge: 'badge-ec',  direction: 'Basel SBB',             via: ['Frankfurt (Main) Hbf', 'Freiburg (Brsg)'], gleis: '4',   interval: 180, offset: 78 },
  { name: 'RE 9',    badge: 'badge-re',  direction: 'Frankfurt (Main) Hbf',  via: ['Frankfurt-Höchst'],                        gleis: '1',   interval: 30,  offset: 8  },
  { name: 'RE 25',   badge: 'badge-re',  direction: 'Limburg (Lahn)',         via: ['Bad Schwalbach'],                          gleis: '2',   interval: 60,  offset: 22 },
  { name: 'RB 10',   badge: 'badge-rb',  direction: 'Koblenz Hbf',           via: ['Rüdesheim', 'Bingen (Rhein)'],            gleis: '2',   interval: 60,  offset: 35 },
  { name: 'RB 21',   badge: 'badge-rb',  direction: 'Niedernhausen',         via: ['Wiesbaden-Ost', 'Idstein'],               gleis: '3',   interval: 30,  offset: 11 },
  { name: 'S 1',     badge: 'badge-s',   direction: 'Rödermark-Ober-Roden',  via: ['Frankfurt Hbf', 'Darmstadt'],             gleis: '5',   interval: 20,  offset: 0  },
  { name: 'S 8',     badge: 'badge-s',   direction: 'Hanau Hbf',             via: ['Frankfurt Flughafen', 'Frankfurt Hbf'],   gleis: '6',   interval: 20,  offset: 7  },
  { name: 'S 9',     badge: 'badge-s',   direction: 'Hanau Hbf',             via: ['Frankfurt Flughafen', 'Frankfurt Hbf'],   gleis: '7',   interval: 20,  offset: 13 },
  { name: 'Bus X83', badge: 'badge-bus', direction: 'Mainz Hbf',             via: ['Biebrich'],                               gleis: 'ZOB', interval: 30,  offset: 3  },
];

function buildSimDeps() {
  const now     = Date.now();
  const horizon = now + 3 * 60 * 60_000;
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const deps = [];
  for (const t of SIM_TEMPLATES) {
    const ms = t.interval * 60_000;
    let time  = midnight.getTime() + t.offset * 60_000;
    while (time < now - 60_000) time += ms;
    while (time <= horizon) {
      const delay = Math.random() < 0.25 ? Math.floor(Math.random() * 7) + 1 : 0;
      deps.push({ time, delay, ...t });
      time += ms;
    }
  }
  return deps.sort((a, b) => a.time - b.time);
}

function timeStr(ts) {
  const d = new Date(ts);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function renderSimDeps(deps) {
  const tbody = document.querySelector('.timetable tbody');
  if (!tbody) return;
  tbody.innerHTML = deps.map(d => {
    const delayHtml = d.delay > 0 ? ` <small class="delay">+${d.delay}'</small>` : '';
    const viaHtml   = d.via.length ? `<br><small>via ${d.via.slice(0, 2).join(', ')}</small>` : '';
    return `<tr data-time="${d.time}">
      <td>${timeStr(d.time)}${delayHtml}</td>
      <td>${d.direction}${viaHtml}</td>
      <td><span class="badge ${d.badge}">${d.name}</span></td>
      <td>${d.gleis}</td>
    </tr>`;
  }).join('');
  document.getElementById('abfahrten-source').textContent = 'Simulierte Daten';
  applyCurrentFilter();
  buildRanges();
  update();
}

function checkExpiredRows() {
  const tbody = document.querySelector('.timetable tbody');
  if (!tbody) return;
  const now = Date.now();
  [...tbody.querySelectorAll('tr:not(.departing)')].forEach(row => {
    if (+row.dataset.time < now) {
      row.classList.add('departing');
      setTimeout(() => { row.remove(); buildRanges(); update(); }, 600);
    }
  });
  // Nachfüllen wenn weniger als 10 Zeilen übrig
  if (tbody.querySelectorAll('tr:not(.departing)').length < 10) {
    renderSimDeps(buildSimDeps());
  }
}

// Sofort rendern + alle 30s abgelaufene Zeilen entfernen
renderSimDeps(buildSimDeps());
setInterval(checkExpiredRows, 30_000);

// ── Live-API (überschreibt Simulation wenn verfügbar) ──────────
const ABFAHRTEN_API = 'https://v6.db.transport.rest/stops/8000250/departures?results=30&duration=180&stopovers=true';

function depBadge(line) {
  const name    = (line.name || '').trim();
  const product = line.product || '';
  if (product === 'bus')         return 'badge-bus';
  if (product === 'suburban')    return 'badge-s';
  if (name.startsWith('ICE'))    return 'badge-ice';
  if (name.startsWith('EC'))     return 'badge-ec';
  if (name.startsWith('IC'))     return 'badge-ic';
  if (product === 'nationalExpress' || product === 'national') return 'badge-ice';
  if (name.startsWith('RE'))     return 'badge-re';
  return 'badge-rb';
}

function renderDepartures(deps) {
  const tbody = document.querySelector('.timetable tbody');
  if (!tbody) return;
  tbody.innerHTML = deps
    .filter(d => d.line.product !== 'tram' && d.line.product !== 'subway' && d.line.product !== 'taxi')
    .map(d => {
      const ts        = new Date(d.plannedWhen || d.when).getTime();
      const time      = timeStr(ts);
      const delayMin  = d.delay ? Math.round(d.delay / 60) : 0;
      const delayHtml = delayMin > 0 ? ` <small class="delay">+${delayMin}'</small>` : '';
      const badge     = depBadge(d.line);
      const gleis     = d.plannedPlatform || d.platform || '–';
      const stopovers = d.nextStopovers || d.stopovers || [];
      const viaNames  = stopovers.map(s => s.stop?.name).filter(n => n && n !== d.direction).slice(0, 2);
      const viaHtml   = viaNames.length ? `<br><small>via ${viaNames.join(', ')}</small>` : '';
      return `<tr data-time="${ts}">
        <td>${time}${delayHtml}</td>
        <td>${d.direction || '–'}${viaHtml}</td>
        <td><span class="badge ${badge}">${d.line.name}</span></td>
        <td>${gleis}</td>
      </tr>`;
    }).join('');
  document.getElementById('abfahrten-source').textContent = 'Live-Daten';
  applyCurrentFilter();
  buildRanges();
  update();
}

async function fetchDepartures() {
  try {
    const res  = await fetch(ABFAHRTEN_API);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (data.departures?.length) renderDepartures(data.departures);
  } catch {
    // Simulation läuft bereits, nichts zu tun
  }
}

fetchDepartures();
setInterval(fetchDepartures, 60_000);

// ── Leaflet Karte ─────────────────────────────────────────────
// scrollWheelZoom deaktiviert — sonst würde das Mausrad die Karte zoomen statt zu scrollen
const map = L.map('map', { zoomControl: true, scrollWheelZoom: false }).setView([50.0708, 8.2439], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  maxZoom: 19
}).addTo(map);

L.marker([50.0708, 8.2439])
  .addTo(map)
  .bindPopup('Wiesbaden Hauptbahnhof');
