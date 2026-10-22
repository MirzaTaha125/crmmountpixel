// The page an inquiry was submitted from. Shared by the public API (where it
// comes from the body or the Referer/Origin headers) and the admin forms, so
// both store it in exactly the same shape.

const MAX_LENGTH = 500;

// Trim and cap. Anything that isn't a usable http(s) URL is dropped rather than
// stored, so the CRM never renders a link that can't be clicked — or, worse, a
// `javascript:` string someone posted through the open API.
export function normalizeSourceUrl(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  let parsed;
  try {
    parsed = new URL(s);
  } catch {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  return s.length > MAX_LENGTH ? s.slice(0, MAX_LENGTH) : s;
}
