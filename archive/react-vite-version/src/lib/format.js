// Small helpers for showing trail data.

// Accepts "2026-10-03" or a full ISO timestamp
function toLocalDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

// "2026-10-03" → "Oct 3, 2026"
export function formatDate(value) {
  return toLocalDate(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// "2026-10-03" → "Oct 3"
export function formatShortDate(value) {
  return toLocalDate(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function daysBetween(from, to) {
  return Math.round((toLocalDate(to) - toLocalDate(from)) / 86400000);
}

// Label for the gap between two steps on a trail. null when it would be misleading
// (e.g. a discovery was moved earlier than one with a later date).
export function gapLabel(from, to) {
  const days = daysBetween(from, to);
  if (days < 0) return null;
  if (days === 0) return 'Same day';
  if (days === 1) return 'Next day';
  return `${days} days later`;
}

// "https://www.unity.com/learn" → "unity.com"
export function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function isWebUrl(value) {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function plural(count, word, pluralWord = word + 's') {
  return `${count} ${count === 1 ? word : pluralWord}`;
}
