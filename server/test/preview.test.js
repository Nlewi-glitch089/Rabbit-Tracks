/* Preview mode (npm run preview): serves the front end with sample
   data and needs no database, so these tests don't start MongoDB. */

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewApp } from '../src/app.js';
import { FIELD_LIMITS } from '../src/validation.js';

let server;
let baseUrl;

before(async () => {
  server = createPreviewApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

test('serves index.html set to sample data', async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Rabbit Tracks<\/title>/);
  assert.match(html, /<meta name="rabbit-tracks-data" content="sample">/);
  // "auto" over http would mean API mode, which preview mode doesn't have
  assert.doesNotMatch(html, /content="auto"/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('"New trail" lives in the header only (plus the empty state\'s "Start a trail")', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();
  const header = html.slice(html.indexOf('<header class="site-header">'), html.indexOf('</header>'));
  const allTrails = html.slice(html.indexOf('<div class="section-head">'), html.indexOf('<ol class="trail-grid"'));
  const emptyState = html.slice(html.indexOf('id="empty-state"'), html.indexOf('SCREEN 2'));
  assert.equal(header.match(/href="#\/trails\/new"/g)?.length, 1);
  assert.doesNotMatch(allTrails, /href="#\/trails\/new"/);
  assert.equal(html.match(/href="#\/trails\/new"/g).length, 2);
  assert.match(emptyState, /href="#\/trails\/new"[\s\S]*Start a trail/);
});

test('the journal\'s fields match what the API accepts (including the optional highlight)', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();
  for (const [field, limit] of Object.entries(FIELD_LIMITS.discovery)) {
    if (field === 'url') continue; // URLs are checked by format; the input has no maxlength
    const input = html.match(new RegExp(`<(?:input|textarea)[^>]*id="discovery-${field}-input"[^>]*>`))?.[0];
    assert.ok(input, `journal has a ${field} field`);
    assert.match(input, new RegExp(`maxlength="${limit}"`), `${field} maxlength matches the API's ${limit}`);
    assert.match(input, new RegExp(`name="${field}"`));
  }
});

test('every guided-tour stop points at a part of the page that exists', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();
  const appJs = await (await fetch(`${baseUrl}/js/app.js`)).text();
  const steps = appJs.slice(appJs.indexOf('const TOUR_STEPS'), appJs.indexOf('];', appJs.indexOf('const TOUR_STEPS')));
  const targets = [...steps.matchAll(/target: '([^']+)'/g)].map((match) => match[1]);
  assert.ok(targets.length >= 7, 'the tour has its stops');
  for (const target of targets) {
    // Marked in index.html, or on the trail card app.js draws
    assert.ok(html.includes(`data-tour="${target}"`) || appJs.includes(`data-tour="${target}"`), `data-tour="${target}" exists`);
  }
});

test('Settings only offers controls that do something', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();
  const appJs = await (await fetch(`${baseUrl}/js/app.js`)).text();
  const settings = html.slice(html.indexOf('<dialog class="dialog settings"'), html.indexOf('</dialog>', html.indexOf('<dialog class="dialog settings"')));
  for (const [, action] of settings.matchAll(/data-action="([^"]+)"/g)) {
    assert.match(appJs, new RegExp(`'${action}': `), `data-action="${action}" has a handler`);
  }
  for (const [, id] of settings.matchAll(/<input[^>]*id="([^"]+)"/g)) {
    assert.match(appJs, new RegExp(`getElementById\\('${id}'\\)\\.addEventListener`), `#${id} is wired up`);
  }
});

test('the data-mode tag the server fills in is the one the front end reads', async () => {
  const appJs = await (await fetch(`${baseUrl}/js/app.js`)).text();
  assert.match(appJs, /querySelector\('meta\[name="rabbit-tracks-data"\]'\)/);
});

test('shows no preview-mode banner or label in the page', async () => {
  const html = await (await fetch(`${baseUrl}/`)).text();
  const appJs = await (await fetch(`${baseUrl}/js/app.js`)).text();
  assert.doesNotMatch(html, /mode-banner|Preview mode|footer-source/i);
  assert.doesNotMatch(appJs, /Preview mode|footer-source/i);
});

test('serves the front-end assets, but not server or archive files', async () => {
  for (const asset of ['/css/styles.css', '/js/app.js', '/js/sample-data.js', '/js/api.js', '/js/milestones.js', '/images/favicon.svg']) {
    assert.equal((await fetch(baseUrl + asset)).status, 200, asset);
  }
  for (const hidden of ['/server/package.json', '/server/.env.example', '/archive/README.md', '/README.md']) {
    assert.equal((await fetch(baseUrl + hidden)).status, 404, hidden);
  }
});

test('has no API, and says so instead of pretending to be connected', async () => {
  for (const path of ['/api/health', '/api/trails']) {
    const response = await fetch(baseUrl + path);
    assert.equal(response.status, 503, path);
    assert.match((await response.json()).error, /Preview mode has no API or database/);
  }
});
