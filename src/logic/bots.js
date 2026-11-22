// Joueurs automatiques de Treize. Fonctions pures.
// Un bot ne reçoit que sa vue (`vueJoueur(etat, joueur)`) : il ne peut pas tricher.

import { coupsPossibles } from './treize.js';

export const NIVEAUX = ['hasard', 'gourmand'];

function auHasard(liste, rng) {
  return liste[Math.floor(rng() * liste.length)];
}

function maSomme(caseJeu, joueur) {
  let s = 0;
  for (const c of caseJeu.cartes) if (c.joueur === joueur) s += c.rang;
  return s;
}

// Une case cachée vaut +1, +2 ou +3 : 2 en moyenne.
const VALEUR_CASE_CACHEE = 2;

// Chance estimée de gagner une case selon mon avance en points (0 = à égalité).
function chance(avance) {
  return 1 / (1 + Math.exp(-avance / 4));
}

function coupGourmand(vue, joueur, rng) {
  if (vue.phase === 'pointer') {
    return auHasard(coupsPossibles(vue), rng);
  }

  if (vue.phase === 'choisir') {
    const pointee = vue.mains[joueur][vue.indexPointe];
    const garde = vue.cartePiochee >= pointee ? 'pioche' : 'pointee';
    const rang = Math.max(vue.cartePiochee, pointee);
    // Pour chaque case : combien cette carte augmente mes chances de la gagner,
    // multiplié par ce que la case rapporte. Les cartes adverses sont cachées :
    // on compte 7 points par carte (la moyenne d'une famille).
    let meilleures = [];
    let meilleurGain = -Infinity;
    vue.cases.forEach((caseJeu, i) => {
      const valeur = caseJeu.valeur === null ? VALEUR_CASE_CACHEE : caseJeu.valeur;
      const moi = maSomme(caseJeu, joueur);
      const nbAdverses = new Array(vue.nbJoueurs).fill(0);
      for (const c of caseJeu.cartes) if (c.joueur !== joueur) nbAdverses[c.joueur]++;
      const rival = Math.max(...nbAdverses) * 7;
      const gain = valeur * (chance(moi + rang - rival) - chance(moi - rival));
      if (gain > meilleurGain + 1e-9) {
        meilleurGain = gain;
        meilleures = [i];
      } else if (Math.abs(gain - meilleurGain) <= 1e-9) {
        meilleures.push(i);
      }
    });
    return { type: 'poser', garde, case: auHasard(meilleures, rng) };
  }

  if (vue.phase === 'echange') {
    const secrete = vue.secretes[joueur];
    let pire = null;
    vue.cases.forEach((caseJeu, c) => {
      caseJeu.cartes.forEach((carte, i) => {
        if (carte.joueur === joueur && (pire === null || carte.rang < pire.rang)) {
          pire = { rang: carte.rang, case: c, index: i };
        }
      });
    });
    if (pire !== null && typeof secrete === 'number' && secrete > pire.rang) {
      return { type: 'echanger', case: pire.case, index: pire.index };
    }
    return { type: 'passer' };
  }

  return coupsPossibles(vue)[0];
}

/**
 * Choisit le coup d'un bot.
 * vue    : résultat de `vueJoueur(etat, joueur)`, jamais l'état complet.
 * joueur : numéro du bot. Il doit être le joueur attendu (`joueurAttendu`).
 * niveau : 'hasard' (coup au hasard) ou 'gourmand' (garde la plus grosse carte, la pose là où elle rapporte le plus).
 * Renvoie un coup accepté par `jouer`.
 */
export function choisirCoup(vue, joueur, niveau = 'gourmand', rng = Math.random) {
  const coups = coupsPossibles(vue);
  if (coups.length === 0) throw new Error('Aucun coup possible pour le bot.');
  if (niveau === 'hasard') return auHasard(coups, rng);
  return coupGourmand(vue, joueur, rng);
}
