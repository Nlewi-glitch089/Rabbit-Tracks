/* =========================================================
   Rabbit Tracks — API client

   The same functions as sample-data.js, backed by the Express +
   MongoDB API in server/ (see README). app.js uses this whenever the
   page is served over http(s), for example by `npm start`.

   Every function returns a Promise. On failure it throws an Error with:
     status     the HTTP status, or 0 if the server couldn't be reached
     operation  what was being attempted ("GET /api/trails")
   and logs one diagnostic line to the console. No request bodies are
   logged, since they hold what the user typed.
   ========================================================= */

const API_BASE_URL = 'api';     // relative, so it works wherever the server is mounted
const API_TIMEOUT_MS = 10000;

const apiData = (() => {
  function fail(operation, status, message) {
    console.error(`[Rabbit Tracks] API request failed: ${operation} → ${status || 'no response'}: ${message}`);
    return Object.assign(new Error(message), { status, operation });
  }

  async function request(method, path, body) {
    const operation = `${method} /${API_BASE_URL}${path}`;
    const options = { method, headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(API_TIMEOUT_MS) };
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(API_BASE_URL + path, options);
    } catch (error) {
      throw fail(operation, 0, error.name === 'TimeoutError'
        ? 'The server took too long to answer. Try again in a moment.'
        : 'Couldn’t reach the Rabbit Tracks server. Make sure it’s running (npm start in server/) and try again.');
    }

    if (response.status === 204) return null;

    // The API always answers in JSON. Anything else means this page isn't being served by it.
    const isJson = (response.headers.get('Content-Type') || '').includes('application/json');
    const data = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const message = data && data.error
        ? data.error
        : isJson
          ? `The server answered with an error (${response.status}).`
          : `The Rabbit Tracks API isn’t available at this address (HTTP ${response.status}). Start it with npm start in server/, then open the address it prints.`;
      throw fail(operation, response.status, message);
    }
    if (!isJson) {
      throw fail(operation, response.status, 'The server’s answer wasn’t in the expected format. Is this page being served by the Rabbit Tracks server?');
    }
    return data;
  }

  const trailPath = (trailId) => `/trails/${encodeURIComponent(trailId)}`;
  const discoveryPath = (trailId, discoveryId) =>
    `${trailPath(trailId)}/discoveries/${encodeURIComponent(discoveryId)}`;

  return {
    source: 'api',

    health: () => request('GET', '/health'),

    listTrails: () => request('GET', '/trails'),
    getTrail: (trailId) => request('GET', trailPath(trailId)),
    createTrail: (data) => request('POST', '/trails', data),
    updateTrail: (trailId, data) => request('PUT', trailPath(trailId), data),
    deleteTrail: (trailId) => request('DELETE', trailPath(trailId)),

    createDiscovery: (trailId, data) => request('POST', `${trailPath(trailId)}/discoveries`, data),
    updateDiscovery: (trailId, discoveryId, data) => request('PUT', discoveryPath(trailId, discoveryId), data),
    deleteDiscovery: (trailId, discoveryId) => request('DELETE', discoveryPath(trailId, discoveryId)),
  };
})();
