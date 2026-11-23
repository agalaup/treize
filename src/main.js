// Point d'entrée : police, styles, puis la table Treize (src/ui/).
import '@fontsource-variable/outfit';
import './style.css';
import { demarrer } from './ui/app.js';

demarrer(document.getElementById('app'));

// Appli installable : le service worker garde une copie du jeu pour l'ouvrir sans réseau.
// Seulement sur le site publié, pas pendant le développement.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
      const pret = await navigator.serviceWorker.ready;
      const urls = [location.href, ...performance.getEntriesByType('resource').map((r) => r.name)];
      pret.active.postMessage({ t: 'garder', urls });
    } catch {
      // Pas de service worker (navigation privée, vieux navigateur) : le jeu marche quand même.
    }
  });
}
