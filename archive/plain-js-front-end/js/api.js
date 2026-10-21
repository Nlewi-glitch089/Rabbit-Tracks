/* =========================================================
   Rabbit Hole Trails — data source

   DATA_SOURCE decides where trails come from:
     'sample' → the temporary sample data store (sample-data.js).
                Saved in this browser only. Use until the API exists.
     'api'    → the Rabbit Hole Trails Express API at API_BASE_URL.
                The endpoints below are the PLANNED API. They don't
                exist yet, so this mode will show an error screen
                until the backend is built.

   Both options have the same functions, and every function returns
   a Promise. When something fails it throws an Error with a
   `status` (HTTP status code, or 0 if the server couldn't be reached).
   ========================================================= */

const DATA_SOURCE = 'sample';
const API_BASE_URL = '/api';


async function request(method, path, body) {
  const options = { method, headers: {} };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(API_BASE_URL + path, options);
  } catch {
    throw Object.assign(new Error('Couldn’t reach the server. Make sure it’s running and try again.'), { status: 0 });
  }

  // 204 No Content (used for deletes)
  if (response.status === 204) return null;

  // The API is expected to send errors as { "error": "message" }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && data.error) || `Request failed (${response.status}).`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return data;
}

const ApiClient = {
  listTrails: () => request('GET', '/trails'),
  getTrail: (trailId) => request('GET', `/trails/${encodeURIComponent(trailId)}`),
  createTrail: (data) => request('POST', '/trails', data),
  updateTrail: (trailId, data) => request('PUT', `/trails/${encodeURIComponent(trailId)}`, data),
  deleteTrail: (trailId) => request('DELETE', `/trails/${encodeURIComponent(trailId)}`),

  createDiscovery: (trailId, data) =>
    request('POST', `/trails/${encodeURIComponent(trailId)}/discoveries`, data),
  updateDiscovery: (trailId, discoveryId, data) =>
    request('PUT', `/trails/${encodeURIComponent(trailId)}/discoveries/${encodeURIComponent(discoveryId)}`, data),
  deleteDiscovery: (trailId, discoveryId) =>
    request('DELETE', `/trails/${encodeURIComponent(trailId)}/discoveries/${encodeURIComponent(discoveryId)}`),
};

// app.js only ever talks to `api`
const api = DATA_SOURCE === 'api' ? ApiClient : SampleStore;
const usingSampleData = DATA_SOURCE !== 'api';
