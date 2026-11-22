// Arbitre d'un salon en ligne. Il tourne sur l'appareil de l'hôte, sans dépendre du réseau :
// on lui donne les messages reçus, il dit quoi répondre. Testable sans navigateur.
//
// Tout message vient d'un autre appareil : on ne lui fait jamais confiance.
// Le coup est vérifié par le moteur, le nom est nettoyé par le salon.

import { creerSalon, rejoindre, quitter, demarrer, jouerCoup, vueSalon } from '../logic/salon.js';

export const TAILLE_MAX_MESSAGE = 2000;

/**
 * Crée l'arbitre. `hote` = { id, nom }.
 * Renvoie { recevoir(id, message), vuePour(id), ids() }.
 * `recevoir` renvoie { ok: true } si l'état a changé (il faut renvoyer les vues à tous),
 * ou { ok: false, erreur } à renvoyer seulement à l'auteur du message.
 */
export function creerArbitre({ code, hote, rng = Math.random }) {
  let salon = creerSalon(code, hote);

  function appliquer(id, message) {
    switch (message.t) {
      case 'rejoindre':
        return rejoindre(salon, { id, nom: message.nom });
      case 'quitter':
        return quitter(salon, id);
      case 'demarrer':
        return demarrer(salon, id, { defausseVisible: message.defausseVisible !== false }, rng);
      case 'coup':
        return jouerCoup(salon, id, message.coup, rng);
      default:
        throw new Error('Message inconnu.');
    }
  }

  return {
    recevoir(id, message) {
      try {
        if (typeof id !== 'string' || id === '' || id.length > 64) throw new Error('Identifiant invalide.');
        if (!message || typeof message !== 'object' || typeof message.t !== 'string') {
          throw new Error('Message illisible.');
        }
        if (JSON.stringify(message).length > TAILLE_MAX_MESSAGE) throw new Error('Message trop long.');
        salon = appliquer(id, message);
        return { ok: true };
      } catch (err) {
        return { ok: false, erreur: err.message };
      }
    },
    vuePour(id) {
      return vueSalon(salon, id);
    },
    ids() {
      return salon.joueurs.map((j) => j.id);
    },
  };
}
