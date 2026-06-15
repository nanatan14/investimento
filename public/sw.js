// Service worker simples do InvestFolio (suporte offline).
// Estratégia: rede primeiro; se estiver sem internet, usa o que está em cache.
// Assim você sempre vê a versão mais nova quando online, e o app abre offline.
const CACHE = 'investfolio-v1'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  // Só cuida de navegação e recursos do próprio app (mesma origem, GET).
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  e.respondWith(
    fetch(req)
      .then((resp) => {
        const copia = resp.clone()
        caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {})
        return resp
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/')))
  )
})
