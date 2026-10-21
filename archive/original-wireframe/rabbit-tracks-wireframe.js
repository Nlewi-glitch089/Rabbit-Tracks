/* =========================================================
   Rabbit Hole Trails — clickable wireframe
   1. Sample data
   2. Helpers
   3. Switching screens
   4. Dashboard
   5. Trail details (the timeline)
   6. Trail form (create / edit)
   7. Discovery form (add / edit)
   8. Click handling

   This is a prototype. Data lives in the `trails` variable only,
   so every change disappears when the page is refreshed.
   ========================================================= */


/* ---------- 1. Sample data ----------
   Roughly the shape the real MongoDB documents could have:
   a trail with a list of discoveries in the order they were found. */

const SAMPLE_TRAILS = [
  {
    id: 'game-dev',
    title: 'Exploring Game Development',
    question: 'How are video games made?',
    description: 'I play a lot of games and want to understand what actually goes into building one, and whether I could make a small one myself.',
    created: '2026-10-03',
    updated: '2026-10-12',
    discoveries: [
      {
        id: 'd1', date: '2026-10-03',
        title: 'Game engine — Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Game_engine',
        note: 'Games are built on top of “engines” that handle graphics, physics, and sound so developers don’t start from zero. Unity and Unreal kept coming up as the big ones.',
      },
      {
        id: 'd2', date: '2026-10-04',
        title: 'Unity Real-Time Development Platform',
        url: 'https://unity.com',
        note: 'Unity is free for beginners and is used for a huge number of indie and mobile games. Its scripting language is C#, so that’s what I looked up next.',
      },
      {
        id: 'd3', date: '2026-10-06',
        title: 'A tour of the C# language',
        url: 'https://learn.microsoft.com/en-us/dotnet/csharp/tour-of-csharp/',
        note: 'C# feels close to JavaScript in a lot of ways: classes, functions, and loops look familiar. The type system is stricter, though.',
      },
      {
        id: 'd4', date: '2026-10-09',
        title: 'Roll-a-Ball: Create your first game',
        url: 'https://learn.unity.com/project/roll-a-ball',
        note: 'A step-by-step beginner tutorial where you build a tiny game in an afternoon. Bookmarking this to actually do this weekend.',
      },
      {
        id: 'd5', date: '2026-10-12',
        title: 'Godot Engine — Free and open source',
        url: 'https://godotengine.org',
        note: 'Found while comparing engines. Godot is fully open source and lightweight, which might be easier for 2D projects. Worth trying after Roll-a-Ball.',
      },
    ],
  },
  {
    id: 'accessibility',
    title: 'Making the Web Accessible',
    question: 'How do people who are blind use websites?',
    description: 'Started after a classmate asked whether our project would work with a screen reader.',
    created: '2026-09-22',
    updated: '2026-10-08',
    discoveries: [
      {
        id: 'd1', date: '2026-09-22',
        title: 'Screen reader user survey results',
        url: 'https://webaim.org/projects/screenreadersurvey10/',
        note: 'Most screen reader users navigate a page by jumping between headings, which is why a clear heading structure matters so much.',
      },
      {
        id: 'd2', date: '2026-09-29',
        title: 'ARIA — MDN Web Docs',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA',
        note: 'ARIA attributes describe what an element is for. The first rule: use a real <button> or <label> before reaching for ARIA.',
      },
      {
        id: 'd3', date: '2026-10-08',
        title: 'WCAG 2 Overview',
        url: 'https://www.w3.org/WAI/standards-guidelines/wcag/',
        note: 'The official guidelines. Color contrast ratios (4.5:1 for normal text) are something I can check in every design.',
      },
    ],
  },
  {
    id: 'generative-art',
    title: 'Art Made with Code',
    question: 'Can code be used to make art?',
    description: '',
    created: '2026-09-10',
    updated: '2026-09-27',
    discoveries: [
      {
        id: 'd1', date: '2026-09-10',
        title: 'Vera Molnár — Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Vera_Moln%C3%A1r',
        note: 'One of the first artists to make art with a computer, starting in 1968, before screens could even show images.',
      },
      {
        id: 'd2', date: '2026-09-14',
        title: 'p5.js',
        url: 'https://p5js.org',
        note: 'A JavaScript library for drawing in the browser. Made for artists and beginners, so the examples are short.',
      },
      {
        id: 'd3', date: '2026-09-18',
        title: 'The Coding Train',
        url: 'https://thecodingtrain.com',
        note: 'Video tutorials that use p5.js. The “coding challenges” are fun and very approachable.',
      },
      {
        id: 'd4', date: '2026-09-27',
        title: 'The Nature of Code',
        url: 'https://natureofcode.com',
        note: 'A free book about simulating nature (flocking birds, falling leaves) with code.',
      },
    ],
  },
  {
    id: 'learning',
    title: 'Learning How to Learn',
    question: 'Why do I forget what I study so quickly?',
    description: 'Hoping to find better study habits for bootcamp.',
    created: '2026-08-30',
    updated: '2026-09-02',
    discoveries: [
      {
        id: 'd1', date: '2026-08-30',
        title: 'Forgetting curve — Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Forgetting_curve',
        note: 'Memory fades fast in the first few days unless you review. That explains a lot.',
      },
      {
        id: 'd2', date: '2026-09-02',
        title: 'Spaced repetition — Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Spaced_repetition',
        note: 'Reviewing at growing intervals (1 day, 3 days, a week) beats cramming.',
      },
    ],
  },
];

// The working copy that the screens read and change
let trails = copyOf(SAMPLE_TRAILS);

// What the user is looking at right now
let currentTrailId = null;      // trail open on the details screen
let editingTrailId = null;      // null = creating a new trail
let editingDiscoveryId = null;  // null = adding a new discovery
let trailFormReturnTo = 'dashboard';


/* ---------- 2. Helpers ---------- */

function copyOf(data) {
  return JSON.parse(JSON.stringify(data));
}

function findTrail(id) {
  return trails.find((trail) => trail.id === id);
}

function currentTrail() {
  return findTrail(currentTrailId);
}

// Today's date as "YYYY-MM-DD"
function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// "2026-10-03" → "Oct 3, 2026"
function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

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
    .replace(/"/g, '&quot;');
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

// Small inline icons (from simple strokes, no icon library needed)
const ICONS = {
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>',
  external: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
};

// Playing-card suits, used only as decoration (♥ and ♦ are printed in red)
const SUITS = ['♠', '♥', '♦', '♣'];

function suitHtml(index) {
  const suit = SUITS[index % SUITS.length];
  const isRed = suit === '♥' || suit === '♦';
  return `<span class="suit${isRed ? ' suit--red' : ''}" aria-hidden="true">${suit}</span>`;
}

// Small tilts so the trail cards look like a hand of cards
const TILTS = [-1, 0.8, -0.5, 1.1];

let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}


/* ---------- 3. Switching screens ----------
   Every screen is a <section id="screen-NAME">. Only one has "is-active".
   The screen's <h1> receives focus so keyboard and screen reader users
   know the page changed. */

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('is-active'));

  const screen = document.getElementById('screen-' + name);
  screen.classList.add('is-active');

  window.scrollTo(0, 0);
  screen.querySelector('h1').focus({ preventScroll: true });
}


/* ---------- 4. Dashboard ---------- */

function renderDashboard() {
  // Most recently updated trails first
  const sorted = [...trails].sort((a, b) => b.updated.localeCompare(a.updated));

  setText('trail-count', plural(trails.length, 'trail'));
  document.getElementById('empty-state').hidden = trails.length > 0;

  document.getElementById('trail-grid').innerHTML = sorted.map((trail, i) => {
    const count = trail.discoveries.length;
    const latest = trail.discoveries[count - 1];

    // Each trail keeps the same suit, based on its place in the list
    const suit = suitHtml(trails.indexOf(trail));

    // One dot for the question + one per discovery (up to 6)
    const dots = Array.from({ length: Math.min(count, 6) + 1 }, () => '<li><span class="mini-path__dot"></span></li>').join('');
    const more = count > 6 ? `<span class="mini-path__more">+${count - 6}</span>` : '';

    return `
      <article class="trail-card" style="--tilt: ${TILTS[i % TILTS.length]}deg">
        <!-- Playing-card corners: number of discoveries + suit -->
        <span class="card-corner card-corner--top" aria-hidden="true">${count}${suit}</span>
        <span class="card-corner card-corner--bottom" aria-hidden="true">${count}${suit}</span>

        <div class="trail-card__top">
          <span class="trail-card__count">${plural(count, 'discovery', 'discoveries')}</span>
          <div class="trail-card__controls">
            <button type="button" class="icon-button" data-action="edit-trail" data-trail-id="${trail.id}"
                    aria-label="Edit ${escapeHtml(trail.title)}" title="Edit trail">${ICONS.edit}</button>
            <button type="button" class="icon-button icon-button--danger" data-action="delete-trail" data-trail-id="${trail.id}"
                    aria-label="Delete ${escapeHtml(trail.title)}" title="Delete trail">${ICONS.trash}</button>
          </div>
        </div>

        <h3 class="trail-card__title">
          <button type="button" class="trail-card__open" data-action="open-trail" data-trail-id="${trail.id}">
            ${escapeHtml(trail.title)}
          </button>
        </h3>
        <p class="trail-card__question">“${escapeHtml(trail.question)}”</p>

        <div class="trail-card__path">
          <ol class="mini-path" aria-hidden="true">${dots}</ol>${more}
        </div>

        ${latest ? `<p class="trail-card__latest">Latest: <strong>${escapeHtml(latest.title)}</strong></p>` : ''}

        <footer class="trail-card__footer">
          <span>Updated ${formatDate(trail.updated)}</span>
          <span class="trail-card__go" aria-hidden="true">Follow the trail →</span>
        </footer>
      </article>`;
  }).join('');
}


/* ---------- 5. Trail details (the timeline) ---------- */

function openTrail(trailId) {
  currentTrailId = trailId;
  renderTrail();
  showScreen('trail');
}

function renderTrail() {
  const trail = currentTrail();
  const count = trail.discoveries.length;

  setText('trail-title', trail.title);
  setText('trail-description', trail.description);
  setText('trail-stat-count', count);
  setText('trail-stat-started', formatDate(trail.created));
  setText('trail-stat-updated', formatDate(trail.updated));

  // Start: the question
  const start = `
    <li class="timeline__start">
      <span class="timeline__marker" aria-hidden="true">?</span>
      <div class="timeline__start-card">
        <span class="card-corner card-corner--top" aria-hidden="true">Q<span class="suit suit--gold">♣</span></span>
        <p class="timeline__label">Starting question</p>
        <p class="timeline__question">${escapeHtml(trail.question)}</p>
        <p class="timeline__date">${formatDate(trail.created)}</p>
      </div>
    </li>`;

  // Middle: one card per discovery, oldest first
  const items = trail.discoveries.map((discovery, index) => {
    const step = index + 1;
    const isLatest = step === count;
    const domain = getDomain(discovery.url);
    const note = discovery.note
      ? `<p class="discovery-card__note">${escapeHtml(discovery.note)}</p>`
      : '<p class="discovery-card__note discovery-card__note--empty">No notes yet.</p>';

    return `
      <li class="timeline__item ${isLatest ? 'timeline__item--latest' : ''}">
        <!-- Marker looks like a tiny playing card: step number + suit -->
        <span class="timeline__marker" aria-hidden="true">${step}${suitHtml(index)}</span>
        <article class="discovery-card" aria-label="Discovery ${step}: ${escapeHtml(discovery.title)}">
          <div class="discovery-card__header">
            <p class="discovery-card__meta">
              Discovery ${step} ·
              <time datetime="${discovery.date}">${formatDate(discovery.date)}</time>
              ${isLatest ? '<span class="pill">Latest</span>' : ''}
            </p>
            <div class="discovery-card__controls">
              <button type="button" class="icon-button" data-action="edit-discovery" data-discovery-id="${discovery.id}"
                      aria-label="Edit ${escapeHtml(discovery.title)}" title="Edit discovery">${ICONS.edit}</button>
              <button type="button" class="icon-button icon-button--danger" data-action="delete-discovery" data-discovery-id="${discovery.id}"
                      aria-label="Delete ${escapeHtml(discovery.title)}" title="Delete discovery">${ICONS.trash}</button>
            </div>
          </div>
          <h3 class="discovery-card__title">${escapeHtml(discovery.title)}</h3>
          <p class="discovery-card__domain"><span class="site-badge" aria-hidden="true">${escapeHtml(domain.charAt(0))}</span>${escapeHtml(domain)}</p>
          ${note}
          <a class="discovery-card__visit" href="${escapeHtml(discovery.url)}" target="_blank" rel="noopener noreferrer">
            Visit website ${ICONS.external}<span class="visually-hidden"> (opens in a new tab)</span>
          </a>
        </article>
      </li>`;
  }).join('');

  // End: the trail leads into the rabbit hole, with a prompt to keep going
  const end = `
    <li class="timeline__end">
      <span class="timeline__marker" aria-hidden="true"><span class="hole"></span></span>
      <button type="button" class="timeline__add" data-action="new-discovery">
        <strong><span aria-hidden="true">+</span> ${count ? 'Where did you go next?' : 'Save your first discovery'}</strong>
        <span>${count ? 'Add a discovery to keep following the trail.' : 'Found a useful website? Add it here to start the journey.'}</span>
      </button>
    </li>`;

  document.getElementById('timeline').innerHTML = start + items + end;
}


/* ---------- 6. Trail form (create / edit) ---------- */

const trailForm = document.getElementById('trail-form');

function openTrailForm(trailId, returnTo) {
  editingTrailId = trailId;
  trailFormReturnTo = returnTo;
  clearErrors(trailForm);

  const trail = trailId ? findTrail(trailId) : null;
  trailForm.title.value = trail ? trail.title : '';
  trailForm.question.value = trail ? trail.question : '';
  trailForm.description.value = trail ? trail.description : '';

  setText('trail-form-eyebrow', trail ? 'Edit trail' : 'New trail');
  setText('trail-form-title', trail ? 'Edit trail details' : 'Start a new trail');
  setText('trail-form-submit', trail ? 'Save Changes' : 'Create Trail');
  setText('trail-form-back-text', returnTo === 'trail' ? 'Back to trail' : 'Back to My Trails');

  showScreen('trail-form');
}

function closeTrailForm() {
  if (trailFormReturnTo === 'trail') {
    openTrail(currentTrailId);
  } else {
    renderDashboard();
    showScreen('dashboard');
  }
}

trailForm.addEventListener('submit', (event) => {
  event.preventDefault();
  clearErrors(trailForm);

  const title = trailForm.title.value.trim();
  const question = trailForm.question.value.trim();
  const description = trailForm.description.value.trim();

  const errors = [];
  if (!title) errors.push([trailForm.title, 'Give your trail a title.']);
  if (!question) errors.push([trailForm.question, 'Add the question that started this trail.']);
  if (errors.length) {
    showErrors(errors);
    return;
  }

  if (editingTrailId) {
    Object.assign(findTrail(editingTrailId), { title, question, description, updated: todayISO() });
    showToast('Trail updated (prototype only, not saved)');
    openTrail(editingTrailId);
  } else {
    const trail = {
      id: 'trail-' + Date.now(),
      title, question, description,
      created: todayISO(),
      updated: todayISO(),
      discoveries: [],
    };
    trails.push(trail);
    showToast('Trail created (prototype only, not saved)');
    openTrail(trail.id);
  }
});


/* ---------- 7. Discovery form (add / edit) ---------- */

const discoveryForm = document.getElementById('discovery-form');

function openDiscoveryForm(discoveryId) {
  const trail = currentTrail();
  editingDiscoveryId = discoveryId;
  clearErrors(discoveryForm);

  const discovery = trail.discoveries.find((d) => d.id === discoveryId);
  const step = discovery ? trail.discoveries.indexOf(discovery) + 1 : trail.discoveries.length + 1;

  discoveryForm.title.value = discovery ? discovery.title : '';
  discoveryForm.url.value = discovery ? discovery.url : '';
  discoveryForm.note.value = discovery ? discovery.note : '';

  setText('discovery-form-trail', trail.title);
  setText('discovery-form-title', discovery ? 'Edit discovery' : 'Add a discovery');
  setText('discovery-form-intro', discovery
    ? `This is step ${step} on the trail.`
    : `Save a website you found along the way. It will appear as step ${step} on the timeline.`);
  setText('discovery-form-submit', discovery ? 'Save Changes' : 'Save Discovery');

  showScreen('discovery-form');
}

discoveryForm.addEventListener('submit', (event) => {
  event.preventDefault();
  clearErrors(discoveryForm);

  const title = discoveryForm.title.value.trim();
  const url = discoveryForm.url.value.trim();
  const note = discoveryForm.note.value.trim();

  const errors = [];
  if (!title) errors.push([discoveryForm.title, 'Add the website’s title.']);
  if (!url) errors.push([discoveryForm.url, 'Add the website’s URL.']);
  else if (!isValidUrl(url)) errors.push([discoveryForm.url, 'Enter a full URL that starts with https:// or http://']);
  if (errors.length) {
    showErrors(errors);
    return;
  }

  const trail = currentTrail();
  if (editingDiscoveryId) {
    const discovery = trail.discoveries.find((d) => d.id === editingDiscoveryId);
    Object.assign(discovery, { title, url, note });
    showToast('Discovery updated (prototype only, not saved)');
  } else {
    trail.discoveries.push({ id: 'd' + Date.now(), date: todayISO(), title, url, note });
    showToast('Discovery added (prototype only, not saved)');
  }
  trail.updated = todayISO();
  openTrail(trail.id);
});


/* Validation helpers shared by both forms.
   Each error message lives in <p id="FIELD-ID-error"> under its field. */

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
}

// Clear a field's error as soon as the user starts fixing it
document.querySelectorAll('#trail-form input, #discovery-form input').forEach((input) => {
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    document.getElementById(input.id + '-error').hidden = true;
  });
});


/* ---------- 8. Click handling ----------
   One listener for the whole page. Any element with data-action="NAME"
   runs the matching function below. */

const actions = {
  'go-dashboard': () => {
    renderDashboard();
    showScreen('dashboard');
  },

  'open-trail': (button) => openTrail(button.dataset.trailId),

  'new-trail': () => openTrailForm(null, 'dashboard'),

  // From a dashboard card (has data-trail-id) or from the trail screen (uses the open trail)
  'edit-trail': (button) => {
    if (button.dataset.trailId) openTrailForm(button.dataset.trailId, 'dashboard');
    else openTrailForm(currentTrailId, 'trail');
  },

  'delete-trail': (button) => {
    const trail = findTrail(button.dataset.trailId || currentTrailId);
    const ok = confirm(`Delete “${trail.title}” and its ${plural(trail.discoveries.length, 'discovery', 'discoveries')}?\n\nThis can’t be undone.`);
    if (!ok) return;
    trails = trails.filter((t) => t.id !== trail.id);
    showToast('Trail deleted (prototype only)');
    renderDashboard();
    showScreen('dashboard');
  },

  'cancel-trail-form': () => closeTrailForm(),

  'new-discovery': () => openDiscoveryForm(null),

  'edit-discovery': (button) => openDiscoveryForm(button.dataset.discoveryId),

  'delete-discovery': (button) => {
    const trail = currentTrail();
    const discovery = trail.discoveries.find((d) => d.id === button.dataset.discoveryId);
    if (!confirm(`Delete “${discovery.title}” from this trail?`)) return;
    trail.discoveries = trail.discoveries.filter((d) => d.id !== discovery.id);
    trail.updated = todayISO();
    showToast('Discovery deleted (prototype only)');
    renderTrail();
  },

  'cancel-discovery-form': () => openTrail(currentTrailId),

  // Settings (prototype data only, nothing here touches a real database)
  'open-settings': () => settings.showModal(),

  'close-settings': () => settings.close(),

  'reset-data': () => {
    const ok = confirm('Reset to the sample data?\n\nAny trails or discoveries you added, edited, or deleted in this prototype will be discarded.');
    if (!ok) return;
    trails = copyOf(SAMPLE_TRAILS);
    settings.close();
    renderDashboard();
    showScreen('dashboard');
    showToast('Sample data restored');
  },

  'clear-trails': () => {
    const ok = confirm('Clear all trails?\n\nEvery trail in this prototype will be removed. You can bring the examples back with Reset sample data.');
    if (!ok) return;
    trails = [];
    settings.close();
    renderDashboard();
    showScreen('dashboard');
    showToast('All trails cleared (prototype only)');
  },
};

const settings = document.getElementById('settings');

// Clicking the dark area outside the Settings panel closes it
settings.addEventListener('click', (event) => {
  if (event.target === settings) settings.close();
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (button) actions[button.dataset.action](button);
});


// Start on the dashboard
renderDashboard();
