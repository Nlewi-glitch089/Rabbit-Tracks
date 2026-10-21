/* =========================================================
   Rabbit Trails — app
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
   12. Buttons, Settings, and start-up

   Every screen has its own address (#/trails/game-dev, ...), so the
   browser's Back/Forward buttons and refreshing keep you in place.
   ========================================================= */


/* ---------- 1. Data source ----------
   All reads and changes go through `trailData`. Right now that's the
   in-memory sample data (sample-data.js). When the API exists, an
   api.js file with the same functions can be swapped in here. */

const trailData = sampleData;


/* ---------- 2. State ---------- */

let dashboardTrails = [];      // trails shown on the dashboard
let currentTrail = null;       // trail open on the trail screen or a form
let editingTrailId = null;     // null = creating a new trail
let editingDiscoveryId = null; // null = adding a new discovery
let previousHash = '#/';       // where Cancel / Back go
let routeVersion = 0;          // increases on every navigation; used to ignore slow, outdated responses


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

/* Each trail gets one of four accent colors (see .accent-0 to .accent-3 in
   styles.css), picked from its id so it stays the same everywhere and
   doesn't change when other trails are added or deleted. */
function accentFor(trailId) {
  let hash = 0x811c9dc5;                       // FNV-1a hash of the id
  for (const char of String(trailId)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `accent-${(hash >>> 4) % 4}`;
}

// First letter of a trail's title, for its monogram
function monogramFor(title) {
  const letter = String(title).match(/[\p{L}\p{N}]/u);
  return letter ? letter[0].toUpperCase() : '?';
}

const EXTERNAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

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


/* ---------- 4. Screens + the status screen ----------
   Every screen is a <section id="screen-NAME">. Only one has "is-active".
   The screen's <h1> receives focus so keyboard and screen reader users
   know the page changed. */

function showScreen(name) {
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
  console.error('[Rabbit Trails] Loading failed:', error);
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
  const discoveryCount = trails.reduce((sum, trail) => sum + trail.discoveries.length, 0);
  const hasTrails = trails.length > 0;

  setText('trail-count', hasTrails
    ? `${plural(trails.length, 'trail')} · ${plural(discoveryCount, 'discovery', 'discoveries')}`
    : '');
  document.getElementById('empty-state').hidden = hasTrails;
  document.getElementById('dash-grid').hidden = !hasTrails;
  document.getElementById('trail-list').hidden = !hasTrails;

  renderContinue(sorted[0]);
  renderTrailList(sorted);
  renderRecentDiscoveries(trails);
}

/* "Continue where you left off": the most recently updated trail,
   with its latest three steps in order. */
function renderContinue(trail) {
  const panel = document.getElementById('continue');
  panel.hidden = !trail;
  if (!trail) {
    panel.innerHTML = '';
    return;
  }

  const count = trail.discoveries.length;
  const firstShown = Math.max(0, count - 3);
  const steps = trail.discoveries.slice(firstShown).map((discovery, i) => {
    const step = firstShown + i + 1;
    return `
      <li class="continue__step${step === count ? ' continue__step--latest' : ''}">
        <span class="continue__step-number" aria-hidden="true">${step}</span>
        <div>
          <p class="continue__step-title"><span class="visually-hidden">Step ${step}: </span>${escapeHtml(discovery.title)}</p>
          <p class="continue__step-meta">${escapeHtml(getDomain(discovery.url))} · ${formatShortDate(discovery.date)}</p>
        </div>
      </li>`;
  }).join('');

  panel.innerHTML = `
    <div class="continue__body">
      <p class="eyebrow">Continue where you left off</p>
      <div class="continue__heading">
        <span class="monogram ${accentFor(trail.id)}" aria-hidden="true">${escapeHtml(monogramFor(trail.title))}</span>
        <h2 class="continue__title" id="continue-title">
          <a href="${links.trail(trail.id)}">${escapeHtml(trail.title)}</a>
        </h2>
      </div>
      <p class="continue__question">${escapeHtml(trail.question)}</p>
      <div class="continue__actions">
        <a class="btn btn--gold" href="${links.newDiscovery(trail.id)}"><span aria-hidden="true">+</span> Add discovery</a>
        <a class="btn btn--on-dark" href="${links.trail(trail.id)}">Open trail</a>
      </div>
    </div>
    <div class="continue__steps">
      <p class="continue__steps-label">${count ? `Latest steps · ${plural(count, 'discovery', 'discoveries')}` : 'No discoveries yet'}</p>
      ${count
        ? `<ol class="continue__step-list">${steps}</ol>`
        : '<p class="continue__empty">Add the first website you find to start this trail.</p>'}
    </div>`;
}

function renderTrailList(sorted) {
  document.getElementById('trail-list').innerHTML = sorted.map((trail) => {
    const count = trail.discoveries.length;
    const latest = trail.discoveries[count - 1];

    // One dot for the question + one per discovery (up to 6)
    const dots = Array.from({ length: Math.min(count, 6) + 1 }, () => '<li></li>').join('');
    const more = count > 6 ? `<span class="mini-path__more">+${count - 6}</span>` : '';

    return `
      <li class="trail-row ${accentFor(trail.id)}">
        <span class="monogram" aria-hidden="true">${escapeHtml(monogramFor(trail.title))}</span>

        <div class="trail-row__main">
          <h3 class="trail-row__title">
            <a class="trail-row__open" href="${links.trail(trail.id)}">${escapeHtml(trail.title)}</a>
          </h3>
          <p class="trail-row__question">${escapeHtml(trail.question)}</p>
          <div class="trail-row__progress">
            <div class="mini-path" aria-hidden="true"><ol>${dots}</ol>${more}</div>
            <p class="trail-row__latest">${latest ? `Latest: ${escapeHtml(latest.title)}` : 'No discoveries yet'}</p>
          </div>
        </div>

        <div class="trail-row__side">
          <p class="trail-row__count"><strong>${count}</strong> ${count === 1 ? 'discovery' : 'discoveries'}</p>
          <p class="trail-row__meta">Updated ${formatShortDate(trail.updated)}</p>
          <div class="trail-row__actions">
            <a class="text-button" href="${links.editTrail(trail.id)}" aria-label="Edit ${escapeHtml(trail.title)}">Edit</a>
            <button type="button" class="text-button text-button--danger" data-action="delete-trail" data-trail-id="${escapeHtml(trail.id)}"
                    aria-label="Delete ${escapeHtml(trail.title)}">Delete</button>
          </div>
        </div>
      </li>`;
  }).join('');
}

/* The five newest discoveries across every trail. Clicking one opens its
   trail and scrolls to it (see the click handler at the bottom). */
function renderRecentDiscoveries(trails) {
  const all = trails.flatMap((trail) =>
    trail.discoveries.map((discovery, index) => ({ trail, discovery, index })));
  // Newest date first; on the same date, the later step first
  all.sort((a, b) => String(b.discovery.date).localeCompare(String(a.discovery.date)) || b.index - a.index);

  const recent = all.slice(0, 5);
  document.getElementById('recent-list').innerHTML = recent.length
    ? recent.map(({ trail, discovery }) => `
      <li class="recent-item ${accentFor(trail.id)}">
        <span class="recent-item__dot" aria-hidden="true"></span>
        <div>
          <a class="recent-item__title" href="${links.trail(trail.id)}"
             data-show-discovery="${escapeHtml(discovery.id)}" data-trail-id="${escapeHtml(trail.id)}">${escapeHtml(discovery.title)}</a>
          <p class="recent-item__meta">${escapeHtml(getDomain(discovery.url))} · ${formatShortDate(discovery.date)}</p>
          <p class="recent-item__trail">in ${escapeHtml(trail.title)}</p>
        </div>
      </li>`).join('')
    : '<li class="recent-item__none">Discoveries you add will show up here.</li>';
}


/* ---------- 7. Trail details (the timeline) ---------- */

function renderTrail() {
  const trail = currentTrail;
  const count = trail.discoveries.length;

  setText('trail-title', trail.title);
  setText('trail-breadcrumb', trail.title);
  setText('trail-description', trail.description || '');
  setText('trail-stat-count', count);
  setText('trail-stat-started', formatDate(trail.created));
  setText('trail-stat-updated', formatDate(trail.updated));
  const mark = document.getElementById('trail-mark');
  mark.className = `monogram monogram--large ${accentFor(trail.id)}`;
  mark.textContent = monogramFor(trail.title);
  document.getElementById('trail-add-discovery').href = links.newDiscovery(trail.id);
  document.getElementById('trail-edit-link').href = links.editTrail(trail.id);

  // Start: the question
  const start = `
    <li class="timeline__start">
      <span class="timeline__marker" aria-hidden="true">?</span>
      <div class="question-panel">
        <p class="question-panel__label">It started with a question · ${formatDate(trail.created)}</p>
        <p class="question-panel__text">${escapeHtml(trail.question)}</p>
      </div>
    </li>`;

  // Middle: one entry per discovery, oldest first
  const items = trail.discoveries.map((discovery, index) => {
    const step = index + 1;
    const isLatest = step === count;
    const previousDate = index === 0 ? trail.created : trail.discoveries[index - 1].date;
    const domain = getDomain(discovery.url);
    const note = discovery.note
      ? `<p class="discovery__note">${escapeHtml(discovery.note)}</p>`
      : '<p class="discovery__note discovery__note--empty">No notes yet.</p>';
    // Only link to http(s) addresses, never javascript: or other schemes
    const visit = isValidUrl(discovery.url)
      ? `<a class="discovery__visit" href="${escapeHtml(discovery.url)}" target="_blank" rel="noopener noreferrer">
           Visit website ${EXTERNAL_ICON}<span class="visually-hidden"> (opens in a new tab)</span>
         </a>`
      : '<span class="discovery__visit"></span>';

    return `
      <li class="timeline__item${isLatest ? ' timeline__item--latest' : ''}" id="discovery-${escapeHtml(discovery.id)}">
        <span class="timeline__marker" aria-hidden="true">${step}</span>
        <p class="timeline__gap">${gapLabel(previousDate, discovery.date)}</p>
        <article class="discovery" aria-label="Discovery ${step}: ${escapeHtml(discovery.title)}">
          <div class="discovery__head">
            <span class="site-badge" aria-hidden="true">${escapeHtml(domain.charAt(0))}</span>
            <span>${escapeHtml(domain)}</span>
            ${isLatest ? '<span class="pill">Latest</span>' : ''}
            <time class="discovery__date" datetime="${escapeHtml(String(discovery.date).slice(0, 10))}">${formatDate(discovery.date)}</time>
          </div>
          <h3 class="discovery__title">${escapeHtml(discovery.title)}</h3>
          ${note}
          <div class="discovery__actions">
            ${visit}
            <a class="text-button" href="${links.editDiscovery(trail.id, discovery.id)}"
               aria-label="Edit ${escapeHtml(discovery.title)}">Edit</a>
            <button type="button" class="text-button text-button--danger" data-action="delete-discovery" data-discovery-id="${escapeHtml(discovery.id)}"
                    aria-label="Delete ${escapeHtml(discovery.title)}">Delete</button>
          </div>
        </article>
      </li>`;
  }).join('');

  // End: the trail leads into the hole, with a prompt to keep going
  const end = `
    <li class="timeline__end">
      <span class="timeline__marker" aria-hidden="true"><span class="hole"></span></span>
      <a class="timeline__add" href="${links.newDiscovery(trail.id)}">
        <strong><span aria-hidden="true">+</span> ${count ? 'Where did you go next?' : 'Add your first discovery'}</strong>
        <span>${count ? 'Add the next website you found.' : 'Found a useful website? Save it here to start the trail.'}</span>
      </a>
    </li>`;

  document.getElementById('timeline').innerHTML = start + items + end;
}


/* ---------- 8. Trail form (create / edit) ---------- */

const trailForm = document.getElementById('trail-form');

function openTrailForm(trail) {
  editingTrailId = trail ? trail.id : null;
  resetForm(trailForm);

  trailForm.title.value = trail ? trail.title : '';
  trailForm.question.value = trail ? trail.question : '';
  trailForm.description.value = trail ? trail.description || '' : '';

  setText('trail-form-eyebrow', trail ? 'Edit trail' : 'New trail');
  setText('trail-form-title', trail ? trail.title : 'Start a new trail');
  setText('trail-form-submit', trail ? 'Save changes' : 'Create trail');

  const back = backTarget(trail ? links.trail(trail.id) : links.dashboard());
  setCancelLinks('trail-form', back, parseRoute(back).name === 'trail' ? 'Back to trail' : 'My trails');

  showScreen('trail-form');
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
  if (!data.title) errors.push([trailForm.title, 'Give your trail a title.']);
  if (!data.question) errors.push([trailForm.question, 'Add the question that started this trail.']);
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


/* ---------- 9. Discovery form (add / edit) ---------- */

const discoveryForm = document.getElementById('discovery-form');

function openDiscoveryForm(discovery) {
  const trail = currentTrail;
  editingDiscoveryId = discovery ? discovery.id : null;
  resetForm(discoveryForm);

  const step = discovery ? trail.discoveries.indexOf(discovery) + 1 : trail.discoveries.length + 1;

  discoveryForm.title.value = discovery ? discovery.title : '';
  discoveryForm.url.value = discovery ? discovery.url : '';
  discoveryForm.note.value = discovery ? discovery.note || '' : '';

  setText('discovery-form-trail', trail.title);
  setText('discovery-form-title', discovery ? 'Edit discovery' : 'Add a discovery');
  setText('discovery-form-intro', discovery
    ? `This is step ${step} on the trail.`
    : `It will be added as step ${step}, after everything you’ve found so far.`);
  setText('discovery-form-submit', discovery ? 'Save changes' : 'Save discovery');
  setCancelLinks('discovery-form', links.trail(trail.id));

  showScreen('discovery-form');
}

discoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearErrors(discoveryForm);

  const data = {
    title: discoveryForm.title.value.trim(),
    url: discoveryForm.url.value.trim(),
    note: discoveryForm.note.value.trim(),
  };

  const errors = [];
  if (!data.title) errors.push([discoveryForm.title, 'Add the website’s title.']);
  if (!data.url) errors.push([discoveryForm.url, 'Add the website’s URL.']);
  else if (!isValidUrl(data.url)) errors.push([discoveryForm.url, 'Enter a full URL that starts with https:// or http://']);
  if (errors.length) {
    showErrors(errors);
    return;
  }

  setSaving(discoveryForm, true);
  try {
    let savedId;
    if (editingDiscoveryId) {
      await trailData.updateDiscovery(currentTrail.id, editingDiscoveryId, data);
      savedId = editingDiscoveryId;
      showToast('Discovery updated');
    } else {
      savedId = (await trailData.createDiscovery(currentTrail.id, data)).id;
      showToast('Discovery added');
    }
    await goToTrailAndShow(currentTrail.id, savedId);
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

// Shown above the form when saving fails. Whatever was typed stays in the fields.
function showSaveError(form, error) {
  console.error(`[Rabbit Trails] Saving ${form.id} failed:`, error);
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

// Clear a field's error as soon as the user starts fixing it
document.querySelectorAll('#trail-form input, #discovery-form input').forEach((input) => {
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    document.getElementById(input.id + '-error').hidden = true;
  });
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
  if (confirmDialog.open) confirmDialog.close();
  if (answerConfirm) answerConfirm(answer);
  answerConfirm = null;
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
    console.error('[Rabbit Trails] Delete failed:', error);
    showToast(`Couldn’t delete: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}


/* ---------- 12. Buttons, Settings, and start-up ----------
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

  'open-settings': () => settings.showModal(),

  'close-settings': () => settings.close(),

  'reset-data': async () => {
    const ok = await confirmAction('Reset sample data?', 'Your changes will be replaced with the four example trails.', 'Reset');
    if (!ok) return;
    await trailData.reset();
    settings.close();
    showToast('Sample data restored');
    goTo(links.dashboard());
  },

  'clear-trails': async () => {
    const ok = await confirmAction('Clear all trails?', 'Every trail will be removed. You can bring the examples back with Reset sample data.', 'Clear all');
    if (!ok) return;
    await trailData.clear();
    settings.close();
    showToast('All trails cleared');
    goTo(links.dashboard());
  },
};

// Clicking the dark area outside the Settings panel closes it
settings.addEventListener('click', (event) => {
  if (event.target === settings) settings.close();
});

document.addEventListener('click', (event) => {
  // The skip link would change the address to "#main", which isn't a screen
  if (event.target.closest('[data-skip-link]')) {
    event.preventDefault();
    document.getElementById('main').focus();
    return;
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
  else console.error(`[Rabbit Trails] No handler for data-action="${button.dataset.action}"`);
});

window.addEventListener('hashchange', (event) => {
  previousHash = new URL(event.oldURL).hash || '#/';
  route();
});

// Start on whatever screen the address points to (the dashboard by default)
route();
