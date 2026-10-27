/* Data access for the `trails` collection.

   Each trail document stores its discoveries in an array, in the order
   they were found. Discoveries never exist outside a trail, so keeping
   them inside it matches how the app reads and changes them.

   MongoDB ids (ObjectId) are turned into plain `id` strings on the way
   out, so the front end gets the same shape as js/sample-data.js. */

import { ObjectId } from 'mongodb';
import { HttpError, validate } from './validation.js';

const pad = (n) => String(n).padStart(2, '0');

// "2026-10-26" in the server's local time zone
export function todayLocal(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/* "2026-10-26T14:05:09" in local time. Used for `updated`, so trails
   changed on the same day still sort newest first. The front end reads
   the first 10 characters as the date. */
export function nowLocal(now = new Date()) {
  return `${todayLocal(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// Malformed ids can't match anything, so they're "not found" rather than a server error
function toObjectId(id, what) {
  if (!ObjectId.isValid(id) || String(new ObjectId(id)) !== id) {
    throw new HttpError(404, `${what} not found.`);
  }
  return new ObjectId(id);
}

function toDiscovery({ _id, ...rest }) {
  return { id: String(_id), ...rest };
}

function toTrail({ _id, discoveries = [], ...rest }) {
  return { id: String(_id), ...rest, discoveries: discoveries.map(toDiscovery) };
}

export function createTrailStore(db) {
  const trails = db.collection('trails');

  async function findTrail(trailId) {
    const doc = await trails.findOne({ _id: toObjectId(trailId, 'Trail') });
    if (!doc) throw new HttpError(404, 'Trail not found.');
    return doc;
  }

  return {
    async listTrails() {
      const docs = await trails.find().sort({ updated: -1 }).toArray();
      return docs.map(toTrail);
    },

    async getTrail(trailId) {
      return toTrail(await findTrail(trailId));
    },

    async createTrail(body) {
      const fields = validate('trail', body);
      const doc = { ...fields, created: todayLocal(), updated: nowLocal(), discoveries: [] };
      const { insertedId } = await trails.insertOne(doc);
      return toTrail({ ...doc, _id: insertedId });
    },

    async updateTrail(trailId, body) {
      const fields = validate('trail', body);
      const doc = await trails.findOneAndUpdate(
        { _id: toObjectId(trailId, 'Trail') },
        { $set: { ...fields, updated: nowLocal() } },
        { returnDocument: 'after' },
      );
      if (!doc) throw new HttpError(404, 'Trail not found.');
      return toTrail(doc);
    },

    async deleteTrail(trailId) {
      const { deletedCount } = await trails.deleteOne({ _id: toObjectId(trailId, 'Trail') });
      if (!deletedCount) throw new HttpError(404, 'Trail not found.');
    },

    // New discoveries always go at the end of the trail and are dated today
    async createDiscovery(trailId, body) {
      const fields = validate('discovery', body);
      const discovery = { _id: new ObjectId(), date: todayLocal(), ...fields };
      const { matchedCount } = await trails.updateOne(
        { _id: toObjectId(trailId, 'Trail') },
        { $push: { discoveries: discovery }, $set: { updated: nowLocal() } },
      );
      if (!matchedCount) throw new HttpError(404, 'Trail not found.');
      return toDiscovery(discovery);
    },

    async updateDiscovery(trailId, discoveryId, body) {
      const fields = validate('discovery', body);
      const trail = await findTrail(trailId);
      const _id = toObjectId(discoveryId, 'Discovery');
      const existing = trail.discoveries.find((d) => d._id.equals(_id));
      if (!existing) throw new HttpError(404, 'Discovery not found.');

      const set = { updated: nowLocal() };
      for (const [field, value] of Object.entries(fields)) set[`discoveries.$.${field}`] = value;
      await trails.updateOne({ _id: trail._id, 'discoveries._id': _id }, { $set: set });
      return toDiscovery({ ...existing, ...fields });
    },

    async deleteDiscovery(trailId, discoveryId) {
      const trailObjectId = toObjectId(trailId, 'Trail');
      const _id = toObjectId(discoveryId, 'Discovery');
      const { matchedCount } = await trails.updateOne(
        { _id: trailObjectId, 'discoveries._id': _id },
        { $pull: { discoveries: { _id } }, $set: { updated: nowLocal() } },
      );
      if (!matchedCount) {
        await findTrail(trailId); // 404 "Trail not found" if that's the problem
        throw new HttpError(404, 'Discovery not found.');
      }
    },
  };
}
