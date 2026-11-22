// Jeu en ligne sans serveur : les appareils se parlent directement (WebRTC, via PeerJS).
// L'appareil de l'hôte fait l'arbitre et garde toutes les cartes ; les invités ne reçoivent que leur vue.
// Limites connues : si l'hôte ferme la page, la partie est perdue ; un hôte qui modifie
// le code de sa page pourrait voir les cartes. Convient entre amis.
//
// La mise en relation passe par le service public de PeerJS. Il ne voit que le code du salon,
// jamais les noms ni les cartes : ceux-ci voyagent directement entre les appareils.

import { Peer } from 'peerjs';
import { creerArbitre } from './arbitre.js';
import { creerCode, codeValide, MAX_JOUEURS } from '../logic/salon.js';

const PREFIXE = 'treize-salon-';
const ESSAIS_CODE = 5;
const MAX_CONNEXIONS = 8;

function idSecret() {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return [...octets].map((o) => o.toString(16).padStart(2, '0')).join('');
}

function ouvrirPeer(id) {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id) : new Peer();
    peer.once('open', () => resolve(peer));
    peer.once('error', (err) => {
      peer.destroy();
      reject(err);
    });
  });
}

/**
 * Crée un salon et attend les invités.
 * options : { nom, surVue(vue), surErreur(message) }
 * Renvoie une session : { code, demarrer({ defausseVisible }), jouer(coup), quitter() }.
 * `surVue` reçoit la vue du salon (voir `vueSalon`) à chaque changement.
 */
export async function hebergerSalon({ nom, surVue, surErreur }) {
  let peer = null;
  let code = '';
  for (let essai = 0; essai < ESSAIS_CODE && !peer; essai++) {
    code = creerCode();
    try {
      peer = await ouvrirPeer(PREFIXE + code);
    } catch (err) {
      if (err.type !== 'unavailable-id') throw new Error('Impossible de créer le salon. Vérifie ta connexion.');
    }
  }
  if (!peer) throw new Error('Impossible de créer le salon. Réessaie.');

  const monId = idSecret();
  const arbitre = creerArbitre({ code, hote: { id: monId, nom } });
  const connexions = new Map(); // connexion -> identifiant secret de l'invité (ou null)

  function diffuser() {
    for (const [conn, id] of connexions) {
      if (id && conn.open) conn.send({ t: 'vue', vue: arbitre.vuePour(id) });
    }
    surVue(arbitre.vuePour(monId));
  }

  function agir(message) {
    const r = arbitre.recevoir(monId, message);
    if (r.ok) diffuser();
    else surErreur(r.erreur);
  }

  peer.on('connection', (conn) => {
    if (connexions.size >= MAX_CONNEXIONS) {
      conn.close();
      return;
    }
    connexions.set(conn, null);
    conn.on('data', (message) => {
      if (!message || typeof message !== 'object') return;
      let id = connexions.get(conn);
      if (!id) {
        // Le premier message doit être « rejoindre » : il fixe l'identité de cette connexion.
        if (message.t !== 'rejoindre' || typeof message.id !== 'string' || message.id === monId) return;
        id = message.id;
      }
      const r = arbitre.recevoir(id, message);
      if (r.ok) {
        connexions.set(conn, id);
        diffuser();
      } else if (conn.open) {
        conn.send({ t: 'erreur', message: r.erreur });
      }
    });
    conn.on('close', () => connexions.delete(conn));
    conn.on('error', () => connexions.delete(conn));
  });
  peer.on('disconnected', () => peer.reconnect());

  surVue(arbitre.vuePour(monId));

  return {
    code,
    demarrer: (options = {}) => agir({ t: 'demarrer', defausseVisible: options.defausseVisible !== false }),
    jouer: (coup) => agir({ t: 'coup', coup }),
    quitter: () => peer.destroy(),
  };
}

/**
 * Rejoint un salon par son code.
 * options : { code, nom, surVue(vue), surErreur(message) }
 * Renvoie une session : { code, jouer(coup), quitter() }. Seul l'hôte peut démarrer.
 */
export async function rejoindreSalon({ code, nom, surVue, surErreur }) {
  const propre = String(code ?? '').trim().toUpperCase();
  if (!codeValide(propre)) throw new Error('Ce code n’est pas valide : 4 lettres.');

  // L'identifiant est gardé le temps de l'onglet : recharger la page permet de revenir à sa place.
  const cle = 'treize-id-' + propre;
  let monId = null;
  try {
    monId = sessionStorage.getItem(cle);
    if (!monId) {
      monId = idSecret();
      sessionStorage.setItem(cle, monId);
    }
  } catch {
    monId = monId || idSecret();
  }

  let peer;
  try {
    peer = await ouvrirPeer(null);
  } catch {
    throw new Error('Impossible de se connecter. Vérifie ta connexion.');
  }

  const conn = peer.connect(PREFIXE + propre, { reliable: true });
  await new Promise((resolve, reject) => {
    const delai = setTimeout(() => reject(new Error('Salon introuvable. Vérifie le code.')), 12000);
    conn.once('open', () => {
      clearTimeout(delai);
      resolve();
    });
    peer.once('error', () => {
      clearTimeout(delai);
      reject(new Error('Salon introuvable. Vérifie le code.'));
    });
  }).catch((err) => {
    peer.destroy();
    throw err;
  });

  let ferme = false;
  conn.on('data', (message) => {
    if (!message || typeof message !== 'object') return;
    if (message.t === 'vue' && message.vue && typeof message.vue === 'object') surVue(message.vue);
    else if (message.t === 'erreur') surErreur(String(message.message ?? '').slice(0, 200));
  });
  conn.on('close', () => {
    if (!ferme) surErreur('Connexion perdue avec l’hôte.');
  });

  conn.send({ t: 'rejoindre', id: monId, nom });

  return {
    code: propre,
    jouer: (coup) => conn.send({ t: 'coup', coup }),
    quitter: () => {
      ferme = true;
      if (conn.open) conn.send({ t: 'quitter' });
      setTimeout(() => peer.destroy(), 200);
    },
  };
}

export { MAX_JOUEURS };
