/** Small compatibility helpers for Macs that cannot run the newest Safari. */
export function compatibleId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `legacy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
