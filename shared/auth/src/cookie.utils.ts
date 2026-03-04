/**
 * Parses a raw Cookie header string and extracts the value of a named cookie.
 * Uses slice instead of split('=') to correctly handle base64 values with padding.
 */
export function parseCookieHeader(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const match = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}
