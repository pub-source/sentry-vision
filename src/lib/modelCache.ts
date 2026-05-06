// Client-side caching for ML model assets.
// Uses the Cache Storage API to persist the heavy model files
// (COCO-SSD weights ~25 MB, face-api models ~10 MB) on the user's device,
// so subsequent visits load instantly with near-zero network latency.
//
// We install a single fetch interceptor that transparently serves matching
// URLs from cache and refills it on misses. No service worker required.

const CACHE_NAME = 'msd-model-cache-v1';

// Hostnames whose responses we should persistently cache.
const CACHED_HOSTS = [
  'storage.googleapis.com',     // tfhub / coco-ssd weights
  'tfhub.dev',
  'cdn.jsdelivr.net',           // face-api model shards
  'unpkg.com',
];

// Filename hints — only cache actual model artifacts, not arbitrary requests.
const CACHED_HINTS = ['model.json', '.bin', 'manifest.json', '-shard', 'weights'];

function shouldCache(url: string): boolean {
  try {
    const u = new URL(url);
    if (!CACHED_HOSTS.some(h => u.hostname.endsWith(h))) return false;
    return CACHED_HINTS.some(h => u.pathname.includes(h));
  } catch {
    return false;
  }
}

let installed = false;

export function installModelCache(): void {
  if (installed || typeof window === 'undefined') return;
  if (!('caches' in window) || !window.fetch) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url =
      typeof input === 'string' ? input :
      input instanceof URL ? input.toString() :
      input.url;

    if (!shouldCache(url) || (init?.method && init.method.toUpperCase() !== 'GET')) {
      return originalFetch(input, init);
    }

    try {
      const cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(url);
      if (hit) {
        console.log('[ModelCache] HIT', url);
        return hit;
      }
      console.log('[ModelCache] MISS — fetching', url);
      const response = await originalFetch(input, init);
      if (response.ok) {
        // Clone before consuming — body can only be read once.
        try { await cache.put(url, response.clone()); } catch (e) {
          console.warn('[ModelCache] put failed', e);
        }
      }
      return response;
    } catch (err) {
      console.warn('[ModelCache] interceptor error, falling back', err);
      return originalFetch(input, init);
    }
  };

  console.log('[ModelCache] Installed — model assets will be cached locally.');
}

export async function clearModelCache(): Promise<void> {
  if (!('caches' in window)) return;
  await caches.delete(CACHE_NAME);
  console.log('[ModelCache] Cleared.');
}

export async function getModelCacheSize(): Promise<{ entries: number; bytes: number }> {
  if (!('caches' in window)) return { entries: 0, bytes: 0 };
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let bytes = 0;
  for (const req of keys) {
    const res = await cache.match(req);
    if (!res) continue;
    const len = res.headers.get('content-length');
    if (len) bytes += parseInt(len, 10);
    else {
      try {
        const buf = await res.clone().arrayBuffer();
        bytes += buf.byteLength;
      } catch {}
    }
  }
  return { entries: keys.length, bytes };
}