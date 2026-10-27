/* =========================================================
   Rabbit Tracks — app
   1.  Data source
   2.  State
   3.  Helpers
   4.  Screens + the status screen (loading / error / not found)
   5.  Routing (#/ addresses)
   6.  Dashboard
   7.  Trail details (the timeline)
   8.  Trail form (create / edit)
   9.  Discovery form (add / edit)
   10. Form helpers
   11. Confirm dialog
   12. The White Rabbit, the welcome, and the tour
   13. Buttons, Settings, and start-up

   Every screen has its own address (#/trails/game-dev, ...), so the
   browser's Back/Forward buttons and refreshing keep you in place.
   ========================================================= */


/* ---------- 1. Data source ----------
   All reads and changes go through `trailData`. Both options have the
   same functions:
     sample-data.js  kept in memory, resets on reload
     api.js          saved in MongoDB through the server
   The <meta name="rabbit-tracks-data"> tag in index.html decides:
     "sample" (npm run preview), "api" (npm start), or "auto", which
   means sample data when opened from disk and the API otherwise. */

const DATA_MODE = document.querySelector('meta[name="rabbit-tracks-data"]')?.content || 'auto';
const trailData = DATA_MODE === 'sample' || (DATA_MODE === 'auto' && location.protocol === 'file:')
  ? sampleData
  : apiData;


/* ---------- 2. State ---------- */

let dashboardTrails = [];      // trails shown on the dashboard
let currentTrail = null;       // trail open on the trail screen or a form
let editingTrailId = null;     // null = creating a new trail
let editingDiscoveryId = null; // null = adding a new discovery
let previousHash = '#/';       // where Cancel / Back go
let routeVersion = 0;          // increases on every navigation; used to ignore slow, outdated responses
let justReachedMilestone = null; // id of a milestone reached by the last save, highlighted once
let justAdded = null;          // { discoveryId, previousCount } after adding a discovery, animated once
let trailDraftQuestion = null; // a question carried into the New trail form (from the White Rabbit)
let formSnapshot = '';         // what the open form held when it opened, to tell whether anything was typed


/* ---------- Preferences ----------
   Small choices about the interface (not research data), remembered by
   this browser in localStorage. Storage can be unavailable or full
   (private windows, blocked storage); then nothing is remembered and
   the app works the same, it just asks again next time. */

const prefs = {
  get(name) {
    try { return localStorage.getItem(`rabbit-tracks.${name}`); } catch { return null; }
  },
  set(name, value) {
    try {
      if (value === null) localStorage.removeItem(`rabbit-tracks.${name}`);
      else localStorage.setItem(`rabbit-tracks.${name}`, value);
    } catch { /* not remembered, see above */ }
  },
};

// The device's reduced-motion setting, or the one chosen in Settings
const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function reducedMotion() {
  return systemReducedMotion.matches || document.documentElement.dataset.motion === 'reduce';
}


/* ---------- 3. Helpers ---------- */

// "2026-10-03" (or a full timestamp) → "Oct 3, 2026"
function formatDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// "2026-10-03" → "Oct 3"
function formatShortDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Whole days from one date to another ("2026-10-03" → "2026-10-06" is 3)
function daysBetween(from, to) {
  const toDate = (value) => {
    const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  return Math.round((toDate(to) - toDate(from)) / 86400000);
}

// Label for the time between two steps on a trail
function gapLabel(from, to) {
  const days = daysBetween(from, to);
  if (days <= 0) return 'Same day';
  if (days === 1) return 'Next day';
  return `${days} days later`;
}

// Days from a trail's start to its latest discovery, counting both ends
function daysExploring(trail) {
  const latest = trail.discoveries[trail.discoveries.length - 1];
  return Math.max(1, daysBetween(trail.created, latest ? latest.date : trail.created) + 1);
}

/* Each trail gets one of four accent colors (see .accent-0 to .accent-3 in
   styles.css), picked from its id so it stays the same everywhere and
   doesn't change when other trails are added or deleted. */
function accentIndex(trailId) {
  let hash = 0x811c9dc5;                       // FNV-1a hash of the id
  for (const char of String(trailId)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 4) % 4;
}

function accentFor(trailId) {
  return `accent-${accentIndex(trailId)}`;
}

const EXTERNAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';
const PENCIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const TRASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>';

/* The illustration set. Every motif has a job:
     pocket watch   time between finds, days exploring
     mushroom       the curiosity nudge
     card suits     which trail something belongs to
     emblems        the four milestones (below) */
const WATCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M12 13.5l2.5 1.6"/><path d="M10.5 4.5h3M12 4.5v2"/></svg>';
const MUSHROOM_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3.5 12.5C3.5 7.8 7.3 4 12 4s8.5 3.8 8.5 8.5c0 .6-.4 1-1 1h-15c-.6 0-1-.4-1-1z"/><path fill="currentColor" opacity=".55" d="M9.5 13.5h5l.8 6.2a1 1 0 0 1-1 1.1H9.7a1 1 0 0 1-1-1.1z"/><circle cx="9" cy="9" r="1.3" fill="var(--icon-spot, #fff)"/><circle cx="14.5" cy="7.6" r="1" fill="var(--icon-spot, #fff)"/><circle cx="16" cy="11" r=".9" fill="var(--icon-spot, #fff)"/></svg>';

// One suit per trail accent, like a card in a deck
const SUITS = [
  { name: 'spades',   path: 'M12 3.2s7.2 5.3 7.2 10a3.7 3.7 0 0 1-6.2 2.8l1.1 4.8H9.9L11 16a3.7 3.7 0 0 1-6.2-2.8c0-4.7 7.2-10 7.2-10z' },
  { name: 'hearts',   path: 'M12 20.4s-7.6-4.8-7.6-10.3A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.6 2.5c0 5.5-7.6 10.3-7.6 10.3z' },
  { name: 'diamonds', path: 'M12 3l6.8 9-6.8 9-6.8-9z' },
  { name: 'clubs',    path: 'M12 3.4a3.4 3.4 0 0 1 3.2 4.6 3.4 3.4 0 1 1-1.8 6.3l1.1 5.9H9.5l1.1-5.9A3.4 3.4 0 1 1 8.8 8 3.4 3.4 0 0 1 12 3.4z' },
];

function suitFor(trailId) {
  return SUITS[accentIndex(trailId)];
}

function suitSvg(trailId) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${suitFor(trailId).path}"/></svg>`;
}

/* Milestone emblems, a set drawn to read at any size inside a gold seal:
     First find            a newly found star
     On the scent          rabbit tracks
     Deep dive             the golden key to the little door
     Down the rabbit hole  ears disappearing into the hole */
const EMBLEMS = {
  'first-find': '<path fill="currentColor" d="M12 2.8l2.1 6.1 6.1 2.1-6.1 2.1-2.1 6.1-2.1-6.1-6.1-2.1 6.1-2.1z"/><circle cx="18.6" cy="5.2" r="1.2" fill="currentColor"/>',
  'on-the-scent': '<g fill="currentColor"><ellipse cx="6.8" cy="17.6" rx="1.6" ry="2.6" transform="rotate(-24 6.8 17.6)"/><ellipse cx="10" cy="16.4" rx="1.6" ry="2.6" transform="rotate(-24 10 16.4)"/><ellipse cx="13.6" cy="9.4" rx="1.6" ry="2.6" transform="rotate(-24 13.6 9.4)"/><ellipse cx="16.8" cy="8.2" rx="1.6" ry="2.6" transform="rotate(-24 16.8 8.2)"/></g>',
  'deep-dive': '<g fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="7.4" cy="12" r="3.6"/><path d="M11 12h9.4M17.2 12v3.2M20.2 12v2.2"/></g>',
  'rabbit-hole': '<ellipse cx="12" cy="17.2" rx="8.6" ry="3.4" fill="currentColor"/><g fill="currentColor"><ellipse cx="10.2" cy="9.6" rx="1.5" ry="4.6" transform="rotate(-10 10.2 9.6)"/><ellipse cx="13.8" cy="9.6" rx="1.5" ry="4.6" transform="rotate(10 13.8 9.6)"/></g>',
};

function emblemSvg(milestoneId) {
  return `<svg class="emblem" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${EMBLEMS[milestoneId] || EMBLEMS['first-find']}</svg>`;
}


/* Milestones (presentation). What counts as a milestone lives in
   milestones.js; these only turn its numbers into HTML. */

// "5 more discoveries to Down the rabbit hole", with the names in <strong>
function nextMilestoneHtml(count) {
  const { next, toNext } = milestones.progress(count);
  if (!next) return 'Every milestone reached';
  return `${plural(toNext, count ? 'more discovery' : 'discovery', count ? 'more discoveries' : 'discoveries')} to <strong>${escapeHtml(next.name)}</strong>`;
}

/* The trail's rank: its latest milestone as an emblem seal and a name.
   variant: '' on light backgrounds, 'on-dark' on plum. */
function rankHtml(count, variant = '') {
  const { current } = milestones.progress(count);
  const classes = `rank${variant ? ` rank--${variant}` : ''}${current ? '' : ' rank--none'}`;
  return current
    ? `<span class="${classes}"><span class="seal seal--small">${emblemSvg(current.id)}</span><span><span class="visually-hidden">Milestone: </span>${escapeHtml(current.name)}</span></span>`
    : `<span class="${classes}"><span class="seal seal--small seal--empty">1</span><span>No milestones yet</span></span>`;
}

/* The first ten steps of a trail as a row of tracks, one per discovery.
   Steps where a milestone sits carry that milestone's emblem, so a
   glance shows both how far the trail has come and what it has reached.
   Pointing at a step shows its discovery (or how far off a milestone
   is). The same facts are in the text beside every track and on the
   trail page, so the track is hidden from screen readers and is not
   a tab stop: ten per card would bury the real controls. */
function stepTrackHtml(trail) {
  const count = trail.discoveries.length;
  const length = milestones.all[milestones.all.length - 1].count;
  const steps = Array.from({ length }, (_, i) => {
    const step = i + 1;
    const filled = step <= count;
    const milestone = milestones.atStep(step);
    const discovery = trail.discoveries[i];
    let tip = '';
    if (filled) tip = `${milestone ? `${milestone.name} · ` : ''}Step ${step}: ${discovery.title} · ${formatShortDate(discovery.date)}`;
    else if (milestone) tip = `${milestone.name}: ${plural(step - count, 'more discovery', 'more discoveries')}`;
    const classes = ['step-track__step', filled && 'is-filled', milestone && 'is-milestone'].filter(Boolean).join(' ');
    return `<li class="${classes}"${tip ? ` data-tip="${escapeHtml(tip)}"` : ''}>${milestone ? emblemSvg(milestone.id) : ''}</li>`;
  }).join('');
  const more = count > length ? `<span class="step-track__more">+${count - length}</span>` : '';
  return `<div class="step-track" aria-hidden="true"><ol>${steps}</ol>${more}</div>`;
}

/* How much of the line leading to a milestone's station is filled in
   (0–1) for a trail with `count` discoveries */
function trackFill(count, milestone) {
  const progress = milestones.progress(count);
  if (count >= milestone.count) return 1;
  return milestone === progress.next ? progress.fraction : 0;
}

// The discovery that brought a trail to a milestone (its Nth), or null if it hasn't reached it
function discoveryAtMilestone(trail, milestone) {
  return trail.discoveries.length >= milestone.count ? trail.discoveries[milestone.count - 1] : null;
}

/* Where a milestone stands across every trail on the dashboard:
     'reached'   at least one trail has reached it
     'pursuing'  no trail has, but it's the next milestone for one
     'ahead'     still further off */
function milestoneStanding(milestone, trails) {
  if (trails.some((trail) => trail.discoveries.length >= milestone.count)) return 'reached';
  if (trails.some((trail) => milestones.progress(trail.discoveries.length).next === milestone)) return 'pursuing';
  return 'ahead';
}

/* Details for one milestone, shown when its station or emblem is
   selected. scope 'trail': for the open trail. scope 'dashboard':
   across every trail. Only facts from the trails themselves are shown;
   a milestone's date is the date of the discovery that reached it. */
function milestoneDetailHtml(milestone, scope) {
  const head = (reached) => `
    <div class="milestone-detail__head">
      <span class="seal seal--small${reached ? '' : ' seal--empty'}" aria-hidden="true">${reached ? emblemSvg(milestone.id) : milestone.count}</span>
      <p class="milestone-detail__name">${escapeHtml(milestone.name)}</p>
      <p class="milestone-detail__rule">Reached when a trail has ${plural(milestone.count, 'discovery', 'discoveries')}.${reached ? ` ${escapeHtml(milestone.message)}` : ''}</p>
      <button type="button" class="icon-button milestone-detail__close" data-action="close-milestone-detail" aria-label="Close ${escapeHtml(milestone.name)} details">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>`;
  const meter = (count) => `
    <div class="meter" aria-hidden="true"><span style="width: ${Math.min(100, (count / milestone.count) * 100).toFixed(1)}%"></span></div>`;
  const stepLink = (trail, discovery, label) => `<a href="${links.trail(trail.id)}"
    data-show-discovery="${escapeHtml(discovery.id)}" data-trail-id="${escapeHtml(trail.id)}">${label}</a>`;

  if (scope === 'trail') {
    const trail = currentTrail;
    const count = trail.discoveries.length;
    const discovery = discoveryAtMilestone(trail, milestone);
    if (discovery) {
      return `${head(true)}
        <p class="milestone-detail__status is-reached">Reached on ${formatDate(discovery.date)}, with step ${milestone.count}:
          ${stepLink(trail, discovery, escapeHtml(discovery.title))}</p>`;
    }
    return `${head(false)}
      <p class="milestone-detail__status">This trail has ${count} of ${milestone.count}.
        <strong>${plural(milestone.count - count, 'more discovery', 'more discoveries')}</strong> to go.</p>
      ${meter(count)}`;
  }

  // Dashboard: which trails reached it, or which trail is closest
  const reachedBy = dashboardTrails.filter((trail) => discoveryAtMilestone(trail, milestone));
  if (reachedBy.length) {
    const items = reachedBy.map((trail) => {
      const discovery = discoveryAtMilestone(trail, milestone);
      return `<li>${stepLink(trail, discovery, escapeHtml(trail.title))} <span>${formatShortDate(discovery.date)}</span></li>`;
    }).join('');
    return `${head(true)}
      <p class="milestone-detail__status is-reached">Reached on ${plural(reachedBy.length, 'trail')}:</p>
      <ul class="milestone-detail__trails">${items}</ul>`;
  }
  const closest = [...dashboardTrails].sort((a, b) => b.discoveries.length - a.discoveries.length)[0];
  if (!closest) return head(false);
  const count = closest.discoveries.length;
  return `${head(false)}
    <p class="milestone-detail__status">Closest: <strong>${escapeHtml(closest.title)}</strong>, with ${count} of ${milestone.count}
      (${plural(milestone.count - count, 'more discovery', 'more discoveries')} to go).</p>
    ${meter(count)}
    <a class="btn btn--primary btn--small" href="${links.newDiscovery(closest.id)}"><span aria-hidden="true">+</span> Add discovery</a>`;
}

/* Milestone details are disclosure panels: a button with aria-expanded
   opens the panel it controls. One is open at a time; the close button,
   Esc, or a click elsewhere closes it, and focus goes back to the button. */
function toggleMilestoneDetail(button) {
  const wasOpen = button.getAttribute('aria-expanded') === 'true';
  closeMilestoneDetail();
  if (wasOpen) return;
  const panel = document.getElementById(button.getAttribute('aria-controls'));
  const milestone = milestones.all.find((m) => m.id === button.dataset.milestone);
  panel.innerHTML = milestoneDetailHtml(milestone, button.dataset.milestoneScope);
  panel.setAttribute('aria-label', `${milestone.name} details`);
  panel.hidden = false;
  button.setAttribute('aria-expanded', 'true');
}

function closeMilestoneDetail({ returnFocus = false } = {}) {
  const button = document.querySelector('[data-milestone][aria-expanded="true"]');
  if (!button) return false;
  button.setAttribute('aria-expanded', 'false');
  document.getElementById(button.getAttribute('aria-controls')).hidden = true;
  if (returnFocus) button.focus();
  return true;
}

/* The row of milestones on a trail page, with the progress toward the
   next one. previousCount: the count before a discovery was just added,
   so the gold line can grow from where it was. */
function renderTrailProgress(trail, highlightId, previousCount = null) {
  const count = trail.discoveries.length;
  const progress = milestones.progress(count);
  const { current, next } = progress;

  document.getElementById('trail-rank').innerHTML = `
    <span class="seal seal--large${current ? '' : ' seal--empty'}${current && current.id === highlightId ? ' is-new' : ''}">${current ? emblemSvg(current.id) : '?'}</span>
    <div>
      <p class="progress-panel__label">${current ? `Milestone ${progress.reached.length} of ${milestones.all.length}` : 'Just getting started'}</p>
      <p class="progress-panel__name">${current ? escapeHtml(current.name) : 'No milestones yet'}</p>
      <p class="progress-panel__next">${next ? `${nextMilestoneHtml(count)}.` : escapeHtml(current.message)}</p>
    </div>`;

  document.getElementById('trail-milestone-detail').hidden = true;
  document.getElementById('milestone-track').innerHTML = milestones.all.map((milestone) => {
    const reached = count >= milestone.count;
    const isNext = milestone === next;
    const fill = trackFill(count, milestone);
    const fillFrom = previousCount === null ? fill : trackFill(previousCount, milestone);
    const classes = ['milestone', reached && 'is-reached', isNext && 'is-next', milestone.id === highlightId && 'is-new',
      fillFrom !== fill && 'is-growing'].filter(Boolean).join(' ');
    return `
      <li class="${classes}" style="--fill: ${fill.toFixed(3)}; --fill-from: ${fillFrom.toFixed(3)}">
        <button type="button" class="milestone__button" aria-expanded="false" aria-controls="trail-milestone-detail"
                data-milestone="${milestone.id}" data-milestone-scope="trail">
          <span class="milestone__seal" aria-hidden="true">${emblemSvg(milestone.id)}</span>
          <span class="milestone__name">${escapeHtml(milestone.name)}</span>
          <span class="milestone__count">${reached ? 'Reached' : isNext ? `${count} of ${milestone.count}` : plural(milestone.count, 'discovery', 'discoveries')}<span class="visually-hidden">${reached ? '' : ', not reached yet'}</span></span>
        </button>
      </li>`;
  }).join('');
}

/* Announces a newly reached milestone. Anything can listen for the
   "rabbittracks:milestone" event (the achievement card below does);
   richer celebrations can be added later as more listeners. */
function announceMilestone(milestone, trail, count) {
  if (!milestone) return;
  document.dispatchEvent(new CustomEvent('rabbittracks:milestone', {
    detail: { milestone, count, trailId: trail.id, trailTitle: trail.title },
  }));
}

document.addEventListener('rabbittracks:milestone', ({ detail }) => {
  justReachedMilestone = detail.milestone.id;
  showAchievement(detail);
});

/* The achievement card: slides in at the bottom corner, stays a few
   seconds (longer while pointed at or focused), and never blocks the
   page. Screen readers hear it through #announcer. */
const achievementCard = document.getElementById('achievement');
let achievementTimer;

function showAchievement({ milestone, count, trailTitle }) {
  const { next, reached } = milestones.progress(count);
  const set = milestones.all.map((m) => `
    <li class="${count >= m.count ? 'is-reached' : ''}${m === milestone ? ' is-new' : ''}">
      <span class="seal seal--small${count >= m.count ? '' : ' seal--empty'}">${emblemSvg(m.id)}</span>
    </li>`).join('');
  achievementCard.innerHTML = `
    <span class="achievement__medal" aria-hidden="true"><span class="seal seal--large is-new">${emblemSvg(milestone.id)}</span></span>
    <div class="achievement__body">
      <p class="achievement__label">Discovery added · Milestone reached</p>
      <p class="achievement__name">${escapeHtml(milestone.name)}</p>
      <p class="achievement__message">${escapeHtml(milestone.message)}</p>
      <ol class="achievement__set" aria-hidden="true">${set}</ol>
      <p class="achievement__next">${reached.length} of ${milestones.all.length} on <strong>${escapeHtml(trailTitle)}</strong>.
        ${next ? `Next: <strong>${escapeHtml(next.name)}</strong> at ${plural(next.count, 'discovery', 'discoveries')}.` : 'Every milestone reached.'}</p>
    </div>
    <button type="button" class="icon-button achievement__close" data-action="close-achievement" aria-label="Dismiss">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>`;
  achievementCard.hidden = false;
  requestAnimationFrame(() => achievementCard.classList.add('is-visible'));
  announce(`Discovery added. Milestone reached: ${milestone.name}. ${milestone.message}`);
  scheduleAchievementClose(7000);
}

function scheduleAchievementClose(delay) {
  clearTimeout(achievementTimer);
  achievementTimer = setTimeout(hideAchievement, delay);
}

function hideAchievement() {
  clearTimeout(achievementTimer);
  achievementCard.classList.remove('is-visible');
  setTimeout(() => {
    if (!achievementCard.classList.contains('is-visible')) achievementCard.hidden = true;
  }, 300);
}

// Keep it open while someone is reading or using it
achievementCard.addEventListener('mouseenter', () => clearTimeout(achievementTimer));
achievementCard.addEventListener('focusin', () => clearTimeout(achievementTimer));
achievementCard.addEventListener('mouseleave', () => scheduleAchievementClose(2500));
achievementCard.addEventListener('focusout', () => scheduleAchievementClose(2500));

// "https://www.unity.com/learn" → "unity.com"
function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function plural(count, word, pluralWord = word + 's') {
  return `${count} ${count === 1 ? word : pluralWord}`;
}

// Text typed into forms is shown with innerHTML, so make it safe first
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}

// Read out by screen readers only (the visible card says the same thing)
function announce(message) {
  const announcer = document.getElementById('announcer');
  announcer.textContent = '';
  setTimeout(() => { announcer.textContent = message; }, 50);
}


/* ---------- 4. Screens + the status screen ----------
   Every screen is a <section id="screen-NAME">. Only one has "is-active".
   The screen's <h1> receives focus so keyboard and screen reader users
   know the page changed. */

function showScreen(name) {
  closeMilestoneDetail();
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('is-active'));

  const screen = document.getElementById('screen-' + name);
  screen.classList.add('is-active');

  window.scrollTo(0, 0);
  screen.querySelector('h1').focus({ preventScroll: true });

  // Mark "My trails" in the header as the current page while on the dashboard
  const navLink = document.getElementById('nav-my-trails');
  if (name === 'dashboard') navLink.setAttribute('aria-current', 'page');
  else navLink.removeAttribute('aria-current');
}

// kind: 'loading', 'error', or 'not-found'. actionsHtml: buttons/links to show.
function showStatus(kind, title, message = '', actionsHtml = '') {
  document.getElementById('status').className = `status status--${kind}`;
  setText('status-title', title);
  setText('status-message', message);
  document.getElementById('status-actions').innerHTML = actionsHtml;
  showScreen('status');
}

function showNotFound() {
  showStatus('not-found', 'This trail isn’t here',
    'It may have been deleted, or the link is wrong.',
    '<a class="btn btn--primary" href="#/">Back to my trails</a>');
}

// A failed load: "not found" for 404s, otherwise an error with a retry button
function showLoadError(error) {
  if (error.status === 404) {
    showNotFound();
    return;
  }
  console.error('[Rabbit Tracks] Loading failed:', error);
  showStatus('error', 'Something went wrong',
    error.message || 'Your trails couldn’t be loaded.',
    `<button type="button" class="btn btn--primary" data-action="retry">Try again</button>
     <a class="btn btn--ghost" href="#/">Back to my trails</a>`);
}

/* Waits for data. The loading screen only appears if it takes more than a
   quarter of a second, so quick responses don't cause a flash. */
async function load(promise, version) {
  const timer = setTimeout(() => {
    if (version === routeVersion) showStatus('loading', 'Loading…');
  }, 250);
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
  }
}


/* ---------- 5. Routing ----------
   The part of the address after "#" decides the screen:
     #/                                  dashboard
     #/trails/new                        new trail form
     #/trails/ID                         trail + timeline
     #/trails/ID/edit                    edit trail form
     #/trails/ID/discoveries/new         add discovery form
     #/trails/ID/discoveries/ID/edit     edit discovery form */

const links = {
  dashboard: () => '#/',
  trail: (trailId) => `#/trails/${encodeURIComponent(trailId)}`,
  editTrail: (trailId) => `#/trails/${encodeURIComponent(trailId)}/edit`,
  newDiscovery: (trailId) => `#/trails/${encodeURIComponent(trailId)}/discoveries/new`,
  editDiscovery: (trailId, discoveryId) =>
    `#/trails/${encodeURIComponent(trailId)}/discoveries/${encodeURIComponent(discoveryId)}/edit`,
};

function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === 'trails')) return { name: 'dashboard' };
  if (parts[0] !== 'trails') return { name: 'not-found' };
  if (parts.length === 2 && parts[1] === 'new') return { name: 'trail-new' };

  const trailId = parts[1];
  if (parts.length === 2) return { name: 'trail', trailId };
  if (parts.length === 3 && parts[2] === 'edit') return { name: 'trail-edit', trailId };
  if (parts[2] === 'discoveries') {
    if (parts.length === 4 && parts[3] === 'new') return { name: 'discovery-new', trailId };
    if (parts.length === 5 && parts[4] === 'edit') return { name: 'discovery-edit', trailId, discoveryId: parts[3] };
  }
  return { name: 'not-found' };
}

// Shows the screen for the current address
async function route() {
  const version = ++routeVersion;
  const current = parseRoute(location.hash);

  try {
    if (current.name === 'dashboard') {
      const trails = await load(trailData.listTrails(), version);
      if (version !== routeVersion) return;
      renderDashboard(trails);
      showScreen('dashboard');
      maybeWelcome();
      return;
    }

    if (current.name === 'trail-new') {
      openTrailForm(null);
      return;
    }

    if (current.name === 'not-found') {
      showNotFound();
      return;
    }

    // Every other screen needs the trail first
    const trail = await load(trailData.getTrail(current.trailId), version);
    if (version !== routeVersion) return;
    currentTrail = trail;

    if (current.name === 'trail') {
      renderTrail();
      showScreen('trail');
    } else if (current.name === 'trail-edit') {
      openTrailForm(trail);
    } else if (current.name === 'discovery-new') {
      openDiscoveryForm(null);
    } else if (current.name === 'discovery-edit') {
      const discovery = trail.discoveries.find((d) => d.id === current.discoveryId);
      if (discovery) openDiscoveryForm(discovery);
      else showNotFound();
    }
  } catch (error) {
    if (version === routeVersion) showLoadError(error);
  }
}

// Go to an address. If it's already the current one, reload that screen.
function goTo(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

// Cancel/Back return to where you came from, but only if that was the dashboard or a trail
function backTarget(fallback) {
  const from = parseRoute(previousHash).name;
  return from === 'dashboard' || from === 'trail' ? previousHash : fallback;
}

function setCancelLinks(formName, href, label) {
  document.querySelectorAll(`[data-cancel="${formName}"]`).forEach((link) => {
    link.href = href;
    const labelSpan = link.querySelector('[data-cancel-label]');
    if (labelSpan && label) labelSpan.textContent = label;
  });
}


/* ---------- 6. Dashboard ---------- */

function renderDashboard(trails) {
  dashboardTrails = trails;

  // Most recently updated trails first
  const sorted = [...trails].sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
  const hasTrails = trails.length > 0;

  document.getElementById('empty-state').hidden = hasTrails;
  const grid = document.getElementById('dash-grid');
  grid.hidden = !hasTrails;
  /* With one or two trails the chapters are short, so the cabinet sits
     beside the side column instead of under both (see .dash-grid--compact) */
  grid.classList.toggle('dash-grid--compact', trails.length <= 2);

  renderOverview(trails, sorted[0]);
  renderContinue(sorted[0]);
  renderSampleNotice(trails);
  renderTrailList(sorted);
  renderDestination(sorted);
  renderAchievements(sorted);
  renderNudge(sorted);
  renderCabinet(sorted);
}

/* The example trails (the ones in sample-data.js, also what the seed
   script adds) are recognised by their title and question, so nothing
   extra is stored. Once an example is edited it's treated as yours. */
function isExample(trail) {
  return SAMPLE_TRAILS.some((example) => example.title === trail.title && example.question === trail.question);
}

// "These are example trails": while any example is on the dashboard, until dismissed
function renderSampleNotice(trails) {
  const notice = document.getElementById('sample-notice');
  notice.hidden = prefs.get('sampleNotice') === 'dismissed' || !trails.some(isExample);
  setText('sample-notice-text', `They show how a trail grows: a question, the discoveries found along the way, and the milestones reached. Explore them, then start your own with New trail. ${trailData.source === 'api'
    ? 'Delete an example from its card when you no longer need it.'
    : 'You can clear or restore the examples in Settings.'}`);
}

/* Every discovery across every trail as { trail, discovery, index },
   newest date first; on the same date, the later step first. */
function discoveriesNewestFirst(trails) {
  const all = trails.flatMap((trail) =>
    trail.discoveries.map((discovery, index) => ({ trail, discovery, index })));
  return all.sort((a, b) => String(b.discovery.date).localeCompare(String(a.discovery.date)) || b.index - a.index);
}

// Today as "2026-10-26", in the browser's time zone
function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// 1 → "I", 4 → "IV": chapter numbers
function roman(number) {
  const numerals = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let result = '';
  for (const [value, letters] of numerals) {
    while (number >= value) { result += letters; number -= value; }
  }
  return result || String(number);
}

/* The welcome: one sentence about where the research stands, and a
   quiet line of totals (words, not a row of stat cards). */
function renderOverview(trails, mostRecent) {
  const lede = document.getElementById('overview-lede');
  const tally = document.getElementById('overview-stats');
  tally.hidden = trails.length === 0;

  if (!trails.length) {
    lede.textContent = 'Your journal is empty, and every rabbit hole starts with a question. What are you curious about?';
    tally.textContent = '';
    return;
  }

  const counts = trails.map((trail) => trail.discoveries.length);
  const discoveryCount = counts.reduce((sum, count) => sum + count, 0);
  const milestoneCount = milestones.tally(counts).total;
  const latest = discoveriesNewestFirst(trails)[0];

  lede.innerHTML = `You’re following ${plural(trails.length, 'question')} down the rabbit hole.${latest
    ? ` Your latest find was <a href="${links.trail(latest.trail.id)}" data-show-discovery="${escapeHtml(latest.discovery.id)}" data-trail-id="${escapeHtml(latest.trail.id)}">${escapeHtml(latest.discovery.title)}</a>, on ${formatShortDate(latest.discovery.date)}.`
    : ` <a href="${links.trail(mostRecent.id)}">${escapeHtml(mostRecent.title)}</a> is waiting for its first discovery.`}`;
  tally.innerHTML = [
    `<strong>${trails.length}</strong> ${trails.length === 1 ? 'trail' : 'trails'}`,
    `<strong>${discoveryCount}</strong> ${discoveryCount === 1 ? 'discovery' : 'discoveries'}`,
    `<strong>${milestoneCount}</strong> ${milestoneCount === 1 ? 'milestone' : 'milestones'} reached`,
  ].join('<span aria-hidden="true"> · </span>');
}

/* "Continue where you left off": the most recently updated trail,
   drawn as a route from its question through each discovery to the
   next milestone. It sits in the welcome scene. */
function renderContinue(trail) {
  const panel = document.getElementById('continue');
  panel.hidden = !trail;
  if (!trail) {
    panel.innerHTML = '';
    return;
  }

  const count = trail.discoveries.length;
  const { next } = milestones.progress(count);

  panel.className = `feature ${accentFor(trail.id)}`;
  panel.innerHTML = `
    <div class="feature__head">
      <p class="eyebrow eyebrow--on-dark">Continue where you left off</p>
      <h2 class="feature__title" id="continue-title">
        <span class="suit-mark" aria-hidden="true">${suitSvg(trail.id)}</span>
        <a href="${links.trail(trail.id)}">${escapeHtml(trail.title)}</a>
      </h2>
      <p class="feature__question">${escapeHtml(trail.question)}</p>
    </div>
    <div class="feature__side">
      ${rankHtml(count, 'on-dark')}
      <p class="feature__next">${next
        ? `<span class="feature__key" aria-hidden="true">${emblemSvg(next.id)}</span><span>Next: ${nextMilestoneHtml(count)}</span>`
        : 'Every milestone reached on this trail.'}</p>
      <div class="feature__actions">
        <a class="btn btn--light" href="${links.newDiscovery(trail.id)}"><span aria-hidden="true">+</span> Add discovery</a>
        <a class="btn btn--on-dark" href="${links.trail(trail.id)}">Open trail</a>
      </div>
    </div>
    ${routeHtml(trail)}`;
}

/* The route on the "Continue" panel: the question, the latest
   discoveries (up to 7), the next milestone still to reach, and the
   hole. Milestone stops carry a flag with their emblem and name. Each
   discovery stop is a link that opens the trail at that discovery, with
   its title and date shown on hover or focus; the other stops are only
   pictures, so screen readers skip them. */
function routeHtml(trail) {
  const count = trail.discoveries.length;
  const firstShown = Math.max(0, count - 7);
  const { next } = milestones.progress(count);

  const stops = [`
    <li class="route__stop route__stop--start" aria-hidden="true">
      <span class="route__dot">?</span>
      <span class="route__label">${firstShown ? `+${firstShown} earlier` : 'Question'}</span>
    </li>`];

  trail.discoveries.slice(firstShown).forEach((discovery, i) => {
    const step = firstShown + i + 1;
    const milestone = milestones.atStep(step);
    const date = formatShortDate(discovery.date);
    const classes = ['route__stop', milestone && 'route__stop--milestone', step === count && 'route__stop--latest']
      .filter(Boolean).join(' ');
    stops.push(`
      <li class="${classes}">
        ${milestone ? `<span class="route__flag" aria-hidden="true">${emblemSvg(milestone.id)}${escapeHtml(milestone.name)}</span>` : ''}
        <a class="route__dot" href="${links.trail(trail.id)}" data-show-discovery="${escapeHtml(discovery.id)}" data-trail-id="${escapeHtml(trail.id)}"
           aria-label="Step ${step}: ${escapeHtml(discovery.title)}, ${date}${milestone ? `, reached ${escapeHtml(milestone.name)}` : ''}">${step}</a>
        <span class="route__tip" aria-hidden="true"><strong>${escapeHtml(discovery.title)}</strong>${date}${milestone ? ` · ${escapeHtml(milestone.name)}` : ''}</span>
        <span class="route__label" aria-hidden="true">${date}</span>
      </li>`);
  });

  if (next) {
    stops.push(`
      <li class="route__stop route__stop--ahead${next.count > count + 1 ? ' route__stop--gap' : ''}" aria-hidden="true">
        <span class="route__flag">${emblemSvg(next.id)}${escapeHtml(next.name)}</span>
        <span class="route__dot">${next.count}</span>
        <span class="route__label">${plural(next.count - count, 'to go', 'to go')}</span>
      </li>`);
  }

  stops.push('<li class="route__stop route__stop--hole" aria-hidden="true"><span class="hole"></span></li>');
  return `<ol class="route" aria-label="The route so far on ${escapeHtml(trail.title)}">${stops.join('')}</ol>`;
}

/* Each trail is a chapter: numbered in the order the trails were
   started, marked with its suit like a playing card (the corner shows
   how many discoveries it holds), with its question, its tracks so far,
   its last stop, and its next milestone. Only the title and "Continue
   the trail" open it; Edit and Delete are small tools that never do. */
function renderTrailList(sorted) {
  setText('trail-list-meta', sorted.length ? `${plural(sorted.length, 'chapter')} · most recently explored first` : '');
  const chapterOf = new Map([...sorted]
    .sort((a, b) => String(a.created).localeCompare(String(b.created)))
    .map((trail, i) => [trail.id, i + 1]));

  document.getElementById('trail-list').innerHTML = sorted.map((trail, i) => {
    const count = trail.discoveries.length;
    const latest = trail.discoveries[count - 1];
    const { next } = milestones.progress(count);
    const title = escapeHtml(trail.title);

    // The first card is where the tour shows what a trail is
    return `
      <li class="trail-card chapter ${accentFor(trail.id)}"${i === 0 ? ' data-tour="trail-card"' : ''}>
        <span class="chapter__corner" aria-hidden="true"><span>${count}</span>${suitSvg(trail.id)}</span>
        <p class="chapter__label">Chapter ${roman(chapterOf.get(trail.id))} · ${formatShortDate(trail.updated)}${isExample(trail)
          ? ' <span class="example-tag">Example</span>' : ''}</p>
        <h3 class="chapter__title"><a class="trail-card__open" href="${links.trail(trail.id)}">${title}</a></h3>
        <p class="chapter__question">${escapeHtml(trail.question)}</p>

        ${stepTrackHtml(trail)}

        <dl class="chapter__facts">
          <div>
            <dt>Last stop</dt>
            <dd>${latest ? escapeHtml(latest.title) : 'No discoveries yet'}</dd>
          </div>
          <div>
            <dt>Next milestone</dt>
            <dd>${next ? `<span class="chapter__key" aria-hidden="true">${emblemSvg(next.id)}</span>${nextMilestoneHtml(count)}` : 'Every milestone reached'}</dd>
          </div>
        </dl>

        <div class="chapter__foot">
          <a class="chapter__go" href="${links.trail(trail.id)}" aria-label="Continue ${title}">Continue the trail <span aria-hidden="true">→</span></a>
          <div class="chapter__tools">
            <a class="icon-button" href="${links.editTrail(trail.id)}" aria-label="Edit ${title}">${PENCIL_ICON}</a>
            <button type="button" class="icon-button icon-button--danger" data-action="delete-trail" data-trail-id="${escapeHtml(trail.id)}"
                    aria-label="Delete ${title}">${TRASH_ICON}</button>
          </div>
        </div>
      </li>`;
  }).join('');
}

/* Next destination: the trail closest to its next milestone (fewest
   discoveries to go; on a tie, the most recently explored one). */
function renderDestination(sorted) {
  closestMilestone = null;
  let closest = null;
  sorted.forEach((trail) => {
    const progress = milestones.progress(trail.discoveries.length);
    if (progress.next && (!closest || progress.toNext < closest.progress.toNext)) closest = { trail, progress };
  });

  const panel = document.getElementById('next-up');
  panel.hidden = !closest;
  if (!closest) return;
  const { trail, progress } = closest;
  panel.innerHTML = `
    <h2 class="side-heading" id="next-up-heading">Next destination</h2>
    <div class="destination__body">
      <span class="seal seal--empty destination__seal" aria-hidden="true">${emblemSvg(progress.next.id)}</span>
      <p><strong>${escapeHtml(trail.title)}</strong> is ${plural(progress.toNext, 'discovery', 'discoveries')}
        from <strong>${escapeHtml(progress.next.name)}</strong>.</p>
    </div>
    <a class="btn btn--light btn--small" href="${links.newDiscovery(trail.id)}"><span aria-hidden="true">+</span> Add discovery</a>`;
  closestMilestone = progress.next;
}

/* The achievement collection: the four emblems, each reached, being
   pursued, or still ahead. Each opens its details below the set. */
let closestMilestone = null;
function renderAchievements(sorted) {
  const counts = sorted.map((trail) => trail.discoveries.length);
  const { earned } = milestones.tally(counts);
  const most = Math.max(0, ...counts);

  document.getElementById('achievement-detail').hidden = true;
  document.getElementById('achievement-list').innerHTML = earned.map(({ milestone, trails }) => {
    const standing = milestoneStanding(milestone, sorted);
    const isNext = milestone === closestMilestone && standing !== 'reached';
    let status;
    if (standing === 'reached') status = `Reached on ${plural(trails, 'trail')}`;
    else if (standing === 'pursuing') status = `In progress · ${most} of ${milestone.count}`;
    else status = `Ahead · ${plural(milestone.count, 'discovery', 'discoveries')}`;
    return `
      <li class="emblem-item is-${standing}${isNext ? ' is-next' : ''}">
        <button type="button" class="emblem-item__button" aria-expanded="false"
                aria-controls="achievement-detail" data-milestone="${milestone.id}" data-milestone-scope="dashboard">
          <span class="seal${standing === 'reached' ? '' : ' seal--empty'}" aria-hidden="true">${emblemSvg(milestone.id)}</span>
          <span class="emblem-item__name">${escapeHtml(milestone.name)}</span>
          <span class="emblem-item__status">${status}</span>
          ${standing === 'pursuing' ? `<span class="meter meter--small" aria-hidden="true"><span style="width: ${((most / milestone.count) * 100).toFixed(1)}%"></span></span>` : ''}
        </button>
      </li>`;
  }).join('');
}

/* The curiosity nudge: an honest suggestion from the trails themselves.
   It picks the trail that has gone longest without a visit and points
   back at its last stop or its question. Nothing here is generated or
   guessed: it only repeats what the trail already holds. */
function renderNudge(sorted) {
  const panel = document.getElementById('nudge');
  const trail = sorted[sorted.length - 1]; // least recently explored
  panel.hidden = !trail;
  if (!trail) return;

  const latest = trail.discoveries[trail.discoveries.length - 1];
  const quietFor = Math.max(0, daysBetween(trail.updated, todayISO()));
  const title = `<strong>${escapeHtml(trail.title)}</strong>`;
  let text;
  let action;
  if (!latest) {
    text = `${title} is still waiting for its first discovery. One link is enough to start the trail.`;
    action = `<a class="nudge__action" href="${links.newDiscovery(trail.id)}">Add a first find <span aria-hidden="true">→</span></a>`;
  } else {
    const lastStop = `<em>${escapeHtml(latest.title)}</em>`;
    text = quietFor >= 3
      ? `${title} has been quiet for ${plural(quietFor, 'day')}. Your last stop was ${lastStop}. What did it leave you wondering?`
      : `On ${title}, your last stop was ${lastStop}. What did it leave you wondering?`;
    action = `<a class="nudge__action" href="${links.trail(trail.id)}">Pick up the trail <span aria-hidden="true">→</span></a>`;
  }
  panel.innerHTML = `
    <h2 class="side-heading" id="nudge-heading"><span class="nudge__icon" aria-hidden="true">${MUSHROOM_ICON}</span> Curiosity nudge</h2>
    <p class="nudge__question">“${escapeHtml(trail.question)}”</p>
    <p class="nudge__text">${text}</p>
    ${action}`;
}

/* The curiosity cabinet: every discovery across every trail, newest
   first, set out like curiosities in a display case. Each card has a
   window (the site's first letter and the trail's suit), a label (the
   site, the title, what caught your attention or the start of the
   note), and where and when it was found. Only what was saved is shown:
   nothing is fetched from the sites themselves.
     title        opens the trail at that discovery (see the click handler)
     Look closer  everything saved for it, in a dialog
     ↗            the source, in a new tab (only for http(s) links)
   Four at a time; "Show more" adds four. A collection smaller than a
   row ends with an open slot that says what goes there next. */
const CABINET_PAGE = 4;
let cabinetShown = CABINET_PAGE;

function renderCabinet(sorted) {
  const all = discoveriesNewestFirst(sorted);
  const trailCount = new Set(all.map(({ trail }) => trail.id)).size;
  cabinetShown = Math.max(CABINET_PAGE, Math.min(cabinetShown, all.length));
  const shown = all.slice(0, cabinetShown);

  setText('cabinet-meta', all.length
    ? `${plural(all.length, 'curiosity', 'curiosities')} collected from ${plural(trailCount, 'trail')}, newest first`
    : 'Where every discovery you save is collected');

  const more = document.getElementById('cabinet-more');
  more.hidden = all.length <= CABINET_PAGE;
  const remaining = all.length - shown.length;
  more.textContent = remaining ? `Show ${Math.min(CABINET_PAGE, remaining)} more` : 'Show fewer';
  more.setAttribute('aria-expanded', String(shown.length > CABINET_PAGE));

  const cards = shown.map(curioCardHtml);
  if (all.length < CABINET_PAGE && sorted.length) cards.push(curioSlotHtml(sorted[0], all.length));
  document.getElementById('recent-list').innerHTML = cards.join('');
}

// Up to `max` characters, cut at a word
function snippet(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : cut.length).trimEnd()}…`;
}

function curioCardHtml({ trail, discovery, index }) {
  const valid = isValidUrl(discovery.url);
  const domain = valid ? getDomain(discovery.url) : '';
  const title = escapeHtml(discovery.title);
  const id = escapeHtml(discovery.id);
  const trailId = escapeHtml(trail.id);
  let excerpt;
  if (discovery.highlight) {
    excerpt = `<p class="curio__excerpt curio__excerpt--highlight"><span class="visually-hidden">What caught my attention: </span>${escapeHtml(snippet(discovery.highlight, 110))}</p>`;
  } else if (discovery.note) {
    excerpt = `<p class="curio__excerpt">${escapeHtml(snippet(discovery.note, 110))}</p>`;
  } else {
    excerpt = `<p class="curio__excerpt curio__excerpt--empty">Saved as a quick find.
      <a href="${links.editDiscovery(trail.id, discovery.id)}">Add what you learned<span class="visually-hidden"> about ${title}</span></a></p>`;
  }
  return `
    <li class="curio ${accentFor(trail.id)}">
      <div class="curio__window" aria-hidden="true">
        <span class="curio__suit">${suitSvg(trail.id)}</span>
        <span class="curio__monogram">${escapeHtml((domain || discovery.title).charAt(0).toUpperCase())}</span>
        <span class="curio__no">Step ${index + 1}</span>
      </div>
      <div class="curio__label">
        <p class="curio__source">${valid ? escapeHtml(domain) : 'No source link'}</p>
        <h3 class="curio__title" title="${title}">
          <a href="${links.trail(trail.id)}" data-show-discovery="${id}" data-trail-id="${trailId}">${title}</a>
        </h3>
        ${excerpt}
        <p class="curio__meta">
          <span class="suit-mark" aria-hidden="true">${suitSvg(trail.id)}</span>
          <span class="curio__trail">${escapeHtml(trail.title)}</span>
          <span aria-hidden="true">·</span>
          <time datetime="${escapeHtml(String(discovery.date).slice(0, 10))}">${formatShortDate(discovery.date)}</time>
        </p>
      </div>
      <div class="curio__actions">
        <button type="button" class="text-button" data-action="open-curio" data-trail-id="${trailId}" data-discovery-id="${id}"
                aria-haspopup="dialog" aria-label="Look closer at ${title}">Look closer</button>
        ${valid ? `<a class="icon-button" href="${escapeHtml(discovery.url)}" target="_blank" rel="noopener noreferrer"
             aria-label="Visit ${escapeHtml(domain)}, the source of ${title} (opens in a new tab)">${EXTERNAL_ICON}</a>` : ''}
      </div>
    </li>`;
}

// The open slot: what goes in the cabinet, and how to add the next thing
function curioSlotHtml(trail, count) {
  return `
    <li class="curio curio--slot">
      <div class="curio__window" aria-hidden="true"><span class="curio__monogram">?</span></div>
      <div class="curio__label">
        <p class="curio__source">${count ? 'Room for more' : 'An empty shelf'}</p>
        <h3 class="curio__title">${count ? 'Your next curiosity goes here' : 'Your discoveries will be kept here'}</h3>
        <p class="curio__excerpt">${count
          ? 'Every page you save on a trail joins the collection, newest first.'
          : 'Save a page you found while exploring, and it’s collected here with where and when you found it.'}</p>
      </div>
      <div class="curio__actions">
        <a class="btn btn--primary btn--small" href="${links.newDiscovery(trail.id)}"><span aria-hidden="true">+</span> Add to ${escapeHtml(trail.title)}</a>
      </div>
    </li>`;
}

/* A curiosity, up close: everything saved for one discovery, with ways
   to revisit it (its trail, its source) and to change it. */
const curioDialog = document.getElementById('curio-dialog');

function openCurio(trailId, discoveryId) {
  const trail = dashboardTrails.find((t) => t.id === trailId);
  const discovery = trail?.discoveries.find((d) => d.id === discoveryId);
  if (!discovery) return;
  const step = trail.discoveries.indexOf(discovery) + 1;
  const valid = isValidUrl(discovery.url);
  const domain = valid ? getDomain(discovery.url) : '';
  const milestone = milestones.atStep(step);

  curioDialog.className = `dialog curio-dialog ${accentFor(trail.id)}`;
  curioDialog.innerHTML = `
    <div class="curio-dialog__head">
      <span class="curio__window curio-dialog__window" aria-hidden="true">
        <span class="curio__suit">${suitSvg(trail.id)}</span>
        <span class="curio__monogram">${escapeHtml((domain || discovery.title).charAt(0).toUpperCase())}</span>
      </span>
      <div>
        <p class="curio__source">${valid ? escapeHtml(domain) : 'No source link'}</p>
        <h2 class="dialog__title" id="curio-dialog-title">${escapeHtml(discovery.title)}</h2>
      </div>
      <button type="button" class="icon-button" data-action="close-curio" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <dl class="curio-dialog__facts">
      <div><dt>Trail</dt><dd><span class="suit-mark" aria-hidden="true">${suitSvg(trail.id)}</span> ${escapeHtml(trail.title)}</dd></div>
      <div><dt>Found</dt><dd>${formatDate(discovery.date)}, step ${step}${milestone ? ` · reached <strong>${escapeHtml(milestone.name)}</strong>` : ''}</dd></div>
    </dl>
    <p class="curio-dialog__question">${escapeHtml(trail.question)}</p>
    ${discovery.highlight ? `<div class="curio-dialog__block"><p class="curio-dialog__label">What caught my attention</p>
      <p class="discovery__highlight">${escapeHtml(discovery.highlight)}</p></div>` : ''}
    ${discovery.note ? `<div class="curio-dialog__block"><p class="curio-dialog__label">What I learned</p>
      <p class="curio-dialog__note">${escapeHtml(discovery.note)}</p></div>` : ''}
    ${discovery.highlight || discovery.note ? '' : '<p class="curio-dialog__empty">Saved as a quick find, with no notes yet.</p>'}
    <div class="dialog__actions curio-dialog__actions">
      <a class="text-button" href="${links.editDiscovery(trail.id, discovery.id)}">Edit<span class="visually-hidden"> ${escapeHtml(discovery.title)}</span></a>
      ${valid ? `<a class="btn btn--secondary btn--small" href="${escapeHtml(discovery.url)}" target="_blank" rel="noopener noreferrer">
        Visit source ${EXTERNAL_ICON}<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}
      <a class="btn btn--primary btn--small" href="${links.trail(trail.id)}" data-show-discovery="${escapeHtml(discovery.id)}" data-trail-id="${escapeHtml(trail.id)}">Open on its trail <span aria-hidden="true">→</span></a>
    </div>`;
  curioDialog.showModal();
}

curioDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeDialog(curioDialog);
});

// Leaving for a trail or the edit form closes it; so does clicking outside it
curioDialog.addEventListener('click', (event) => {
  if (event.target === curioDialog || event.target.closest('a[href^="#/"]')) closeDialog(curioDialog);
});


/* ---------- 7. Trail details (the journey) ----------
   The question, each discovery, and a stop for each milestone reached,
   placed on alternating sides of a winding path that's drawn through
   their markers (drawJourneyPath). The path ends at the rabbit hole,
   with Quick find: save the next discovery without leaving the page. */

let lastDrawnTrailId = null;   // the path draws itself in only when a trail is first opened

function renderTrail() {
  const trail = currentTrail;
  const count = trail.discoveries.length;
  const latest = trail.discoveries[count - 1];
  const days = daysExploring(trail);
  const highlight = justReachedMilestone; // only highlighted the first time it's shown
  justReachedMilestone = null;
  // A discovery just added here: it appears on the path, the count and the gold line move up from before
  const added = justAdded && trail.discoveries.some((d) => d.id === justAdded.discoveryId) ? justAdded : null;
  justAdded = null;

  // The trail's accent colour also tints its path (see .accent-N in styles.css)
  const screen = document.getElementById('screen-trail');
  screen.classList.remove('accent-0', 'accent-1', 'accent-2', 'accent-3');
  screen.classList.add(accentFor(trail.id));
  renderTrailProgress(trail, highlight, added ? added.previousCount : null);
  // How many milestones are reached: the path's colour deepens with it (see styles.css)
  document.getElementById('journey-map').dataset.stage = milestones.progress(count).reached.length;

  setText('trail-title', trail.title);
  setText('trail-breadcrumb', trail.title);
  setText('trail-started', `Trail · started ${formatDate(trail.created)}`);
  setText('trail-question', trail.question);
  setText('trail-description', trail.description || '');
  setText('trail-stat-count', count);
  document.getElementById('trail-stat-count').classList.toggle('is-bumped', !!added);
  setText('trail-stat-days', days);
  setText('trail-stat-updated', latest ? formatShortDate(latest.date) : '—');
  setText('journey-summary', count
    ? `${plural(count, 'discovery', 'discoveries')} over ${plural(days, 'day')}, oldest first`
    : 'No discoveries yet');
  const mark = document.getElementById('trail-mark');
  mark.className = `pip pip--large ${accentFor(trail.id)}`;
  mark.innerHTML = suitSvg(trail.id);
  document.getElementById('trail-add-discovery').href = links.newDiscovery(trail.id);
  document.getElementById('trail-edit-link').href = links.editTrail(trail.id);

  const stops = [`
    <li class="stop stop--start">
      <span class="stop__marker" aria-hidden="true">?</span>
      <div class="stop__content">
        <div class="question-panel">
          <p class="question-panel__label">It started with a question · ${formatDate(trail.created)}</p>
          <p class="question-panel__text">${escapeHtml(trail.question)}</p>
        </div>
      </div>
    </li>`];

  trail.discoveries.forEach((discovery, index) => {
    const step = index + 1;
    const isLatest = step === count;
    const previousDate = index === 0 ? trail.created : trail.discoveries[index - 1].date;
    const domain = getDomain(discovery.url);
    const milestone = milestones.atStep(step);
    // Only link to http(s) addresses, never javascript: or other schemes
    const visit = isValidUrl(discovery.url)
      ? `<a class="discovery__visit" href="${escapeHtml(discovery.url)}" target="_blank" rel="noopener noreferrer">
           Visit website ${EXTERNAL_ICON}<span class="visually-hidden"> (opens in a new tab)</span>
         </a>`
      : '<span class="discovery__visit"></span>';
    const isNew = added && added.discoveryId === discovery.id;

    stops.push(`
      <li class="stop stop--discovery${isLatest ? ' stop--latest' : ''}${isNew ? ' is-new' : ''}" id="discovery-${escapeHtml(discovery.id)}">
        <span class="stop__marker" aria-hidden="true">${step}</span>
        <div class="stop__content">
          <p class="stop__gap"><span aria-hidden="true">${WATCH_ICON}</span>${gapLabel(previousDate, discovery.date)}</p>
          <article class="discovery" aria-label="Discovery ${step}: ${escapeHtml(discovery.title)}">
            <span class="discovery__corner" aria-hidden="true"><span>${step}</span>${suitSvg(trail.id)}</span>
            <div class="discovery__head">
              <span class="site-badge" aria-hidden="true">${escapeHtml(domain.charAt(0))}</span>
              <span class="discovery__domain">${escapeHtml(domain)}</span>
              ${isLatest ? '<span class="pill">Latest</span>' : ''}
              <time class="discovery__date" datetime="${escapeHtml(String(discovery.date).slice(0, 10))}">${formatDate(discovery.date)}</time>
            </div>
            <h3 class="discovery__title">${escapeHtml(discovery.title)}</h3>
            ${discovery.highlight ? `<p class="discovery__highlight"><span class="visually-hidden">What caught my attention: </span>${escapeHtml(discovery.highlight)}</p>` : ''}
            ${discovery.note
              ? `<p class="discovery__note">${escapeHtml(discovery.note)}</p>`
              : (discovery.highlight ? '' : '<p class="discovery__note discovery__note--empty">No notes yet.</p>')}
            <div class="discovery__actions">
              ${visit}
              <a class="text-button" href="${links.editDiscovery(trail.id, discovery.id)}"
                 aria-label="Edit ${escapeHtml(discovery.title)}">Edit</a>
              <button type="button" class="text-button text-button--danger" data-action="delete-discovery" data-discovery-id="${escapeHtml(discovery.id)}"
                      aria-label="Delete ${escapeHtml(discovery.title)}">Delete</button>
            </div>
          </article>
        </div>
      </li>`);

    if (milestone) {
      stops.push(`
        <li class="stop stop--milestone stop--${milestone.id}${milestone.id === highlight ? ' is-new' : ''}">
          <span class="stop__marker seal" aria-hidden="true">${emblemSvg(milestone.id)}</span>
          <div class="stop__content">
            <div class="milestone-banner">
              <p class="milestone-banner__label">Milestone reached · step ${step}</p>
              <p class="milestone-banner__name">${escapeHtml(milestone.name)}</p>
              <p class="milestone-banner__message">${escapeHtml(milestone.message)}</p>
            </div>
          </div>
        </li>`);
    }
  });

  // The end of the path: the rabbit hole, and Quick find for the next stop
  const { next } = milestones.progress(count);
  stops.push(`
    <li class="stop stop--end">
      <span class="stop__marker" aria-hidden="true"><span class="hole"></span></span>
      <div class="stop__content">
        <section class="quick-find" id="quick-find" aria-labelledby="quick-find-title">
          <h3 class="quick-find__title" id="quick-find-title">${count ? 'Where did you go next?' : 'Add your first discovery'}</h3>
          <p class="quick-find__intro">A quick find needs only a title and a link.${next
            ? ` <span class="quick-find__next">${nextMilestoneHtml(count)}.</span>` : ''}</p>
          <p class="form-alert" id="quick-find-form-alert" role="alert" hidden></p>
          <form class="quick-find__form" id="quick-find-form" novalidate>
            <div class="field">
              <label for="quick-title-input">What did you find?</label>
              <input id="quick-title-input" name="title" type="text" maxlength="120" autocomplete="off"
                     placeholder="The page’s title" aria-describedby="quick-title-input-error">
              <p class="field__error" id="quick-title-input-error" hidden></p>
            </div>
            <div class="field">
              <label for="quick-url-input">Link</label>
              <input id="quick-url-input" name="url" type="url" autocomplete="off" inputmode="url"
                     placeholder="https://" aria-describedby="quick-url-input-error">
              <p class="field__error" id="quick-url-input-error" hidden></p>
            </div>
            <div class="quick-find__actions">
              <button type="submit" class="btn btn--primary">Add to my trail</button>
              <a class="text-button" href="${links.newDiscovery(trail.id)}" data-journal-from-quick>Write a journal entry instead</a>
            </div>
          </form>
        </section>
      </div>
    </li>`);

  // Alternate sides along the path (on phones everything is on one side)
  document.getElementById('timeline').innerHTML = stops
    .map((html, i) => html.replace('<li class="stop ', `<li class="stop stop--${i % 2 ? 'right' : 'left'} `))
    .join('');

  // Draw once the screen is laid out; animate only when this trail is first opened
  const drawIn = lastDrawnTrailId !== trail.id;
  lastDrawnTrailId = trail.id;
  requestAnimationFrame(() => drawJourneyPath(drawIn));
}

/* The winding path: measured from the stop markers, so it always fits
   whatever the stops contain. Each leg swings out to one side and back,
   with a pair of rabbit tracks along it. Redrawn whenever the journey
   changes size. */
function drawJourneyPath(animate = false) {
  const map = document.getElementById('journey-map');
  const svg = document.getElementById('journey-path');
  if (!map.offsetParent) return; // not on screen
  const box = map.getBoundingClientRect();
  const points = [...map.querySelectorAll('.stop__marker')].map((marker) => {
    const r = marker.getBoundingClientRect();
    return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
  });
  const width = Math.round(box.width);
  const height = Math.round(box.height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  if (points.length < 2) {
    svg.innerHTML = '';
    return;
  }

  const sway = width >= 760 ? 64 : 14;
  const at = (a, c1, c2, b, t) => {
    const u = 1 - t;
    return {
      x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
    };
  };
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  const prints = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dy = b.y - a.y;
    const side = i % 2 ? 1 : -1;
    const c1 = { x: a.x + side * sway, y: a.y + dy * 0.4 };
    const c2 = { x: b.x + side * sway, y: b.y - dy * 0.4 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    if (dy > 90) {
      // A pair of tracks a little past the middle of each leg, pointing the way it goes
      const p = at(a, c1, c2, b, 0.55);
      const q = at(a, c1, c2, b, 0.57);
      const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI - 90;
      prints.push(`<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${angle.toFixed(1)})">
        <ellipse cx="-4" cy="-3" rx="2" ry="3.4"/><ellipse cx="4" cy="3" rx="2" ry="3.4"/></g>`);
    }
  }

  // Built once, then only reshaped, so a redraw (on resize) never cuts short the draw-in
  if (!svg.querySelector('.journey__trail')) {
    svg.innerHTML = `
      <defs>
        <mask id="journey-reveal" maskUnits="userSpaceOnUse" x="0" y="0">
          <path class="journey__reveal" pathLength="1"/>
        </mask>
      </defs>
      <g mask="url(#journey-reveal)">
        <path class="journey__trail"/>
        <g class="journey__prints"></g>
      </g>`;
  }
  const mask = svg.querySelector('mask');
  mask.setAttribute('width', width);
  mask.setAttribute('height', height);
  const reveal = svg.querySelector('.journey__reveal');
  reveal.setAttribute('d', d);
  svg.querySelector('.journey__trail').setAttribute('d', d);
  svg.querySelector('.journey__prints').innerHTML = prints.join('');
  if (animate) {
    // Restart the draw-in from the beginning
    reveal.classList.remove('is-drawing');
    reveal.getBoundingClientRect();
    reveal.classList.add('is-drawing');
    reveal.addEventListener('animationend', () => reveal.classList.remove('is-drawing'), { once: true });
  }
}

// Keep the path matched to the stops when the layout changes (resizing, fonts loading, errors appearing)
const journeyResize = new ResizeObserver(() => requestAnimationFrame(() => drawJourneyPath(false)));
journeyResize.observe(document.getElementById('journey-map'));

/* Saving a new discovery, from Quick find or the journal. After it's
   saved (never before): the trail opens at the new stop, and either the
   achievement card (a milestone was reached) or a short toast says so. */
async function saveNewDiscovery(trail, data) {
  const before = trail.discoveries.length;
  const saved = await trailData.createDiscovery(trail.id, data);
  justAdded = { discoveryId: saved.id, previousCount: before };
  // A milestone gets the achievement card, which also says the discovery was added
  const reached = milestones.reachedBetween(before, before + 1);
  if (reached) announceMilestone(reached, trail, before + 1);
  else showToast('Added to your trail');
  await goToTrailAndShow(trail.id, saved.id);
}

// Title and URL checks shared by Quick find and the journal; returns [input, message] pairs
function discoveryErrors(form, data) {
  const errors = [];
  if (!data.title) errors.push([form.elements.title, 'Add the website’s title.']);
  if (!data.url) errors.push([form.elements.url, 'Add the website’s URL.']);
  else if (!isValidUrl(data.url)) errors.push([form.elements.url, 'Enter a full URL that starts with https:// or http://']);
  return errors;
}

// Quick find is drawn with the trail, so its submit is handled here, for whichever form is on screen
document.addEventListener('submit', async (event) => {
  if (event.target.id !== 'quick-find-form') return;
  event.preventDefault();
  const form = event.target;
  clearErrors(form);

  const data = { title: form.elements.title.value.trim(), url: form.elements.url.value.trim(), highlight: '', note: '' };
  const errors = discoveryErrors(form, data);
  if (errors.length) {
    showErrors(errors);
    return;
  }

  setSaving(form, true);
  try {
    await saveNewDiscovery(currentTrail, data);
  } catch (error) {
    showSaveError(form, error);
  } finally {
    setSaving(form, false);
  }
});

/* ---------- 8. Trail form (create / edit) ---------- */

const trailForm = document.getElementById('trail-form');

function openTrailForm(trail) {
  editingTrailId = trail ? trail.id : null;
  resetForm(trailForm);

  // A question from the White Rabbit fills in the question, ready to be changed; never saved by itself
  const suggested = trail ? null : trailDraftQuestion;
  trailDraftQuestion = null;

  trailForm.title.value = trail ? trail.title : '';
  trailForm.question.value = trail ? trail.question : suggested || '';
  trailForm.description.value = trail ? trail.description || '' : '';
  formSnapshot = formValues(trailForm);

  setText('trail-form-eyebrow', trail ? 'Edit trail' : 'New trail');
  setText('trail-form-title', trail ? trail.title : 'Start a new trail');
  setText('trail-form-submit', trail ? 'Save changes' : 'Create trail');

  const back = backTarget(trail ? links.trail(trail.id) : links.dashboard());
  setCancelLinks('trail-form', back, parseRoute(back).name === 'trail' ? 'Back to trail' : 'My trails');

  showScreen('trail-form');
  if (suggested) trailForm.title.focus();
}

trailForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors(trailForm);

  const data = {
    title: trailForm.title.value.trim(),
    question: trailForm.question.value.trim(),
    description: trailForm.description.value.trim(),
  };

  const errors = [];
  // In the order the fields appear, so the first problem gets focus
  if (!data.question) errors.push([trailForm.question, 'Add the question that started this trail.']);
  if (!data.title) errors.push([trailForm.title, 'Give your trail a title.']);
  if (errors.length) {
    showErrors(errors);
    return;
  }

  setSaving(trailForm, true);
  try {
    const saved = editingTrailId
      ? await trailData.updateTrail(editingTrailId, data)
      : await trailData.createTrail(data);
    showToast(editingTrailId ? 'Trail updated' : 'Trail created');
    goTo(links.trail(saved.id));
  } catch (error) {
    showSaveError(trailForm, error);
  } finally {
    setSaving(trailForm, false);
  }
});


/* ---------- 9. The journal (add / edit a discovery) ----------
   One page, two ways to write:
     Quick find      title and link only
     Journal entry   plus "What caught your attention?" (highlight)
                     and "What did you learn?" (note)
   Switching hides the reflection fields but never clears them, so
   nothing typed is lost. Editing always opens as a journal entry. */

const discoveryForm = document.getElementById('discovery-form');
let journalMode = 'journal';   // the last mode chosen, kept while the page is open
let journalDraft = null;       // { trailId, title, url } carried over from Quick find

function setJournalMode(mode) {
  journalMode = mode;
  discoveryForm.dataset.mode = mode;
  document.querySelectorAll('input[name="journal-mode"]').forEach((radio) => { radio.checked = radio.value === mode; });
  document.getElementById('journal-reflect').hidden = mode === 'quick';
}

document.querySelectorAll('input[name="journal-mode"]').forEach((radio) => {
  radio.addEventListener('change', () => setJournalMode(radio.value));
});

// "12 / 200" under the longer fields
function updateCounters() {
  document.querySelectorAll('[data-count-for]').forEach((counter) => {
    const field = document.getElementById(counter.dataset.countFor);
    counter.textContent = `${field.value.length} / ${field.maxLength}`;
  });
}

function openDiscoveryForm(discovery) {
  const trail = currentTrail;
  editingDiscoveryId = discovery ? discovery.id : null;
  resetForm(discoveryForm);

  const draft = !discovery && journalDraft && journalDraft.trailId === trail.id ? journalDraft : null;
  journalDraft = null;
  const step = discovery ? trail.discoveries.indexOf(discovery) + 1 : trail.discoveries.length + 1;

  discoveryForm.title.value = discovery ? discovery.title : draft?.title || '';
  discoveryForm.url.value = discovery ? discovery.url : draft?.url || '';
  discoveryForm.highlight.value = discovery ? discovery.highlight || '' : '';
  discoveryForm.note.value = discovery ? discovery.note || '' : '';
  formSnapshot = formValues(discoveryForm);
  updateCounters();
  setJournalMode(discovery || draft ? 'journal' : journalMode);

  setText('discovery-form-step', discovery ? `Step ${step} · editing` : `Step ${step}`);
  setText('discovery-form-title', discovery ? 'Revisit this discovery' : 'A new page in your journal');
  setText('discovery-form-intro', discovery
    ? 'Change anything you like. It stays in the same place on the trail.'
    : `It will be added as step ${step}, after everything you’ve found so far.`);
  setText('discovery-form-submit', discovery ? 'Save changes' : 'Add to my trail');
  document.querySelector('.mode-switch').hidden = !!discovery;
  setCancelLinks('discovery-form', links.trail(trail.id));
  renderDiscoveryContext(trail, discovery);

  showScreen('discovery-form');
}

/* The left-hand page: which trail this is for, how far along it is, and
   (when adding) what saving this discovery will reach. */
function renderDiscoveryContext(trail, discovery) {
  const count = trail.discoveries.length;
  let outlook = '';
  if (!discovery) {
    const reaches = milestones.reachedBetween(count, count + 1);
    const after = milestones.progress(count + 1);
    outlook = reaches
      ? `<p class="outlook outlook--milestone"><span class="seal seal--small" aria-hidden="true">${emblemSvg(reaches.id)}</span>
           <span>Adding this discovery reaches <strong>${escapeHtml(reaches.name)}</strong>.</span></p>`
      : `<p class="outlook">${after.next
        ? `After this one: ${nextMilestoneHtml(count + 1)}.`
        : 'Every milestone on this trail is already reached.'}</p>`;
  }

  document.getElementById('discovery-form-context').innerHTML = `
    <p class="journal__label">${discovery ? 'On the trail' : 'Adding to'}</p>
    <p class="journal__trail ${accentFor(trail.id)}">
      <span class="pip" aria-hidden="true">${suitSvg(trail.id)}</span>
      <span>${escapeHtml(trail.title)}</span>
    </p>
    <p class="journal__question">${escapeHtml(trail.question)}</p>
    ${stepTrackHtml(trail)}
    <p class="journal__count">${plural(count, 'discovery', 'discoveries')} so far · ${rankHtml(count)}</p>
    ${outlook}`;
}

// The milestones beside the trail form ("How a trail grows")
function renderTrailGuide() {
  document.getElementById('guide-milestones').innerHTML = milestones.all.map((milestone) => `
    <li>
      <span class="seal seal--small" aria-hidden="true">${emblemSvg(milestone.id)}</span>
      <span class="guide-milestones__name">${escapeHtml(milestone.name)}</span>
      <span class="guide-milestones__count">${plural(milestone.count, 'discovery', 'discoveries')}</span>
    </li>`).join('');
}

discoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors(discoveryForm);

  const data = {
    title: discoveryForm.title.value.trim(),
    url: discoveryForm.url.value.trim(),
    highlight: discoveryForm.highlight.value.trim(),
    note: discoveryForm.note.value.trim(),
  };

  const errors = discoveryErrors(discoveryForm, data);
  if (errors.length) {
    showErrors(errors);
    return;
  }

  setSaving(discoveryForm, true);
  try {
    if (editingDiscoveryId) {
      await trailData.updateDiscovery(currentTrail.id, editingDiscoveryId, data);
      showToast('Discovery updated');
      await goToTrailAndShow(currentTrail.id, editingDiscoveryId);
    } else {
      await saveNewDiscovery(currentTrail, data);
    }
  } catch (error) {
    showSaveError(discoveryForm, error);
  } finally {
    setSaving(discoveryForm, false);
  }
});

// After saving a discovery, open the trail and scroll to that discovery
async function goToTrailAndShow(trailId, discoveryId) {
  goTo(links.trail(trailId));
  // Wait for the trail screen to be drawn, then bring the discovery into view
  for (let tries = 0; tries < 20; tries += 1) {
    const item = document.getElementById(`discovery-${discoveryId}`);
    if (item && document.getElementById('screen-trail').classList.contains('is-active')) {
      item.scrollIntoView({ block: 'center' });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}


/* ---------- 10. Form helpers ----------
   Each field's error message lives in <p id="FIELD-ID-error"> under the field.
   Save failures go in <p id="FORM-ID-alert"> above the form. */

function showErrors(errors) {
  errors.forEach(([input, message]) => {
    const error = document.getElementById(input.id + '-error');
    error.textContent = message;
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  });
  errors[0][0].focus(); // move to the first problem
}

function clearErrors(form) {
  form.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
  form.querySelectorAll('.field__error').forEach((error) => { error.hidden = true; });
  document.getElementById(form.id + '-alert').hidden = true;
}

function resetForm(form) {
  clearErrors(form);
  setSaving(form, false);
}

// The text in a form's fields, to compare with what it opened with
function formValues(form) {
  return JSON.stringify([...form.querySelectorAll('input:not([type="radio"]), textarea')].map((field) => field.value.trim()));
}

/* Whether the screen on show holds writing that hasn't been saved:
   a trail or discovery form that changed since it opened, or Quick
   find with anything typed in it. Returns 'new-trail' for an unsaved
   new trail (it doesn't depend on any existing trail), 'other', or ''. */
function unsavedWriting() {
  const screen = document.querySelector('.screen.is-active')?.id;
  if (screen === 'screen-trail-form' && formValues(trailForm) !== formSnapshot) return editingTrailId ? 'other' : 'new-trail';
  if (screen === 'screen-discovery-form' && formValues(discoveryForm) !== formSnapshot) return 'other';
  const quick = document.getElementById('quick-find-form');
  if (screen === 'screen-trail' && quick && formValues(quick) !== JSON.stringify(['', ''])) return 'other';
  return '';
}

// Shown above the form when saving fails. Whatever was typed stays in the fields.
function showSaveError(form, error) {
  console.error(`[Rabbit Tracks] Saving ${form.id} failed:`, error);
  if (error.status === 404) {
    showNotFound();
    return;
  }
  const alert = document.getElementById(form.id + '-alert');
  // role="alert" on this element makes screen readers announce it
  alert.textContent = `Couldn’t save: ${error.message || 'something went wrong.'} Your changes are still here, so you can try again.`;
  alert.hidden = false;
}

// Disables the submit button while saving, so the form can't be sent twice
const submitLabels = new WeakMap();
function setSaving(form, isSaving) {
  const button = form.querySelector('[type="submit"]');
  if (isSaving && !submitLabels.has(button)) {
    submitLabels.set(button, button.textContent);
    button.textContent = 'Saving…';
  } else if (!isSaving && submitLabels.has(button)) {
    button.textContent = submitLabels.get(button);
    submitLabels.delete(button);
  }
  button.disabled = isSaving;
}

/* Clear a field's error as soon as the user starts fixing it, and keep
   the journal's character counts current. Delegated, so it also covers
   Quick find, which is drawn fresh with every trail. */
document.addEventListener('input', (event) => {
  const field = event.target;
  if (!field.matches('.field input, .field textarea')) return;
  field.removeAttribute('aria-invalid');
  const error = document.getElementById(field.id + '-error');
  if (error) error.hidden = true;
  if (document.querySelector(`[data-count-for="${field.id}"]`)) updateCounters();
});


/* ---------- 11. Confirm dialog ----------
   confirmAction() opens the dialog and resolves to true (confirm)
   or false (Cancel or Esc). */

const confirmDialog = document.getElementById('confirm-dialog');
let answerConfirm = null;

function confirmAction(title, message, confirmLabel) {
  setText('confirm-title', title);
  setText('confirm-message', message);
  setText('confirm-yes', confirmLabel);
  confirmDialog.showModal();
  return new Promise((resolve) => { answerConfirm = resolve; });
}

function closeConfirm(answer) {
  closeDialog(confirmDialog);
  if (answerConfirm) answerConfirm(answer);
  answerConfirm = null;
}

/* Closes a dialog after a short fade (see .dialog.is-closing). The
   close itself is on a timer, so the dialog always closes, even if
   the animation never runs. */
function closeDialog(dialog) {
  if (!dialog.open || dialog.classList.contains('is-closing')) return;
  dialog.classList.add('is-closing');
  setTimeout(() => {
    dialog.classList.remove('is-closing');
    dialog.close();
  }, reducedMotion() ? 0 : 140);
}

confirmDialog.addEventListener('click', (event) => {
  const button = event.target.closest('[data-confirm]');
  if (button) closeConfirm(button.dataset.confirm === 'yes');
});

// Esc key
confirmDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeConfirm(false);
});

// Runs a delete with the button disabled; shows a message if it fails
async function runDelete(button, work) {
  button.disabled = true;
  try {
    await work();
  } catch (error) {
    console.error('[Rabbit Tracks] Delete failed:', error);
    showToast(`Couldn’t delete: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}


/* ---------- 12. The White Rabbit, the welcome, and the tour ---------- */

/* The White Rabbit in the welcome scene is a button: ask him and he
   offers a question worth following, from the list below. "Follow this
   question" opens the New trail form with it filled in; nothing is
   saved until the form is. Ask him enough times and he remembers he's
   late (once per visit). */
const RABBIT_QUESTIONS = [
  'Why do cats purr?',
  'How do noise-cancelling headphones work?',
  'If there are so many stars, why is the night sky dark?',
  'How did people tell the time before clocks?',
  'What makes a song get stuck in your head?',
  'How do birds know where to migrate?',
  'Why do we dream?',
  'How does a 3D printer build an object?',
  'Why does bread go stale?',
  'How do octopuses change colour?',
  'What happens to a plastic bottle after it’s recycled?',
  'Why do some words sound like what they mean?',
  'How was the first computer program written?',
  'Why do onions make you cry?',
  'How do bees decide where to build a hive?',
  'What would happen to the tides if the Moon disappeared?',
  'Why does a deck of cards have 52 cards?',
  'How does one plant become green, black, and white tea?',
  'How are crossword puzzles made?',
  'Why do mirrors flip left and right, but not up and down?',
];
const rabbitButton = document.getElementById('rabbit-button');
const rabbitSays = document.getElementById('rabbit-says');
let rabbitAsks = 0;
let rabbitLast = -1;

function askRabbit() {
  rabbitAsks += 1;
  let pick;
  do { pick = Math.floor(Math.random() * RABBIT_QUESTIONS.length); } while (pick === rabbitLast);
  rabbitLast = pick;
  const late = rabbitAsks === 5;
  setText('rabbit-says-label', late ? 'Oh my ears and whiskers, how late it’s getting! Quickly, then:' : 'The White Rabbit wonders…');
  setText('rabbit-question', RABBIT_QUESTIONS[pick]);
  rabbitSays.hidden = false;
  rabbitButton.setAttribute('aria-expanded', 'true');

  // A hop (and, when he's late, a spin of the watch); nothing moves with reduced motion
  const art = rabbitButton.closest('.welcome__art');
  art.classList.remove('is-hopping', 'is-late');
  art.getBoundingClientRect();
  art.classList.add('is-hopping');
  if (late) art.classList.add('is-late');
}

function closeRabbit({ returnFocus = false } = {}) {
  if (rabbitSays.hidden) return false;
  rabbitSays.hidden = true;
  rabbitButton.setAttribute('aria-expanded', 'false');
  if (returnFocus) rabbitButton.focus();
  return true;
}


/* The welcome: shown once, the first time the dashboard opens in this
   browser (and again from Settings). Whether it was seen is remembered
   in this browser only (see prefs), so it doesn't come back on reload,
   even though sample data does. */
const welcomeDialog = document.getElementById('welcome-dialog');
let welcomeOffered = false;

function maybeWelcome() {
  if (welcomeOffered || prefs.get('onboarding') || tour || document.querySelector('dialog[open]')) return;
  welcomeOffered = true;
  openWelcome();
}

function openWelcome() {
  if (settings.open) settings.close();
  document.getElementById('welcome-note').hidden = !dashboardTrails.some(isExample);
  welcomeDialog.showModal();
  document.getElementById('welcome-title').focus();
}

function closeWelcome({ thenTour = false } = {}) {
  if (!prefs.get('onboarding')) prefs.set('onboarding', 'skipped');
  closeDialog(welcomeDialog);
  if (thenTour) startTour();
}

// Esc is the same as Skip
welcomeDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeWelcome();
});


/* The guided tour: one card that visits the real parts of the app, in
   order. Each step names a data-tour="…" element; steps that need a
   trail open the most recent one. While the tour is open the rest of
   the page is inert (so Tab stays in the card and nothing behind it can
   be clicked by accident); Esc, Skip, or the close button ends it, and
   the app is exactly as it was. */
const TOUR_STEPS = [
  { target: 'my-trails', screen: 'dashboard', title: 'My trails',
    text: 'This is home: where your research stands, and the trail you were following last. Stuck for a question? Ask the White Rabbit in the picture.' },
  { target: 'empty-state', screen: 'dashboard', whenEmpty: true, title: 'Your first trail',
    text: 'There are no trails yet. Start one with a question you’re curious about; your discoveries, the curiosity cabinet, and milestones fill in as you go.' },
  { target: 'trail-card', screen: 'dashboard', needsTrail: true, title: 'Your trails',
    text: 'Each card is one trail: a question you’re investigating. Its row of tracks fills in as you add discoveries. Continue the trail opens it.' },
  { target: 'cabinet', screen: 'dashboard', needsTrail: true, title: 'The curiosity cabinet',
    text: 'Everything you’ve found, from every trail, newest first. Open one on its trail, look closer at what you wrote, or visit the source again.' },
  { target: 'achievements', screen: 'dashboard', needsTrail: true, title: 'Achievements',
    text: 'A trail reaches milestones at 1, 3, 5, and 10 discoveries. They show how far a question has taken you. Select one to see where it was reached.' },
  { target: 'quick-find', screen: 'trail', needsTrail: true, title: 'Quick find',
    text: 'On a trail, Quick find saves a discovery with just a title and a link, without leaving the page. Use it when you’re in the middle of exploring.' },
  { target: 'journal-entry', screen: 'trail', needsTrail: true, title: 'Journal entry',
    text: 'When something’s worth remembering, write a journal entry: what caught your attention, and what you learned. It goes on the trail the same way.' },
  { target: 'settings', title: 'Settings',
    text: 'Where your trails are kept, the example trails, reduce motion, and this tour, whenever you want to take it again.' },
];
const tourCard = document.getElementById('tour');
const tourSpotlight = document.getElementById('tour-spotlight');
let tour = null;           // { steps, index, trailId, returnFocus } while the tour is open
let tourNavigating = false; // the tour itself is changing screens, so it shouldn't end

async function startTour() {
  [settings, welcomeDialog, curioDialog].forEach((dialog) => { if (dialog.open) dialog.close(); });
  closeRabbit();
  closeMilestoneDetail();
  let trails = dashboardTrails;
  try { trails = await trailData.listTrails(); } catch { /* use what's on the dashboard */ }
  const latest = [...trails].sort((a, b) => String(b.updated).localeCompare(String(a.updated)))[0];
  const steps = TOUR_STEPS.filter((step) => (step.needsTrail ? !!latest : true) && (step.whenEmpty ? !latest : true));

  tour = { steps, index: 0, trailId: latest?.id, returnFocus: document.activeElement };
  document.querySelectorAll('body > header, body > main, body > footer').forEach((part) => { part.inert = true; });
  tourCard.hidden = false;
  tourSpotlight.hidden = false;
  document.getElementById('tour-dots').innerHTML = steps.map(() => '<li></li>').join('');
  await showTourStep(1);
}

// Shows the current step; if its part of the page isn't there, moves on in `direction`
async function showTourStep(direction) {
  const step = tour.steps[tour.index];
  if (!(await tourScreen(step.screen))) return endTour();
  const target = document.querySelector(`[data-tour="${step.target}"]`);
  if (!tour) return;
  if (!target || !target.getClientRects().length) {
    tour.steps.splice(tour.index, 1);
    document.getElementById('tour-dots').lastElementChild?.remove();
    if (direction < 0) tour.index = Math.max(0, tour.index - 1);
    if (tour.index >= tour.steps.length) return endTour({ completed: true });
    return showTourStep(direction);
  }

  const last = tour.index === tour.steps.length - 1;
  setText('tour-progress', `Stop ${tour.index + 1} of ${tour.steps.length}`);
  document.querySelectorAll('#tour-dots li').forEach((dot, i) => {
    dot.classList.toggle('is-done', i < tour.index);
    dot.classList.toggle('is-current', i === tour.index);
  });
  setText('tour-title', step.title);
  setText('tour-text', step.text);
  document.getElementById('tour-back').hidden = tour.index === 0;
  document.getElementById('tour-skip').hidden = last;
  setText('tour-next', last ? 'Finish' : 'Next');
  tour.target = target;

  scrollToTourTarget(target);
  positionTour();
  document.getElementById('tour-title').focus({ preventScroll: true });
  /* A screen that just opened is still sliding into place (see
     .screen.is-active) and its journey is still being drawn, so keep
     the spotlight on the target until that settles */
  const until = performance.now() + 700;
  const follow = () => {
    if (!tour || tour.target !== target) return;
    positionTour();
    if (performance.now() < until) requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
}

// Opens the screen a step is on (null: any screen). Resolves to false if it never appears.
async function tourScreen(screen) {
  if (!screen) return true;
  const hash = screen === 'trail' ? links.trail(tour.trailId) : links.dashboard();
  const isReady = () => document.getElementById(`screen-${screen}`).classList.contains('is-active')
    && (screen !== 'trail' || currentTrail?.id === tour?.trailId);
  if (isReady() && parseRoute(location.hash).name === screen) return true;
  tourNavigating = true;
  goTo(hash);
  for (let tries = 0; tries < 120 && tour; tries += 1) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    if (isReady()) break;
  }
  tourNavigating = false;
  return !!tour && isReady();
}

/* Brings a step's part of the page into view below the sticky header,
   with room for the card (under it on wide screens, as a sheet along
   the bottom on phones). Parts in the header are always in view. */
function scrollToTourTarget(target) {
  const header = document.querySelector('.site-header');
  if (header.contains(target)) return;
  const rect = target.getBoundingClientRect();
  const headerHeight = header.offsetHeight;
  const roomBelow = window.innerHeight - headerHeight - tourCard.offsetHeight - 56;
  const top = rect.top + window.scrollY - headerHeight - (rect.height <= roomBelow ? 24 : 12);
  window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
}

// Places the spotlight on the target and the card beside it, always inside the viewport
function positionTour() {
  if (!tour?.target) return;
  const margin = 16;
  const viewWidth = document.documentElement.clientWidth;
  const viewHeight = window.innerHeight;
  const sheet = viewWidth < 640;
  tourCard.classList.toggle('tour--sheet', sheet);
  tourCard.style.top = '';
  tourCard.style.left = '';
  const cardWidth = tourCard.offsetWidth;
  const cardHeight = tourCard.offsetHeight;
  const rect = tour.target.getBoundingClientRect();
  const pad = 8;

  let top;
  let left = Math.min(Math.max(rect.left, margin), viewWidth - cardWidth - margin);
  let visibleBottom = viewHeight;
  if (sheet) {
    visibleBottom = viewHeight - cardHeight - margin * 2;
  } else if (rect.bottom + margin + cardHeight <= viewHeight - margin) {
    top = rect.bottom + margin;
  } else if (rect.top - margin - cardHeight >= margin) {
    top = rect.top - margin - cardHeight;
  } else if (rect.right + margin + cardWidth <= viewWidth - margin) {
    left = rect.right + margin;
    top = Math.min(Math.max(rect.top, margin), viewHeight - cardHeight - margin);
  } else if (rect.left - margin - cardWidth >= margin) {
    left = rect.left - margin - cardWidth;
    top = Math.min(Math.max(rect.top, margin), viewHeight - cardHeight - margin);
  } else {
    // Bigger than the screen: the card sits over its lower part
    top = viewHeight - cardHeight - margin;
    visibleBottom = top - margin;
  }
  if (!sheet) {
    tourCard.style.top = `${Math.round(top)}px`;
    tourCard.style.left = `${Math.round(left)}px`;
  }

  // The spotlight covers only the part of the target that's on screen
  const spotTop = Math.max(rect.top - pad, 4);
  const spotBottom = Math.min(rect.bottom + pad, visibleBottom);
  Object.assign(tourSpotlight.style, {
    top: `${Math.round(spotTop)}px`,
    left: `${Math.round(Math.max(rect.left - pad, 4))}px`,
    width: `${Math.round(Math.min(rect.width + pad * 2, viewWidth - 8))}px`,
    height: `${Math.round(Math.max(spotBottom - spotTop, 0))}px`,
  });
}

let tourFrame = 0;
const repositionTour = () => {
  if (!tour) return;
  cancelAnimationFrame(tourFrame);
  tourFrame = requestAnimationFrame(positionTour);
};
window.addEventListener('resize', repositionTour);
window.addEventListener('scroll', repositionTour, { passive: true });

function moveTour(delta) {
  if (!tour) return;
  const index = tour.index + delta;
  if (index >= tour.steps.length) {
    endTour({ completed: true });
    showToast('Tour finished. Happy exploring!');
    return;
  }
  tour.index = Math.max(0, index);
  showTourStep(delta);
}

function endTour({ completed = false } = {}) {
  if (!tour) return;
  const { returnFocus } = tour;
  tour = null;
  tourNavigating = false;
  if (completed) prefs.set('onboarding', 'completed');
  else if (!prefs.get('onboarding')) prefs.set('onboarding', 'skipped');
  document.querySelectorAll('body > header, body > main, body > footer').forEach((part) => { part.inert = false; });
  tourCard.hidden = true;
  tourSpotlight.hidden = true;
  // Back to where you were, if that's still on the page; otherwise the screen's heading
  const visible = returnFocus && returnFocus !== document.body && returnFocus.isConnected
    && returnFocus.getClientRects().length && !returnFocus.closest('dialog:not([open])');
  (visible ? returnFocus : document.querySelector('.screen.is-active h1'))?.focus({ preventScroll: true });
}

tourCard.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    endTour();
  } else if (event.key === 'ArrowRight' && !event.target.matches('input, textarea')) {
    moveTour(1);
  } else if (event.key === 'ArrowLeft' && tour?.index > 0) {
    moveTour(-1);
  }
});


/* ---------- 13. Buttons, Settings, and start-up ----------
   Links handle navigation. Any button with data-action="NAME" runs
   the matching function below. */

const settings = document.getElementById('settings');

const actions = {
  retry: () => route(),

  // From a dashboard row (has data-trail-id) or the trail screen (uses the open trail)
  'delete-trail': async (button) => {
    const trail = button.dataset.trailId
      ? dashboardTrails.find((t) => t.id === button.dataset.trailId)
      : currentTrail;
    const ok = await confirmAction(
      `Delete “${trail.title}”?`,
      `This removes the trail and its ${plural(trail.discoveries.length, 'discovery', 'discoveries')}.`,
      'Delete trail');
    if (!ok) return;

    await runDelete(button, async () => {
      await trailData.deleteTrail(trail.id);
      showToast('Trail deleted');
      goTo(links.dashboard());
    });
  },

  'delete-discovery': async (button) => {
    const discovery = currentTrail.discoveries.find((d) => d.id === button.dataset.discoveryId);
    const ok = await confirmAction(`Delete “${discovery.title}”?`, 'It will be removed from this trail.', 'Delete');
    if (!ok) return;

    await runDelete(button, async () => {
      await trailData.deleteDiscovery(currentTrail.id, discovery.id);
      showToast('Discovery deleted');
      // Redraw in place, so the page doesn't jump back to the top
      currentTrail = await trailData.getTrail(currentTrail.id);
      renderTrail();
    });
  },

  'open-settings': () => openSettings(),

  'check-connection': () => checkConnection(),

  'close-settings': () => closeDialog(settings),

  'close-achievement': () => hideAchievement(),

  'close-milestone-detail': () => closeMilestoneDetail({ returnFocus: true }),

  // "Quick find" in the trail header: go to the end of the path and start typing
  'focus-quick-find': () => {
    document.getElementById('quick-find').scrollIntoView({ block: 'center' });
    document.getElementById('quick-title-input').focus({ preventScroll: true });
  },

  'reset-data': (button) => runDataAction(button, {
    title: 'Restore the example trails?',
    describe: ({ trails, discoveries }) => `This replaces everything in this tab with the four original examples. `
      + `The ${plural(trails, 'trail')} and ${plural(discoveries, 'discovery', 'discoveries')} here now will be removed, including any you created.`,
    confirmLabel: 'Replace with examples',
    work: () => trailData.reset(),
    done: 'Example trails restored',
    failed: 'Couldn’t restore the examples',
  }),

  'clear-trails': (button) => runDataAction(button, {
    title: 'Clear all trails?',
    describe: ({ trails, discoveries }) => `This deletes all ${plural(trails, 'trail')} and ${plural(discoveries, 'discovery', 'discoveries')} in this tab, `
      + 'leaving an empty journal. It can’t be undone. (Restore examples brings back the four examples, not trails you created.)',
    confirmLabel: 'Clear all trails',
    work: () => trailData.clear(),
    done: 'All trails cleared',
    failed: 'Couldn’t clear your trails',
  }),

  'start-tour': () => startTour(),
  'show-welcome': () => openWelcome(),
  'skip-welcome': () => closeWelcome(),
  'begin-exploring': () => closeWelcome({ thenTour: true }),
  'tour-next': () => moveTour(1),
  'tour-back': () => moveTour(-1),
  'end-tour': () => endTour(),

  'dismiss-sample-notice': () => {
    prefs.set('sampleNotice', 'dismissed');
    document.getElementById('sample-notice').hidden = true;
    document.getElementById('dashboard-title').focus();
  },

  'cabinet-more': () => {
    const total = dashboardTrails.reduce((sum, trail) => sum + trail.discoveries.length, 0);
    const growing = cabinetShown < total;
    const firstNew = cabinetShown;
    cabinetShown = growing ? cabinetShown + CABINET_PAGE : CABINET_PAGE;
    renderCabinet([...dashboardTrails].sort((a, b) => String(b.updated).localeCompare(String(a.updated))));
    // Keyboard users carry on from the first card that just appeared
    if (growing) document.querySelectorAll('#recent-list .curio__title a')[firstNew]?.focus();
  },

  'open-curio': (button) => openCurio(button.dataset.trailId, button.dataset.discoveryId),
  'close-curio': () => closeDialog(curioDialog),

  'rabbit-ask': () => askRabbit(),
  'rabbit-close': () => closeRabbit({ returnFocus: true }),
  'rabbit-start-trail': () => {
    trailDraftQuestion = document.getElementById('rabbit-question').textContent;
    closeRabbit();
    goTo('#/trails/new');
  },
};

/* Clearing or restoring with sample data. Says exactly what will be
   removed (counted now, not guessed) and asks first. Unsaved writing:
   a new trail being written is kept (it doesn't depend on any trail),
   and the page stays on it; anything else unsaved is named in the
   question, so it's never lost without warning. If the change fails,
   nothing was changed, and Settings says so and stays open. */
async function runDataAction(button, { title, describe, confirmLabel, work, done, failed }) {
  const status = document.getElementById('settings-status');
  status.hidden = true;
  let counts;
  try {
    const trails = await trailData.listTrails();
    counts = { trails: trails.length, discoveries: trails.reduce((sum, t) => sum + t.discoveries.length, 0) };
  } catch (error) {
    status.textContent = `${failed}: ${error.message} Nothing was changed.`;
    status.hidden = false;
    return;
  }
  const unsaved = unsavedWriting();
  const warning = unsaved === 'other' ? ' You also have unsaved writing on the page behind Settings; it will be lost.' : '';
  const ok = await confirmAction(title, describe(counts) + warning, confirmLabel);
  if (!ok) return;

  button.disabled = true;
  try {
    await work();
  } catch (error) {
    console.error(`[Rabbit Tracks] ${failed}:`, error);
    status.textContent = `${failed}: ${error.message || 'something went wrong.'} Nothing was changed.`;
    status.hidden = false;
    return;
  } finally {
    button.disabled = false;
  }
  closeDialog(settings);
  showToast(unsaved === 'new-trail' ? `${done}. Your new trail is still here, unsaved.` : done);
  cabinetShown = CABINET_PAGE;
  if (unsaved !== 'new-trail') goTo(links.dashboard());
}

function openSettings() {
  document.getElementById('settings-status').hidden = true;
  const motion = document.getElementById('motion-toggle');
  motion.checked = reducedMotion();
  // The device's own setting can't be overridden here, only added to
  motion.disabled = systemReducedMotion.matches;
  setText('motion-hint', systemReducedMotion.matches
    ? 'On, because your device is set to reduce motion. Change it in your device’s settings.'
    : 'Turns off the path drawing itself in, cards lifting, and the celebration animations. Everything is still shown, just without movement.');
  settings.showModal();
  if (trailData.source === 'api') checkConnection();
  else {
    trailData.listTrails().then((trails) => {
      const discoveries = trails.reduce((sum, t) => sum + t.discoveries.length, 0);
      setText('clear-summary', trails.length
        ? `Deletes the ${plural(trails.length, 'trail')} and ${plural(discoveries, 'discovery', 'discoveries')} in this tab, for an empty journal. Asks first.`
        : 'There are no trails in this tab right now.');
      settings.querySelector('[data-action="clear-trails"]').disabled = !trails.length;
    });
  }
}

document.getElementById('motion-toggle').addEventListener('change', (event) => {
  prefs.set('motion', event.target.checked ? 'reduce' : null);
  applyMotionPreference();
});

function applyMotionPreference() {
  if (prefs.get('motion') === 'reduce') document.documentElement.dataset.motion = 'reduce';
  else delete document.documentElement.dataset.motion;
}

/* Settings says where trails are kept, plainly enough to trust. The
   sample-data tools (Restore, Clear all) only make sense with sample
   data; with the API, Settings says how to remove things instead. */
function showDataSource() {
  const usingApi = trailData.source === 'api';
  setText('data-source-label', usingApi ? 'Saved on the server' : 'Kept in this tab only');
  setText('data-source', usingApi
    ? 'Saved to MongoDB through the Rabbit Tracks API, so trails and discoveries are still here after a reload. There are no accounts: everyone using this server sees the same trails.'
    : 'Sample data, kept in this browser tab. You can add, edit, and delete freely, but nothing is sent anywhere: when the page reloads, the four example trails come back and your changes are gone.');
  document.querySelectorAll('[data-source-only]').forEach((element) => {
    element.hidden = element.dataset.sourceOnly !== trailData.source;
  });
}

// Asks the API whether it and the database are reachable, and shows the answer in Settings
async function checkConnection() {
  const status = document.getElementById('connection-status');
  status.className = 'connection-status';
  status.textContent = 'Checking the connection…';
  try {
    await trailData.health();
    status.classList.add('connection-status--ok');
    status.textContent = 'Connected. The API and database are responding.';
  } catch (error) {
    status.classList.add('connection-status--error');
    status.textContent = `Not connected: ${error.message}`;
  }
}

// Clicking the dark area outside the Settings panel closes it
settings.addEventListener('click', (event) => {
  if (event.target === settings) closeDialog(settings);
});

// Esc closes Settings with the same fade as the Close button
settings.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeDialog(settings);
});

/* Esc also ends the tour, and closes an open milestone's details or the
   White Rabbit's question (dialogs handle their own Esc) */
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (tour) {
    event.preventDefault();
    endTour();
    return;
  }
  if (document.querySelector('dialog[open]')) return;
  if (closeMilestoneDetail({ returnFocus: true })) event.preventDefault();
  else if (closeRabbit({ returnFocus: rabbitSays.contains(document.activeElement) || document.activeElement === rabbitButton })) event.preventDefault();
});

document.addEventListener('click', (event) => {
  // The skip link would change the address to "#main", which isn't a screen
  if (event.target.closest('[data-skip-link]')) {
    event.preventDefault();
    document.getElementById('main').focus();
    return;
  }

  // Milestones open and close their details; a click anywhere else closes them
  const milestoneButton = event.target.closest('[data-milestone]');
  if (milestoneButton) {
    toggleMilestoneDetail(milestoneButton);
    return;
  }
  if (!event.target.closest('.milestone-detail')) closeMilestoneDetail();

  // "Write a journal entry instead": take whatever was typed in Quick find along to the journal
  const toJournal = event.target.closest('[data-journal-from-quick]');
  if (toJournal) {
    const form = document.getElementById('quick-find-form');
    journalDraft = { trailId: currentTrail.id, title: form.elements.title.value.trim(), url: form.elements.url.value.trim() };
    return; // the link itself opens the journal
  }

  // Recent discoveries: open the trail and scroll to that discovery
  const recentLink = event.target.closest('[data-show-discovery]');
  if (recentLink) {
    event.preventDefault();
    goToTrailAndShow(recentLink.dataset.trailId, recentLink.dataset.showDiscovery);
    return;
  }

  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = actions[button.dataset.action];
  if (action) action(button);
  else console.error(`[Rabbit Tracks] No handler for data-action="${button.dataset.action}"`);
});

window.addEventListener('hashchange', (event) => {
  previousHash = new URL(event.oldURL).hash || '#/';
  // Leaving the screen the tour is showing (with Back, say) ends the tour
  if (tour && !tourNavigating) endTour();
  closeRabbit();
  route();
});

// Start on whatever screen the address points to (the dashboard by default)
applyMotionPreference();
showDataSource();
renderTrailGuide();
route();
