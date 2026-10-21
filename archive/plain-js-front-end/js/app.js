/* =========================================================
   Rabbit Hole Trails — front end
   1.  State
   2.  Helpers
   3.  Screens + the status screen (loading / error / not found)
   4.  Routing (#/ addresses)
   5.  Dashboard
   6.  Trail details (the timeline)
   7.  Trail form (create / edit)
   8.  Discovery form (add / edit)
   9.  Form helpers (validation, saving state)
   10. Confirm dialog
   11. Click handling + start

   All data goes through `api` (see api.js). This file never
   knows whether that's the real API or the sample data store.
   ========================================================= */


/* ---------- 1. State ---------- */

let dashboardTrails = [];     // trails shown on the dashboard
let currentTrail = null;      // trail open on the details screen or a form
let editingDiscoveryId = null;
let previousHash = '#/';      // where Cancel / Back go
let routeToken = 0;           // bumps on every navigation so slow responses can be ignored


/* ---------- 2. Helpers ---------- */

// "2026-10-03" or "2026-10-03T14:20:00Z" → "Oct 3, 2026"
function formatDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

// Addresses for each screen
const links = {
  dashboard: () => '#/',
  newTrail: () => '#/trails/new',
  trail: (trailId) => `#/trails/${encodeURIComponent(trailId)}`,
  editTrail: (trailId) => `#/trails/${encodeURIComponent(trailId)}/edit`,
  newDiscovery: (trailId) => `#/trails/${encodeURIComponent(trailId)}/discoveries/new`,
  editDiscovery: (trailId, discoveryId) =>
    `#/trails/${encodeURIComponent(trailId)}/discoveries/${encodeURIComponent(discoveryId)}/edit`,
};

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


/* ---------- 3. Screens + the status screen ----------
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

// kind: 'loading' | 'error' | 'not-found'
function showStatus(kind, title, message = '', actionsHtml = '') {
  document.getElementById('status-card').className = `status-card status-card--${kind}`;
  document.getElementById('status-card-symbol').innerHTML = kind === 'error'
    ? '!<span class="suit suit--red" aria-hidden="true">♦</span>'
    : '?<span class="suit suit--red" aria-hidden="true">♥</span>';
  setText('status-title', title);
  setText('status-message', message);
  document.getElementById('status-actions').innerHTML = actionsHtml;
  showScreen('status');
}

function showLoadError(error) {
  if (error.status === 404) {
    showStatus('not-found', 'We couldn’t find that',
      'It may have been deleted, or the link is wrong.',
      `<a class="btn btn--primary" href="${links.dashboard()}">Back to My Trails</a>`);
    return;
  }
  showStatus('error', 'Something went wrong',
    error.message || 'The trails couldn’t be loaded.',
    `<button type="button" class="btn btn--primary" data-action="retry">Try again</button>
     <a class="btn btn--ghost" href="${links.dashboard()}">Back to My Trails</a>`);
}

// Waits for data. Only shows the loading screen if it takes a moment,
// so fast responses don't cause a flash.
async function load(promise, token) {
  const timer = setTimeout(() => {
    if (token === routeToken) showStatus('loading', 'Following the trail…');
  }, 250);
  try {
    return await promise;
  } finally {
    clearTimeout(timer);
  }
}


/* ---------- 4. Routing ----------
   The part of the address after # decides the screen:
     #/                                  dashboard
     #/trails/new                        new trail form
     #/trails/ID                         trail details
     #/trails/ID/edit                    edit trail form
     #/trails/ID/discoveries/new         add discovery form
     #/trails/ID/discoveries/ID/edit     edit discovery form
   Using the address means Back/Forward and refreshing work. */

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

async function route() {
  const token = ++routeToken;
  const current = parseRoute(location.hash);

  try {
    if (current.name === 'dashboard') {
      const trails = await load(api.listTrails(), token);
      if (token !== routeToken) return;
      renderDashboard(trails);
      showScreen('dashboard');
      return;
    }

    if (current.name === 'trail-new') {
      openTrailForm(null);
      return;
    }

    if (current.name === 'not-found') {
      showLoadError({ status: 404 });
      return;
    }

    // Every other screen needs the trail first
    const trail = await load(api.getTrail(current.trailId), token);
    if (token !== routeToken) return;
    currentTrail = trail;

    if (current.name === 'trail') {
      renderTrail(trail);
      showScreen('trail');
    } else if (current.name === 'trail-edit') {
      openTrailForm(trail);
    } else if (current.name === 'discovery-new') {
      openDiscoveryForm(trail, null);
    } else if (current.name === 'discovery-edit') {
      const discovery = trail.discoveries.find((d) => d.id === current.discoveryId);
      if (!discovery) {
        showLoadError({ status: 404 });
        return;
      }
      openDiscoveryForm(trail, discovery);
    }
  } catch (error) {
    if (token === routeToken) showLoadError(error);
  }
}

function goTo(hash) {
  if (location.hash === hash) route();   // same address: hashchange won't fire, so reload by hand
  else location.hash = hash;
}

// Cancel/Back should return to the screen the user came from, but never to another form
function cancelTarget(fallback) {
  const from = parseRoute(previousHash).name;
  return ['dashboard', 'trail'].includes(from) ? previousHash : fallback;
}

function setCancelLinks(formName, href, text) {
  document.querySelectorAll(`[data-cancel-link="${formName}"]`).forEach((link) => {
    link.href = href;
    const label = link.querySelector('[data-cancel-text]');
    if (label && text) label.textContent = text;
  });
}


/* ---------- 5. Dashboard ---------- */

function renderDashboard(trails) {
  dashboardTrails = trails;

  // Most recently updated trails first
  const sorted = [...trails].sort((a, b) => String(b.updated).localeCompare(String(a.updated)));

  setText('trail-count', plural(trails.length, 'trail'));
  document.getElementById('empty-state').hidden = trails.length > 0;

  document.getElementById('trail-grid').innerHTML = sorted.map((trail, i) => {
    const count = trail.discoveries.length;
    const latest = trail.discoveries[count - 1];

    // Each trail keeps the same suit, based on its place in the original list
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
            <a class="icon-button" href="${links.editTrail(trail.id)}"
               aria-label="Edit ${escapeHtml(trail.title)}" title="Edit trail">${ICONS.edit}</a>
            <button type="button" class="icon-button icon-button--danger" data-action="delete-trail" data-trail-id="${escapeHtml(trail.id)}"
                    aria-label="Delete ${escapeHtml(trail.title)}" title="Delete trail">${ICONS.trash}</button>
          </div>
        </div>

        <h3 class="trail-card__title">
          <a class="trail-card__open" href="${links.trail(trail.id)}">${escapeHtml(trail.title)}</a>
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


/* ---------- 6. Trail details (the timeline) ---------- */

function renderTrail(trail) {
  const count = trail.discoveries.length;

  setText('trail-title', trail.title);
  setText('trail-description', trail.description || '');
  setText('trail-stat-count', count);
  setText('trail-stat-started', formatDate(trail.created));
  setText('trail-stat-updated', formatDate(trail.updated));
  document.getElementById('trail-add-discovery').href = links.newDiscovery(trail.id);
  document.getElementById('trail-edit-link').href = links.editTrail(trail.id);

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
              <time datetime="${escapeHtml(discovery.date)}">${formatDate(discovery.date)}</time>
              ${isLatest ? '<span class="pill">Latest</span>' : ''}
            </p>
            <div class="discovery-card__controls">
              <a class="icon-button" href="${links.editDiscovery(trail.id, discovery.id)}"
                 aria-label="Edit ${escapeHtml(discovery.title)}" title="Edit discovery">${ICONS.edit}</a>
              <button type="button" class="icon-button icon-button--danger" data-action="delete-discovery" data-discovery-id="${escapeHtml(discovery.id)}"
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
      <a class="timeline__add" href="${links.newDiscovery(trail.id)}">
        <strong><span aria-hidden="true">+</span> ${count ? 'Where did you go next?' : 'Save your first discovery'}</strong>
        <span>${count ? 'Add a discovery to keep following the trail.' : 'Found a useful website? Add it here to start the journey.'}</span>
      </a>
    </li>`;

  document.getElementById('timeline').innerHTML = start + items + end;
}


/* ---------- 7. Trail form (create / edit) ---------- */

const trailForm = document.getElementById('trail-form');

function openTrailForm(trail) {
  resetForm(trailForm);
  trailForm.title.value = trail ? trail.title : '';
  trailForm.question.value = trail ? trail.question : '';
  trailForm.description.value = trail ? trail.description || '' : '';

  setText('trail-form-eyebrow', trail ? 'Edit trail' : 'New trail');
  setText('trail-form-title', trail ? 'Edit trail details' : 'Start a new trail');
  setText('trail-form-submit', trail ? 'Save Changes' : 'Create Trail');

  const back = cancelTarget(trail ? links.trail(trail.id) : links.dashboard());
  setCancelLinks('trail-form', back, parseRoute(back).name === 'trail' ? 'Back to trail' : 'Back to My Trails');

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

  const isEditing = parseRoute(location.hash).name === 'trail-edit';
  setSaving(trailForm, true);
  try {
    const saved = isEditing
      ? await api.updateTrail(currentTrail.id, data)
      : await api.createTrail(data);
    showToast(isEditing ? 'Trail updated' : 'Trail created');
    goTo(links.trail(saved.id));
  } catch (error) {
    showFormAlert(trailForm, error);
  } finally {
    setSaving(trailForm, false);
  }
});


/* ---------- 8. Discovery form (add / edit) ---------- */

const discoveryForm = document.getElementById('discovery-form');

function openDiscoveryForm(trail, discovery) {
  editingDiscoveryId = discovery ? discovery.id : null;
  resetForm(discoveryForm);

  const step = discovery ? trail.discoveries.indexOf(discovery) + 1 : trail.discoveries.length + 1;

  discoveryForm.title.value = discovery ? discovery.title : '';
  discoveryForm.url.value = discovery ? discovery.url : '';
  discoveryForm.note.value = discovery ? discovery.note || '' : '';

  setText('discovery-form-chip-label', discovery ? 'Trail:' : 'Adding to:');
  setText('discovery-form-trail', trail.title);
  setText('discovery-form-title', discovery ? 'Edit discovery' : 'Add a discovery');
  setText('discovery-form-intro', discovery
    ? `This is step ${step} on the trail.`
    : `Save a website you found along the way. It will appear as step ${step} on the timeline.`);
  setText('discovery-form-submit', discovery ? 'Save Changes' : 'Save Discovery');
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
    if (editingDiscoveryId) {
      await api.updateDiscovery(currentTrail.id, editingDiscoveryId, data);
      showToast('Discovery updated');
    } else {
      await api.createDiscovery(currentTrail.id, data);
      showToast('Discovery added');
    }
    goTo(links.trail(currentTrail.id));
  } catch (error) {
    showFormAlert(discoveryForm, error);
  } finally {
    setSaving(discoveryForm, false);
  }
});


/* ---------- 9. Form helpers ----------
   Each field error lives in <p id="FIELD-ID-error"> under its field.
   Save errors (server down, etc.) go in the <p class="form-alert"> above the form. */

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

function showFormAlert(form, error) {
  const alert = document.getElementById(form.id + '-alert');
  alert.textContent = error.status === 0
    ? error.message
    : `Couldn’t save: ${error.message || 'something went wrong.'} Your changes are still here, so you can try again.`;
  alert.hidden = false;
}

// Disables the submit button while a save is in progress, so it can't be sent twice
const submitLabels = new WeakMap();
function setSaving(form, isSaving) {
  const button = form.querySelector('[type="submit"]');
  if (isSaving) {
    submitLabels.set(button, button.textContent);
    button.textContent = 'Saving…';
  } else if (submitLabels.has(button)) {
    button.textContent = submitLabels.get(button);
    submitLabels.delete(button);
  }
  button.disabled = isSaving;
  button.setAttribute('aria-busy', String(isSaving));
}

// Clear a field's error as soon as the user starts fixing it
document.querySelectorAll('#trail-form input, #discovery-form input').forEach((input) => {
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid');
    document.getElementById(input.id + '-error').hidden = true;
  });
});


/* ---------- 10. Confirm dialog ----------
   Resolves to true if the user clicks the red button, false for
   Cancel or Esc. */

const confirmDialog = document.getElementById('confirm-dialog');
let answerConfirm = null;   // resolves the Promise from the open dialog

function confirmAction(title, message, confirmLabel) {
  setText('confirm-title', title);
  setText('confirm-message', message);
  setText('confirm-ok', confirmLabel);
  confirmDialog.showModal();

  return new Promise((resolve) => { answerConfirm = resolve; });
}

function settleConfirm(answer) {
  if (!answerConfirm) return;
  answerConfirm(answer);
  answerConfirm = null;
}

// Answer as soon as a button is clicked (the <form method="dialog"> then closes the dialog)
confirmDialog.querySelector('form').addEventListener('submit', (event) => {
  settleConfirm(Boolean(event.submitter) && event.submitter.value === 'confirm');
});

// Esc, or the dialog closing any other way, counts as Cancel
confirmDialog.addEventListener('close', () => settleConfirm(false));

// Runs a delete with the button disabled, and shows a toast if it fails
async function runDelete(button, work) {
  button.disabled = true;
  try {
    await work();
  } catch (error) {
    showToast(`Couldn’t delete: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}


/* ---------- 11. Click handling + start ----------
   Links handle navigation. Anything else with data-action="NAME"
   runs the matching function below. */

const settings = document.getElementById('settings');

const actions = {
  retry: () => route(),

  // From a dashboard card (has data-trail-id) or from the trail screen (uses the open trail)
  'delete-trail': async (button) => {
    const fromDashboard = Boolean(button.dataset.trailId);
    const trail = fromDashboard
      ? dashboardTrails.find((t) => t.id === button.dataset.trailId)
      : currentTrail;
    const ok = await confirmAction(
      `Delete “${trail.title}”?`,
      `This removes the trail and its ${plural(trail.discoveries.length, 'discovery', 'discoveries')}. This can’t be undone.`,
      'Delete trail');
    if (!ok) return;

    await runDelete(button, async () => {
      await api.deleteTrail(trail.id);
      showToast('Trail deleted');
      goTo(links.dashboard());
    });
  },

  'delete-discovery': async (button) => {
    const discovery = currentTrail.discoveries.find((d) => d.id === button.dataset.discoveryId);
    const ok = await confirmAction(
      `Delete “${discovery.title}”?`,
      'It will be removed from this trail. This can’t be undone.',
      'Delete discovery');
    if (!ok) return;

    await runDelete(button, async () => {
      await api.deleteDiscovery(currentTrail.id, discovery.id);
      showToast('Discovery deleted');
      // Re-draw in place instead of reloading the screen, so the page doesn't jump to the top
      currentTrail = await api.getTrail(currentTrail.id);
      renderTrail(currentTrail);
    });
  },

  'open-settings': () => settings.showModal(),

  'close-settings': () => settings.close(),

  // Sample data mode only (these buttons are hidden when using the real API)
  'reset-data': async () => {
    const ok = await confirmAction('Reset sample data?',
      'Any trails or discoveries you added, edited, or deleted in sample mode will be replaced with the four examples.',
      'Reset');
    if (!ok) return;
    await SampleStore.reset();
    settings.close();
    showToast('Sample data restored');
    goTo(links.dashboard());
  },

  'clear-trails': async () => {
    const ok = await confirmAction('Clear all trails?',
      'Every trail in sample mode will be removed. You can bring the examples back with Reset sample data.',
      'Clear all');
    if (!ok) return;
    await SampleStore.clear();
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
  const button = event.target.closest('[data-action]');
  if (button) actions[button.dataset.action](button);
});

window.addEventListener('hashchange', (event) => {
  previousHash = new URL(event.oldURL).hash || '#/';
  route();
});

// Show where the data is coming from
document.getElementById('data-banner').hidden = !usingSampleData;
document.getElementById('settings-sample-controls').hidden = !usingSampleData;
setText('settings-data-source', usingSampleData
  ? 'Using sample data saved in this browser only. There is no database connected yet.'
  : `Connected to the Rabbit Hole Trails API at ${API_BASE_URL}.`);

route();
