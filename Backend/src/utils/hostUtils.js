// Shared helpers for turning any URL/host string the admin (or a browser Origin
// header) sends us into a canonical lowercase hostname we can compare on.
//
//   "https://Www.MountPixels.com/contact"  →  "mountpixels.com"
//   "www.mountpixels.com"                  →  "mountpixels.com"
//   "http://localhost:5173"                →  "localhost"
//   "  "                                   →  ""
//
// Anything unparseable returns "". Callers should treat "" as "no match".

export function normalizeHost(input) {
  if (!input) return '';
  const raw = String(input).trim();
  if (!raw) return '';
  try {
    const withProto = raw.includes('://') ? raw : `https://${raw}`;
    const u = new URL(withProto);
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.slice(4);
    return host;
  } catch {
    return '';
  }
}

// Parse whatever the admin put in the Official Websites textarea (newline- or
// comma-separated) into a de-duplicated array of normalized hostnames.
// The frontend posts this as a JSON-encoded array via FormData, so we try
// JSON.parse first before falling back to splitting on whitespace/commas.
export function parseOfficialWebsites(input) {
  if (input === undefined || input === null) return [];
  let list;
  if (Array.isArray(input)) {
    list = input;
  } else {
    const raw = String(input).trim();
    // Try JSON first (frontend sends JSON.stringify'd array via FormData)
    if (raw.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw);
        list = Array.isArray(parsed) ? parsed : [raw];
      } catch {
        list = raw.split(/[\s,;]+/);
      }
    } else {
      list = raw.split(/[\s,;]+/);
    }
  }
  const seen = new Set();
  for (const entry of list) {
    const host = normalizeHost(entry);
    if (host) seen.add(host);
  }
  return Array.from(seen);
}
