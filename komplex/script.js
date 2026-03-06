const TAB     = 40; 
const OVERLAP = 1;  
const NET     = TAB - OVERLAP;  // 36px net space per collapsed card

const scroller = document.getElementById('scroll-container');
const spacer   = document.getElementById('scroll-spacer');
const stackEl  = document.getElementById('stack');
const cards    = [...document.querySelectorAll('.card')];
const N        = cards.length;

let TOTAL, TRANS_DIST, OPEN_H;
let ranges = [];  // [{type, start, end, ...}]

// ── Clock & Timetable ───────────────────────────────────────────────────
const TRAIN_DESTINATIONS = [
    { name: 'Frankfurt (Main) Hbf', types: ['ICE', 'IC', 'RB'] },
    { name: 'Limburg (Lahn) Hbf', types: ['IC', 'RE'] },
    { name: 'München Hbf', types: ['ICE', 'EC'] },
    { name: 'Köln Hbf', types: ['ICE', 'IC'] },
    { name: 'Hamburg Hbf', types: ['ICE', 'IC'] },
    { name: 'Berlin Hbf', types: ['ICE'] },
    { name: 'Düsseldorf Hbf', types: ['ICE', 'IC', 'RE'] },
    { name: 'Mainz Hbf', types: ['IC', 'RE', 'RB'] },
    { name: 'Koblenz Hbf', types: ['IC', 'RE'] },
    { name: 'Bad Homburg', types: ['S-Bahn', 'RB'] },
    { name: 'Niedernhausen', types: ['RB', 'S-Bahn'] },
    { name: 'Idstein', types: ['RB', 'S-Bahn'] },
    { name: 'Taunusstein', types: ['RB'] },
    { name: 'Wetzlar', types: ['RE', 'RB'] },
    { name: 'Darmstadt Hbf', types: ['RB', 'S-Bahn'] },
];

const TRACKS = [1, 2, 3, 4, 5, 6, 7, 8];

function getTypeClass(type) {
    if (type === 'ICE') return 'badge--ice';
    if (type === 'IC') return 'badge--ic';
    if (type === 'EC') return 'badge--ice';
    if (type === 'RE') return 'badge--ic';
    if (type === 'RB') return 'badge--rb';
    if (type === 'S-Bahn') return 'badge--ic';
    return 'badge--ice';
}

function timeToMinutes(hours, minutes) {
    return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function generateTimetable() {
    const now = new Date();
    const currentMinutes = timeToMinutes(now.getHours(), now.getMinutes());
    
    const trains = [];
    
    // Generate trains throughout the day, every 5-15 minutes
    let time = 5 * 60; // Start at 5:00
    const endTime = 24 * 60; // Until midnight
    
    while (time < endTime) {
        // Only show 15-20 upcoming trains
        if (trains.length >= 20) break;
        
        // Only include future trains
        if (time >= currentMinutes - 2) { // Show trains up to 2 minutes ago
            const destination = TRAIN_DESTINATIONS[Math.floor(Math.random() * TRAIN_DESTINATIONS.length)];
            const types = destination.types;
            const type = types[Math.floor(Math.random() * types.length)];
            const track = TRACKS[Math.floor(Math.random() * TRACKS.length)];
            
            trains.push({
                time: minutesToTime(time),
                destination: destination.name,
                type: type,
                track: track,
                minutes: time
            });
        }
        
        // Random interval between trains
        time += 5 + Math.floor(Math.random() * 11); // 5-15 minutes
    }
    
    return trains.sort((a, b) => a.minutes - b.minutes);
}

function updateTimetable() {
    const trains = generateTimetable();
    const tbody = document.querySelector('.timetable tbody');
    
    tbody.innerHTML = trains.map(train => `
        <tr>
            <td>${train.time}</td>
            <td>${train.destination}</td>
            <td><span class="badge ${getTypeClass(train.type)}">${train.type}</span></td>
            <td>${train.track}</td>
        </tr>
    `).join('');
}

function updateClock() {
    const now = new Date();
    
    // Update clock
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        clockEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    // Update date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('de-DE', options);
    const dateEl = document.getElementById('date-display');
    if (dateEl) {
        dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }
    
    // Update timetable every 10 seconds
    if (now.getSeconds() % 10 === 0) {
        updateTimetable();
    }
}

// Initialize clock and timetable immediately
updateClock();
setInterval(updateClock, 1000);

// ── Measurements ────────────────────────────────────────────────────────
function measure() {
    TOTAL      = stackEl.clientHeight;
    TRANS_DIST = TOTAL - OVERLAP - N * NET;  // px a card travels during transition
    OPEN_H     = TOTAL - (N - 1) * NET;      // height of the active card
}

// Scrollable content height when card i is fully open
function contentScrollable(i) {
    const body = cards[i].querySelector('.card__body');
    return Math.max(0, body.scrollHeight - (OPEN_H - TAB));
}

// Build scroll → layout ranges
function buildRanges() {
    ranges = [];
    let pos = 0;

    for (let i = 0; i < N; i++) {
        // Card i transition (not for first card)
        if (i > 0) {
            ranges.push({ type: 'transition', from: i - 1, to: i, start: pos, end: pos + TRANS_DIST });
            pos += TRANS_DIST;
        }

        // Card i content scroll
        const cs = contentScrollable(i);
        if (cs > 0) {
            ranges.push({ type: 'content', idx: i, start: pos, end: pos + cs });
            pos += cs;
        }
    }

    spacer.style.height = pos + 'px';
}

// ── Layout helpers ───────────────────────────────────────────────────────
function pinnedPos(i, activeIdx) {
    if (i < activeIdx)   return { top: i * NET,                             height: TAB    };
    if (i === activeIdx) return { top: activeIdx * NET,                     height: OPEN_H };
    /* i > activeIdx */  return { top: TOTAL - OVERLAP - (N - i) * NET,    height: TAB    };
}

function setCard(card, top, height) {
    card.style.top    = top    + 'px';
    card.style.height = height + 'px';
}

function setHeading(card, progress) {
    const h2 = card.querySelector('.card__body h2');
    if (!h2) return;
    h2.style.opacity   = 1 - progress;
    h2.style.transform = `translateY(${-24 * progress}px)`;
}

function applyPinned(activeIdx) {
    cards.forEach((card, i) => {
        const p = pinnedPos(i, activeIdx);
        setCard(card, p.top, p.height);
        setHeading(card, i === activeIdx ? 0 : 1);
        card.style.zIndex = i + 1;
    });
}

// ── Main update — called on every scroll tick ────────────────────────────
function update() {
    const s = scroller.scrollTop;

    // Find active range (first range where s < end)
    let range = null;
    for (const r of ranges) {
        if (s < r.end) { range = r; break; }
    }

    if (!range) {
        // Past all ranges: last card fully open, content at bottom
        applyPinned(N - 1);
        const lastBody = cards[N - 1].querySelector('.card__body');
        lastBody.scrollTop = lastBody.scrollHeight;
        return;
    }

    if (range.type === 'content') {
        applyPinned(range.idx);
        cards[range.idx].querySelector('.card__body').scrollTop = s - range.start;

    } else {
        // transition: card 'to' slides in, card 'from' collapses
        const { from, to } = range;
        const delta = s - range.start;  // 0 → TRANS_DIST (direct, no easing)
        const progress = delta / TRANS_DIST;

        cards.forEach((card, i) => {
            if (i < from) {
                const p = pinnedPos(i, from);
                setCard(card, p.top, p.height);
                setHeading(card, 1);

            } else if (i === from) {
                // Collapse: height shrinks from OPEN_H to TAB
                setCard(card, from * NET, Math.max(TAB, OPEN_H - delta));
                setHeading(card, progress);

            } else if (i === to) {
                // Slide in: top moves from startTop to to*NET
                const startTop = TOTAL - OVERLAP - (N - to) * NET;
                setCard(card, startTop - delta, Math.min(OPEN_H, TAB + delta));
                card.querySelector('.card__body').scrollTop = 0;
                setHeading(card, 1 - progress);

            } else {
                // Cards below 'to': stay in their below positions
                const p = pinnedPos(i, from);
                setCard(card, p.top, p.height);
                setHeading(card, 1);
            }

            card.style.zIndex = i + 1;
        });
    }
}

// ── Tab click → scroll to card ───────────────────────────────────────────
function scrollToCard(idx) {
    let target = 0;
    for (const r of ranges) {
        if (r.type === 'transition' && r.to === idx) {
            target = r.end;
            break;
        }
    }
    scroller.scrollTo({ top: target, behavior: 'smooth' });
}

cards.forEach((card, i) => {
    card.querySelector('.card__tab').addEventListener('click', () => scrollToCard(i));
});

// ── Keyboard ─────────────────────────────────────────────────────────────
function activeCard() {
    const s = scroller.scrollTop;
    let active = 0;
    for (const r of ranges) {
        if (r.type === 'transition' && s >= r.end) active = r.to;
    }
    return active;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); scrollToCard(Math.min(activeCard() + 1, N - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); scrollToCard(Math.max(activeCard() - 1, 0)); }
});

// ── Resize ────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => { measure(); buildRanges(); update(); });

// ── Init ─────────────────────────────────────────────────────────────────
measure();
buildRanges();
update();

scroller.addEventListener('scroll', update, { passive: true });
