/* Preview mode: serves the Rabbit Tracks front end at
   http://localhost:PORT with its built-in sample data. No MongoDB,
   no .env, and no API. Changes reset when the page reloads.
   For the full app with saved data, use `npm start` instead. */

import { createPreviewApp } from './src/app.js';

const PORT = Number(process.env.PORT || 3000);

let app;
try {
  app = createPreviewApp();
} catch (error) {
  console.error(`[Rabbit Tracks] Couldn't start the preview: ${error.message}`);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  console.log('[Rabbit Tracks] PREVIEW MODE: sample data only, no database. Changes reset on reload.');
  console.log(`[Rabbit Tracks] Running at http://localhost:${PORT}`);
  console.log('[Rabbit Tracks] For the full app with MongoDB, set MONGODB_URI in server/.env and run npm start.');
});

server.on('error', (error) => {
  console.error(`[Rabbit Tracks] Couldn't start on port ${PORT}: ${error.message}`);
  process.exit(1);
});
