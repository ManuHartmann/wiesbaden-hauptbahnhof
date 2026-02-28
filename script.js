const TAB     = 56;   // tab height in px
const OVERLAP = 20;   // how much cards overlap each other
const NET     = TAB - OVERLAP; // 36px — net space per collapsed card

const stack = document.getElementById('stack');
const cards = [...document.querySelectorAll('.card')];
const N     = cards.length;
let active  = 0;

// ── Layout engine ──────────────────────────────────────────
function layout(idx, animate = true) {
    if (idx < 0 || idx >= N) return;

    const TOTAL = stack.clientHeight;
    const openH = TOTAL - (N - 1) * NET;

    cards.forEach((card, i) => {
        let top, height;

        if (i < idx) {
            // Above active: tab visible from top
            top    = i * NET;
            height = TAB;
        } else if (i === idx) {
            // Active card: full open height
            top    = idx * NET;
            height = openH;
        } else {
            // Below active: tab peeks from bottom
            top    = TOTAL - OVERLAP - (N - i) * NET;
            height = TAB;
        }

        const transition = animate
            ? 'top 0.5s cubic-bezier(0.4,0,0.2,1), height 0.5s cubic-bezier(0.4,0,0.2,1)'
            : 'none';

        card.style.transition = transition;
        card.style.top        = top + 'px';
        card.style.height     = height + 'px';
        card.style.zIndex     = i + 1;
    });

    active = idx;
}

// ── Tab clicks ──────────────────────────────────────────────
cards.forEach((card, i) => {
    card.querySelector('.card__tab').addEventListener('click', () => layout(i));
});

// ── Scroll wheel ────────────────────────────────────────────
let scrollLock = false;

document.addEventListener('wheel', (e) => {
    // Allow scrolling inside card content if not at boundary
    const body = cards[active]?.querySelector('.card__body');
    if (body) {
        const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 2;
        const atTop    = body.scrollTop <= 0;
        if (e.deltaY > 0 && !atBottom) return;
        if (e.deltaY < 0 && !atTop)    return;
    }

    e.preventDefault();
    if (scrollLock) return;
    scrollLock = true;
    setTimeout(() => scrollLock = false, 600);

    if (e.deltaY > 0) layout(active + 1);
    else              layout(active - 1);
}, { passive: false });

// ── Touch / swipe ───────────────────────────────────────────
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    const diff = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(diff) > 40) {
        layout(diff > 0 ? active + 1 : active - 1);
    }
});

// ── Keyboard ────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); layout(active + 1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); layout(active - 1); }
});

// ── Resize ──────────────────────────────────────────────────
window.addEventListener('resize', () => layout(active, false));

// ── Init (no animation) ─────────────────────────────────────
layout(0, false);
