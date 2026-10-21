/* Where the app's data comes from.

   DATA_SOURCE:
     'sample' → the temporary sample store (sampleData.js), saved in this
                browser's localStorage. Use until the API exists.
     'api'    → the Rabbit Trails API at API_BASE_URL. These endpoints are
                PLANNED and don't exist yet, so this mode shows an error
                screen until the backend is built.

   Change the default below, or set VITE_DATA_SOURCE=api when running
   Vite (e.g. in a .env file in the project folder) to switch without editing code.

   Every function returns a Promise. Failures throw an Error with a
   `status` (the HTTP status code, or 0 if the server couldn't be reached). */

import { SampleStore } from './sampleData.js';

const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE || 'sample';
export const API_BASE_URL = '/api';

async function request(method, path, body) {
  const options = { method, headers: {} };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE_URL + path, options);
  } catch (error) {
    console.error(`[api] ${method} ${path} failed to reach the server`, error);
    throw Object.assign(new Error('Couldn’t reach the server. Make sure it’s running, then try again.'), { status: 0 });
  }

  // 204 No Content (deletes)
  if (response.status === 204) return null;

  // The API is expected to send JSON, and errors as { "error": "message" }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // e.g. an HTML page because nothing is answering at /api
    console.error(`[api] ${method} ${path} → ${response.status}, response was not JSON:`, text.slice(0, 200));
    if (response.ok) {
      throw Object.assign(new Error('The server sent back something unexpected. Is the API running?'), { status: response.status });
    }
  }
  if (!response.ok) {
    const message = (data && data.error)
      || (data === null ? `Nothing answered at ${API_BASE_URL}${path} (${response.status}). Is the API running?` : `Request failed (${response.status}).`);
    console.error(`[api] ${method} ${path} → ${response.status}`, data);
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data;
}

const trailPath = (trailId) => `/trails/${encodeURIComponent(trailId)}`;
const discoveryPath = (trailId, discoveryId) =>
  `${trailPath(trailId)}/discoveries/${encodeURIComponent(discoveryId)}`;

const ApiClient = {
  listTrails: () => request('GET', '/trails'),
  getTrail: (trailId) => request('GET', trailPath(trailId)),
  createTrail: (data) => request('POST', '/trails', data),
  updateTrail: (trailId, data) => request('PUT', trailPath(trailId), data),
  deleteTrail: (trailId) => request('DELETE', trailPath(trailId)),

  createDiscovery: (trailId, data) => request('POST', `${trailPath(trailId)}/discoveries`, data),
  updateDiscovery: (trailId, discoveryId, data) => request('PUT', discoveryPath(trailId, discoveryId), data),
  deleteDiscovery: (trailId, discoveryId) => request('DELETE', discoveryPath(trailId, discoveryId)),
};

// Components only ever import `api`
export const api = DATA_SOURCE === 'api' ? ApiClient : SampleStore;
export const usingSampleData = DATA_SOURCE !== 'api';
export { SampleStore };
