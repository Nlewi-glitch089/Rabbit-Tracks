/* Adds the four example trails to the database.

     npm run seed            only if the trails collection is empty
     npm run seed -- --reset deletes every trail first, then adds the examples

   The examples are read from js/sample-data.js, so the browser's sample
   data and the seeded database always match. */

import fs from 'node:fs/promises';
import vm from 'node:vm';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../src/db.js';

export async function loadSampleTrails() {
  const file = new URL('../../js/sample-data.js', import.meta.url);
  const code = await fs.readFile(file, 'utf8');
  // sample-data.js is a plain browser script; run it in an empty context and read its constant.
  // The JSON round trip turns the result into ordinary objects from this context.
  return JSON.parse(vm.runInNewContext(`${code}\n;JSON.stringify(SAMPLE_TRAILS)`, {}));
}

export function toDocuments(sampleTrails) {
  return sampleTrails.map(({ id, discoveries, ...trail }) => ({
    ...trail,
    discoveries: discoveries.map(({ id: discoveryId, ...discovery }) => ({ _id: new ObjectId(), ...discovery })),
  }));
}

async function main() {
  const reset = process.argv.includes('--reset');
  const { MONGODB_URI, MONGODB_DB = 'rabbit_trails' } = process.env;
  const { client, db } = await connectToDatabase(MONGODB_URI, MONGODB_DB);
  try {
    const trails = db.collection('trails');
    if (reset) {
      const { deletedCount } = await trails.deleteMany({});
      console.log(`[seed] Deleted ${deletedCount} trail(s).`);
    } else if (await trails.countDocuments() > 0) {
      console.log('[seed] The trails collection already has data, so nothing was added. Use --reset to replace it.');
      return;
    }
    const { insertedCount } = await trails.insertMany(toDocuments(await loadSampleTrails()));
    console.log(`[seed] Added ${insertedCount} example trails to "${MONGODB_DB}".`);
  } finally {
    await client.close();
  }
}

// Only run when called directly (the tests import the helpers above)
if (process.argv[1]?.endsWith('seed.js')) {
  main().catch((error) => {
    console.error(`[seed] ${error.message}`);
    process.exit(1);
  });
}
