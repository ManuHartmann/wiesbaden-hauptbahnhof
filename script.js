const TAB     = 56;
const OVERLAP = 20;
const NET     = TAB - OVERLAP;  // 36px net space per collapsed card

const scroller = document.getElementById('scroll-container');
const spacer   = document.getElementById('scroll-spacer');
const stackEl  = document.getElementById('stack');
const cards    = [...document.querySelectorAll('.card')];
const N        = cards.length;

let TOTAL, TRANS_DIST, OPEN_H;
let ranges = [];  // [{type, start, end, ...}]

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

function applyPinned(activeIdx) {
    cards.forEach((card, i) => {
        const p = pinnedPos(i, activeIdx);
        setCard(card, p.top, p.height);
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

        cards.forEach((card, i) => {
            if (i < from) {
                const p = pinnedPos(i, from);
                setCard(card, p.top, p.height);

            } else if (i === from) {
                // Collapse: height shrinks from OPEN_H to TAB
                setCard(card, from * NET, Math.max(TAB, OPEN_H - delta));
                card.querySelector('.card__body').scrollTop = 0;

            } else if (i === to) {
                // Slide in: top moves from startTop to to*NET
                const startTop = TOTAL - OVERLAP - (N - to) * NET;
                setCard(card, startTop - delta, Math.min(OPEN_H, TAB + delta));
                card.querySelector('.card__body').scrollTop = 0;

            } else {
                // Cards below 'to': stay in their below positions
                const p = pinnedPos(i, from);
                setCard(card, p.top, p.height);
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
