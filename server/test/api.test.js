/* End-to-end tests for the API: real HTTP requests to the Express app,
   backed by a real MongoDB server that mongodb-memory-server starts
   (and throws away) for the test run. The first run downloads the
   MongoDB binary, so it needs an internet connection. */

import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { connectToDatabase } from '../src/db.js';
import { loadSampleTrails, toDocuments } from '../scripts/seed.js';

let mongo;
let connection;
let server;
let baseUrl;

before(async () => {
  mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  connection = await connectToDatabase(mongo.getUri(), 'rabbit_trails_test');
  server = createApp(connection.db, { logErrors: false }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await connection?.client.close();
  await mongo?.stop();
});

async function call(method, path, body) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

describe('health', () => {
  test('reports the database as connected', async () => {
    const { status, body } = await call('GET', '/api/health');
    assert.equal(status, 200);
    assert.deepEqual(body, { status: 'ok', database: 'connected' });
  });
});

describe('trails', () => {
  let trailId;

  test('starts empty', async () => {
    const { status, body } = await call('GET', '/api/trails');
    assert.equal(status, 200);
    assert.deepEqual(body, []);
  });

  test('creates a trail with trimmed fields and no discoveries', async () => {
    const { status, body } = await call('POST', '/api/trails', {
      title: '  Bees  ', question: 'How do bees talk?', description: '', extra: 'ignored',
    });
    assert.equal(status, 201);
    assert.equal(body.title, 'Bees');
    assert.equal(body.question, 'How do bees talk?');
    assert.deepEqual(body.discoveries, []);
    assert.match(body.id, /^[0-9a-f]{24}$/);
    assert.match(body.created, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(body.updated, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    assert.equal(body.extra, undefined);
    trailId = body.id;
  });

  test('rejects missing, too-long, and non-text fields', async () => {
    assert.deepEqual(await call('POST', '/api/trails', { title: 'x' }),
      { status: 400, body: { error: 'question is required.' } });
    assert.deepEqual(await call('POST', '/api/trails', { title: 'x'.repeat(81), question: 'q' }),
      { status: 400, body: { error: 'title must be 80 characters or fewer.' } });
    assert.deepEqual(await call('POST', '/api/trails', { title: 5, question: 'q' }),
      { status: 400, body: { error: 'title must be text.' } });
  });

  test('rejects malformed JSON', async () => {
    assert.deepEqual(await call('POST', '/api/trails', '{"title":'),
      { status: 400, body: { error: 'Request body is not valid JSON.' } });
  });

  test('reads and updates a trail', async () => {
    const updated = await call('PUT', `/api/trails/${trailId}`, { title: 'Bee talk', question: 'How do bees talk?', description: 'Waggle dance' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.title, 'Bee talk');

    const { status, body } = await call('GET', `/api/trails/${trailId}`);
    assert.equal(status, 200);
    assert.equal(body.description, 'Waggle dance');
  });

  test('returns 404 for unknown and malformed ids', async () => {
    for (const id of ['000000000000000000000000', 'not-an-id', 'game-dev']) {
      assert.deepEqual(await call('GET', `/api/trails/${id}`), { status: 404, body: { error: 'Trail not found.' } });
      assert.equal((await call('PUT', `/api/trails/${id}`, { title: 't', question: 'q' })).status, 404);
      assert.equal((await call('DELETE', `/api/trails/${id}`)).status, 404);
    }
  });

  test('returns JSON 404 for unknown API routes', async () => {
    const { status, body } = await call('GET', '/api/nope');
    assert.equal(status, 404);
    assert.match(body.error, /No API route for GET \/api\/nope/);
  });

  describe('discoveries', () => {
    let firstId;

    test('adds discoveries to the end, dated today', async () => {
      const first = await call('POST', `/api/trails/${trailId}/discoveries`, { title: 'Waggle dance', url: 'https://en.wikipedia.org/wiki/Waggle_dance' });
      const second = await call('POST', `/api/trails/${trailId}/discoveries`, { title: 'Bee FAQ', url: 'http://example.com/bees', note: 'Neat' });
      assert.equal(first.status, 201);
      assert.equal(second.status, 201);
      assert.equal(first.body.note, '');
      assert.match(first.body.date, /^\d{4}-\d{2}-\d{2}$/);
      assert.notEqual(first.body.id, second.body.id);
      firstId = first.body.id;

      const trail = (await call('GET', `/api/trails/${trailId}`)).body;
      assert.deepEqual(trail.discoveries.map((d) => d.title), ['Waggle dance', 'Bee FAQ']);
    });

    test('rejects missing titles and non-http(s) URLs', async () => {
      assert.equal((await call('POST', `/api/trails/${trailId}/discoveries`, { url: 'https://a.b' })).body.error, 'title is required.');
      for (const url of ['javascript:alert(1)', 'ftp://example.com', 'example.com']) {
        assert.deepEqual(await call('POST', `/api/trails/${trailId}/discoveries`, { title: 't', url }),
          { status: 400, body: { error: 'url must start with http:// or https://' } });
      }
    });

    test('edits a discovery in place', async () => {
      const { status, body } = await call('PUT', `/api/trails/${trailId}/discoveries/${firstId}`,
        { title: 'The waggle dance', url: 'https://en.wikipedia.org/wiki/Waggle_dance', note: 'Bees dance directions' });
      assert.equal(status, 200);
      assert.equal(body.id, firstId);
      assert.equal(body.note, 'Bees dance directions');

      const trail = (await call('GET', `/api/trails/${trailId}`)).body;
      assert.equal(trail.discoveries[0].title, 'The waggle dance');
      assert.equal(trail.discoveries.length, 2);
    });

    test('keeps an optional highlight ("What caught your attention?")', async () => {
      const created = await call('POST', `/api/trails/${trailId}/discoveries`,
        { title: 'Bee vision', url: 'https://example.com/vision', highlight: '  Bees see ultraviolet.  ', note: 'Flowers have patterns we can’t see.' });
      assert.equal(created.status, 201);
      assert.equal(created.body.highlight, 'Bees see ultraviolet.');

      const edited = await call('PUT', `/api/trails/${trailId}/discoveries/${created.body.id}`,
        { title: 'Bee vision', url: 'https://example.com/vision', highlight: 'Ultraviolet!', note: 'Flowers have patterns we can’t see.' });
      assert.equal(edited.body.highlight, 'Ultraviolet!');
      const trail = (await call('GET', `/api/trails/${trailId}`)).body;
      assert.equal(trail.discoveries.filter((d) => d.title === 'Bee vision').length, 1); // edited, not duplicated
      assert.equal(trail.discoveries.find((d) => d.title === 'Bee vision').highlight, 'Ultraviolet!');

      const tooLong = await call('POST', `/api/trails/${trailId}/discoveries`, { title: 't', url: 'https://a.b', highlight: 'x'.repeat(201) });
      assert.deepEqual(tooLong, { status: 400, body: { error: 'highlight must be 200 characters or fewer.' } });

      await call('DELETE', `/api/trails/${trailId}/discoveries/${created.body.id}`);
    });

    test('returns 404 for unknown discoveries and trails', async () => {
      const missing = '000000000000000000000000';
      assert.deepEqual(await call('PUT', `/api/trails/${trailId}/discoveries/${missing}`, { title: 't', url: 'https://a.b' }),
        { status: 404, body: { error: 'Discovery not found.' } });
      assert.deepEqual(await call('DELETE', `/api/trails/${trailId}/discoveries/nope`),
        { status: 404, body: { error: 'Discovery not found.' } });
      assert.deepEqual(await call('DELETE', `/api/trails/${missing}/discoveries/${firstId}`),
        { status: 404, body: { error: 'Trail not found.' } });
      assert.deepEqual(await call('POST', `/api/trails/${missing}/discoveries`, { title: 't', url: 'https://a.b' }),
        { status: 404, body: { error: 'Trail not found.' } });
    });

    test('deletes a discovery', async () => {
      assert.equal((await call('DELETE', `/api/trails/${trailId}/discoveries/${firstId}`)).status, 204);
      const trail = (await call('GET', `/api/trails/${trailId}`)).body;
      assert.deepEqual(trail.discoveries.map((d) => d.title), ['Bee FAQ']);
    });
  });

  test('deletes a trail', async () => {
    assert.equal((await call('DELETE', `/api/trails/${trailId}`)).status, 204);
    assert.equal((await call('GET', `/api/trails/${trailId}`)).status, 404);
  });
});

describe('seed data', () => {
  test('matches the browser sample data and lists newest first', async () => {
    const samples = await loadSampleTrails();
    assert.equal(samples.length, 4);
    await connection.db.collection('trails').insertMany(toDocuments(samples));

    const { body } = await call('GET', '/api/trails');
    assert.deepEqual(body.map((t) => t.title), samples.map((t) => t.title)); // samples are already newest first
    assert.equal(body[0].discoveries.length, samples[0].discoveries.length);
    assert.match(body[0].discoveries[0].id, /^[0-9a-f]{24}$/);
  });
});

describe('front end', () => {
  test('serves index.html and its assets, but not server or archive files', async () => {
    const page = await fetch(`${baseUrl}/`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /<title>Rabbit Tracks<\/title>/);
    assert.match(html, /<meta name="rabbit-tracks-data" content="api">/);
    for (const asset of ['/css/styles.css', '/js/app.js', '/js/api.js', '/js/milestones.js', '/images/favicon.svg']) {
      assert.equal((await fetch(baseUrl + asset)).status, 200, asset);
    }
    for (const hidden of ['/server/package.json', '/server/.env.example', '/archive/README.md', '/README.md']) {
      assert.equal((await fetch(baseUrl + hidden)).status, 404, hidden);
    }
  });
});
