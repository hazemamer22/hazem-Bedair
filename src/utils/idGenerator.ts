/**
 * Safe, collision-free ID generator for farm entities, batches, and transactions.
 * Combines crypto.randomUUID (where available) with high-entropy timestamp fallbacks.
 */
export function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const entropy = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}-${time}-${entropy}`;
}
