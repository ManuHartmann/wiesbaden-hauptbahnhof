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
  const body = cards[i].querySelector('.card__body');
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

  if (range.type === 'content') {
    applyPinned(range.idx);
    const scrolled = s - range.start;
    cards[range.idx].querySelector('.card__body').scrollTop = scrolled;
    cards[range.idx].classList.toggle('is-scrolled', scrolled > 10);

  } else {
    // Übergang: Card 'to' schiebt sich rein, Card 'from' klappt zu
    const { from, to } = range;
    const delta = s - range.start;
    const progress = delta / (range.end - range.start);  // 0 → 1

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

      // Klassen: 'from' aktiv bis Halbzeit, dann wechselt is-active auf 'to'
      const active = (i === from && progress < 0.5) || (i === to && progress >= 0.5);
      card.classList.toggle('is-active', active);
      card.classList.remove('is-scrolled');
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
