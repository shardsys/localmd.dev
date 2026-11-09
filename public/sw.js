// Offline support: hashed assets are cache-first, everything else network-first with a cached fallback.
const CACHE = 'localmd-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const put = async (req, res) => {
  if (res.ok || res.type === 'opaque') (await caches.open(CACHE)).put(req, res.clone())
  return res
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || !req.url.startsWith('http')) return
  const url = new URL(req.url)
  // one cached shell serves every launch URL (the path lives in the hash)
  const key = req.mode === 'navigate' ? '/' : req
  if (url.origin === location.origin && url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.match(key).then((hit) => hit ?? fetch(req).then((res) => put(key, res))))
    return
  }
  e.respondWith(
    fetch(req)
      .then((res) => put(key, res))
      .catch(async () => (await caches.match(key)) ?? Response.error()),
  )
})
