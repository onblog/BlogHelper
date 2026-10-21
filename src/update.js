/**
 * Version comparison for the update check.
 *
 * Deliberately tiny: the panel only needs "is the site's version newer than
 * mine", which is a numeric compare of three dot-separated parts.
 */

export function parseVersion(value) {
  return String(value ?? '')
    .trim()
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
}

/** True when `latest` is a strictly newer version than `current`. */
export function isNewer(current, latest) {
  const a = parseVersion(current);
  const b = parseVersion(latest);
  if (b.length === 0 || b.every((part) => part === 0)) return false;

  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (right > left) return true;
    if (right < left) return false;
  }
  return false;
}
