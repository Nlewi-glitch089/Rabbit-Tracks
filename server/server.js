/* Starts Rabbit Tracks: connects to MongoDB, then serves the API and
   the front end at http://localhost:PORT.

   Settings come from environment variables (see .env.example):
     MONGODB_URI  required
     MONGODB_DB   database name, default "rabbit_trails"
     PORT         default 3000 */

import { createApp } from './src/app.js';
import { connectToDatabase, describeUri } from './src/db.js';

const { MONGODB_URI, MONGODB_DB = 'rabbit_trails', PORT = '3000' } = process.env;

let connection;
try {
  connection = await connectToDatabase(MONGODB_URI, MONGODB_DB);
} catch (error) {
  // No fallback to sample data here: the full app only runs with a working database
  console.error(`[Rabbit Tracks] ${error.message}`);
  if (MONGODB_URI) console.error('[Rabbit Tracks] Check MONGODB_URI in server/.env and that the database is running. To preview without a database: npm run preview');
  process.exit(1);
}

const server = createApp(connection.db).listen(Number(PORT), () => {
  console.log(`[Rabbit Tracks] Connected to ${describeUri(MONGODB_URI)}, database "${MONGODB_DB}"`);
  console.log(`[Rabbit Tracks] Running at http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error(`[Rabbit Tracks] Couldn't start on port ${PORT}: ${error.message}`);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close();
    connection.client.close().finally(() => process.exit(0));
  });
}
