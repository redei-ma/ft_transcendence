/**
 * Returns the Authorization header for internal service-to-service HTTP calls.
 * Must be spread into the headers of any request to an internal endpoint.
 *
 * Usage:
 *   const response = await fetch(url, {
 *     headers: { 'Content-Type': 'application/json', ...getInternalHeaders() },
 *   });
 */
export function getInternalHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_SERVICE_SECRET;
  if (!secret) throw new Error('INTERNAL_SERVICE_SECRET is not set');
  return { Authorization: secret };
}
