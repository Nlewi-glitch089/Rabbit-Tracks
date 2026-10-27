/* Validation for trails and discoveries.
   These are the same rules js/sample-data.js enforces in the browser,
   so the app behaves the same with sample data and with the API. */

// Longest allowed text for each field. The form inputs use the same limits.
export const FIELD_LIMITS = {
  trail: { title: 80, question: 140, description: 300 },
  discovery: { title: 120, url: 2000, highlight: 200, note: 500 },
};

const REQUIRED = {
  trail: ['title', 'question'],
  discovery: ['title', 'url'],
};

// An error the API sends back as { "error": message } with this HTTP status
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/* Returns trimmed values for every known field (unknown fields are
   ignored), or throws a 400 HttpError naming the first problem. */
export function validate(kind, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object.');
  }

  const limits = FIELD_LIMITS[kind];
  const clean = {};
  for (const field of Object.keys(limits)) {
    const value = body[field] ?? '';
    if (typeof value !== 'string') throw new HttpError(400, `${field} must be text.`);
    clean[field] = value.trim();
    if (REQUIRED[kind].includes(field) && !clean[field]) throw new HttpError(400, `${field} is required.`);
    if (clean[field].length > limits[field]) {
      throw new HttpError(400, `${field} must be ${limits[field]} characters or fewer.`);
    }
  }

  if (kind === 'discovery') {
    let protocol = '';
    try { protocol = new URL(clean.url).protocol; } catch { /* handled below */ }
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new HttpError(400, 'url must start with http:// or https://');
    }
  }
  return clean;
}
