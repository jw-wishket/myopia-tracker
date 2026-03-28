const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds

export function getCachedPatient(id) {
  const entry = cache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(id);
    return null;
  }
  return entry.patient;
}

export function setCachedPatient(id, patient) {
  cache.set(id, { patient, timestamp: Date.now() });
}

export function invalidatePatient(id) {
  cache.delete(id);
}

export function invalidateAll() {
  cache.clear();
}
