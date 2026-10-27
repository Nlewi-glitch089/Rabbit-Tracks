import { MongoClient } from 'mongodb';

// "mongodb+srv://user:secret@cluster0.example.net/..." → "mongodb+srv://cluster0.example.net",
// so connection problems can be logged without the password
export function describeUri(uri) {
  try {
    const url = new URL(uri);
    return `${url.protocol}//${url.host}`;
  } catch {
    return '(unreadable MONGODB_URI)';
  }
}

/* Connects and checks the database answers, so a wrong URI or a stopped
   database fails at start-up instead of on the first request. */
export async function connectToDatabase(uri, dbName) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set, so the full app can\'t start. '
      + 'To use MongoDB, copy server/.env.example to server/.env and fill it in. '
      + 'To preview the front end with sample data and no database, run: npm run preview');
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    return { client, db };
  } catch (error) {
    await client.close().catch(() => {});
    throw new Error(`Couldn't connect to MongoDB at ${describeUri(uri)} (database "${dbName}"): ${error.message}`);
  }
}
