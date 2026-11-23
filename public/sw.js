// Service worker de Treize : garde une copie du jeu pour l'ouvrir sans réseau.
// Réseau d'abord (on a toujours la dernière version), copie gardée en secours.
// Ne touche qu'aux fichiers du jeu lui-même : jamais aux échanges du mode en ligne.

const CACHE = 'treize-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

const duJeu = (url) => url.origin === self.location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname);

// La page envoie la liste des fichiers qu'elle vient de charger : on les garde dès la première visite.
self.addEventListener('message', (ev) => {
  const urls = ev.data && ev.data.t === 'garder' && Array.isArray(ev.data.urls) ? ev.data.urls : [];
  const bonnes = urls.filter((u) => typeof u === 'string' && duJeu(new URL(u, self.location.href)));
  ev.waitUntil(caches.open(CACHE).then((c) => Promise.all(bonnes.map((u) => c.add(u).catch(() => {})))));
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET' || !duJeu(new URL(req.url))) return;
  ev.respondWith(
    fetch(req)
      .then((rep) => {
        if (rep.ok) {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(req, copie));
        }
        return rep;
      })
      .catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((r) => r || Response.error())),
  );
});
