/* The Express app: the JSON API under /api, plus the front end
   (index.html, css/, js/, images/) from the repository root. Serving
   both from one address means the front end needs no CORS setup.

   Errors are always sent as { "error": "message" }:
     400 invalid input or malformed JSON
     404 unknown trail, discovery, or API route
     500 server or database problem (details logged here, not sent) */

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createTrailStore } from './trails.js';
import { HttpError } from './validation.js';

const FRONT_END_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export function createApp(db, { logErrors = true } = {}) {
  const store = createTrailStore(db);
  const app = express();
  app.disable('x-powered-by');

  const api = express.Router();
  api.use(express.json({ limit: '20kb' }));

  // For checking that the API and database are reachable
  api.get('/health', async (req, res) => {
    await db.command({ ping: 1 });
    res.json({ status: 'ok', database: 'connected' });
  });

  api.get('/trails', async (req, res) => {
    res.json(await store.listTrails());
  });
  api.post('/trails', async (req, res) => {
    res.status(201).json(await store.createTrail(req.body));
  });
  api.get('/trails/:trailId', async (req, res) => {
    res.json(await store.getTrail(req.params.trailId));
  });
  api.put('/trails/:trailId', async (req, res) => {
    res.json(await store.updateTrail(req.params.trailId, req.body));
  });
  api.delete('/trails/:trailId', async (req, res) => {
    await store.deleteTrail(req.params.trailId);
    res.status(204).end();
  });

  api.post('/trails/:trailId/discoveries', async (req, res) => {
    res.status(201).json(await store.createDiscovery(req.params.trailId, req.body));
  });
  api.put('/trails/:trailId/discoveries/:discoveryId', async (req, res) => {
    res.json(await store.updateDiscovery(req.params.trailId, req.params.discoveryId, req.body));
  });
  api.delete('/trails/:trailId/discoveries/:discoveryId', async (req, res) => {
    await store.deleteDiscovery(req.params.trailId, req.params.discoveryId);
    res.status(204).end();
  });

  api.use((req, res) => {
    res.status(404).json({ error: `No API route for ${req.method} ${req.baseUrl}${req.path}.` });
  });

  // Express 5 passes errors from async handlers here
  api.use((error, req, res, next) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    // Malformed JSON or a body that's too large, from express.json()
    if (error.type === 'entity.parse.failed') {
      res.status(400).json({ error: 'Request body is not valid JSON.' });
      return;
    }
    if (error.type === 'entity.too.large') {
      res.status(413).json({ error: 'Request body is too large.' });
      return;
    }
    if (logErrors) console.error(`[Rabbit Tracks API] ${req.method} ${req.originalUrl} failed:`, error);
    res.status(500).json({ error: 'The server had a problem. Check the server log for details.' });
  });

  app.use('/api', api);
  app.use(frontEnd('api'));
  return app;
}

/* Preview mode (npm run preview): the same front end with its built-in
   sample data, and no database. There is no API, so /api answers 503
   with an explanation instead of pretending to work. */
export function createPreviewApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (req, res) => {
    res.status(503).json({ error: 'Preview mode has no API or database. Run npm start with MONGODB_URI set to use the API.' });
  });
  app.use(frontEnd('sample'));
  return app;
}

/* index.html, css/, js/, and images/ from the repository root. Only
   these are public (not server/ or archive/). `dataMode` is written
   into index.html's <meta name="rabbit-tracks-data"> so the page uses
   the API ("api") or its sample data ("sample").

   If that tag is missing, the page would quietly fall back to "auto"
   (the API over http), so preview mode would call an API that isn't
   there. The tag is therefore checked when the app is created and on
   every request, and a missing tag is an error, never a silent switch. */
const DATA_MODE_TAG = /<meta\s+name="rabbit-tracks-data"\s+content="[^"]*"\s*\/?>/;
const INDEX_HTML = path.join(FRONT_END_ROOT, 'index.html');

function setDataMode(html, dataMode) {
  if (!DATA_MODE_TAG.test(html)) {
    throw new Error(`${INDEX_HTML} has no <meta name="rabbit-tracks-data" content="…"> tag, `
      + `so the page can't be told to use ${dataMode === 'sample' ? 'sample data' : 'the API'}.`);
  }
  return html.replace(DATA_MODE_TAG, `<meta name="rabbit-tracks-data" content="${dataMode}">`);
}

function frontEnd(dataMode) {
  setDataMode(fsSync.readFileSync(INDEX_HTML, 'utf8'), dataMode); // fail at start-up, not in the browser

  const router = express.Router();
  router.get(['/', '/index.html'], async (req, res, next) => {
    try {
      const html = await fs.readFile(INDEX_HTML, 'utf8');
      res.type('html').set('Cache-Control', 'no-store').send(setDataMode(html, dataMode));
    } catch (error) {
      next(error);
    }
  });
  for (const folder of ['css', 'js', 'images']) {
    router.use(`/${folder}`, express.static(path.join(FRONT_END_ROOT, folder), { fallthrough: false }));
  }
  return router;
}
