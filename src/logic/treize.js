// Règles de Treize. Fonctions pures : aucun affichage, aucun accès au navigateur.
// Le hasard passe toujours par le paramètre `rng` (fonction qui renvoie un nombre dans [0, 1[),
// pour que les tests et le simulateur puissent rejouer la même partie.
//
// Une carte est un rang de 1 à 13. Sa famille est le numéro du joueur qui la possède.

export const VALEURS_CASES = [1, 1, 2, 3];
export const NB_CASES = VALEURS_CASES.length;
export const NB_MANCHES = 3;
export const TAILLE_MAIN = 6;
export const RANG_MAX = 13;

/** Générateur de hasard reproductible (mulberry32). */
export function creerRng(graine) {
  let a = graine >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Renvoie une copie mélangée de la liste. */
export function melanger(liste, rng = Math.random) {
  const a = liste.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function interdit(message) {
  return new Error('Coup interdit : ' + message);
}

function debutTour(e) {
  const n = e.nbJoueurs;
  if (e.tour >= n * TAILLE_MAIN) {
    debutEchange(e);
    return;
  }
  e.phase = 'pointer';
  e.actif = e.ordre[e.tour % n];
  e.pointeur = e.ordre[(e.tour + 1) % n];
  e.indexPointe = null;
  e.cartePiochee = null;
}

function debutEchange(e) {
  for (let p = 0; p < e.nbJoueurs; p++) e.secretes[p] = e.pioches[p].pop();
  e.phase = 'echange';
  e.echangeIdx = 0;
  e.actif = e.ordre[0];
  e.pointeur = null;
  e.indexPointe = null;
  e.cartePiochee = null;
}

function distribuer(e, rng) {
  const n = e.nbJoueurs;
  e.cases = melanger(VALEURS_CASES, rng).map((valeur) => ({ valeur, visible: false, cartes: [] }));
  e.cases.find((c) => c.valeur === 1).visible = true;
  e.mains = [];
  e.pioches = [];
  e.defausses = [];
  e.secretes = [];
  e.ordre = [];
  for (let p = 0; p < n; p++) {
    const famille = [];
    for (let r = 1; r <= RANG_MAX; r++) famille.push(r);
    const paquet = melanger(famille, rng);
    e.mains.push(paquet.slice(0, TAILLE_MAIN));
    e.pioches.push(paquet.slice(TAILLE_MAIN));
    e.defausses.push([]);
    e.secretes.push(null);
    e.ordre.push((e.premier + p) % n);
  }
  e.tour = 0;
  e.echangeIdx = 0;
  e.revelees = 0;
  e.resultats = [];
  debutTour(e);
}

/**
 * Crée une partie et distribue la première manche.
 * options : { nbJoueurs: 2 à 4, defausseVisible: true ou false }
 */
export function nouvellePartie(options = {}, rng = Math.random) {
  const nbJoueurs = options.nbJoueurs ?? 2;
  if (!Number.isInteger(nbJoueurs) || nbJoueurs < 2 || nbJoueurs > 4) {
    throw new Error('Treize se joue de 2 à 4 joueurs.');
  }
  const e = {
    nbJoueurs,
    defausseVisible: options.defausseVisible ?? true,
    manche: 0,
    premier: 0,
    scores: new Array(nbJoueurs).fill(0),
  };
  distribuer(e, rng);
  return e;
}

/**
 * Résultat d'une case : la plus grosse somme d'une famille gagne.
 * Égalité : la plus haute carte gagne, sinon personne.
 * Renvoie { sommes, gagnant (numéro ou null), departage, egalite, vide }.
 */
export function calculerCase(caseJeu, nbJoueurs) {
  const sommes = new Array(nbJoueurs).fill(0);
  const hautes = new Array(nbJoueurs).fill(0);
  for (const c of caseJeu.cartes) {
    sommes[c.joueur] += c.rang;
    hautes[c.joueur] = Math.max(hautes[c.joueur], c.rang);
  }
  const max = Math.max(...sommes);
  const resultat = { sommes, gagnant: null, departage: false, egalite: false, vide: false };
  if (max === 0) {
    resultat.vide = true;
    return resultat;
  }
  const candidats = [];
  sommes.forEach((s, p) => {
    if (s === max) candidats.push(p);
  });
  if (candidats.length === 1) {
    resultat.gagnant = candidats[0];
    return resultat;
  }
  const maxHaute = Math.max(...candidats.map((p) => hautes[p]));
  const finalistes = candidats.filter((p) => hautes[p] === maxHaute);
  if (finalistes.length === 1) {
    resultat.gagnant = finalistes[0];
    resultat.departage = true;
  } else {
    resultat.egalite = true;
  }
  return resultat;
}

/** Numéro du joueur qui doit jouer, ou null si l'action est commune (révélation, fin). */
export function joueurAttendu(e) {
  if (e.phase === 'pointer') return e.pointeur;
  if (e.phase === 'choisir' || e.phase === 'echange') return e.actif;
  return null;
}

/** Liste de tous les coups autorisés dans l'état donné. */
export function coupsPossibles(e) {
  const coups = [];
  if (e.phase === 'pointer') {
    for (let i = 0; i < e.mains[e.actif].length; i++) coups.push({ type: 'pointer', index: i });
  } else if (e.phase === 'choisir') {
    for (const garde of ['pioche', 'pointee']) {
      for (let c = 0; c < NB_CASES; c++) coups.push({ type: 'poser', garde, case: c });
    }
  } else if (e.phase === 'echange') {
    coups.push({ type: 'passer' });
    e.cases.forEach((caseJeu, c) => {
      caseJeu.cartes.forEach((carte, index) => {
        if (carte.joueur === e.actif) coups.push({ type: 'echanger', case: c, index });
      });
    });
  } else if (e.phase === 'revelation') {
    coups.push({ type: 'reveler' });
  } else if (e.phase === 'finManche') {
    coups.push({ type: 'mancheSuivante' });
  }
  return coups;
}

/**
 * Applique un coup et renvoie le nouvel état. L'état reçu n'est jamais modifié.
 * Lève une erreur si le coup est interdit.
 *
 * Coups :
 *  - phase 'pointer'    : { type: 'pointer', index }            (joué par e.pointeur)
 *  - phase 'choisir'    : { type: 'poser', garde, case }        garde = 'pioche' ou 'pointee'
 *  - phase 'echange'    : { type: 'echanger', case, index } ou { type: 'passer' }
 *  - phase 'revelation' : { type: 'reveler' }                   retourne la case suivante
 *  - phase 'finManche'  : { type: 'mancheSuivante' }            redistribue (utilise rng)
 */
export function jouer(etat, coup, rng = Math.random) {
  const e = structuredClone(etat);
  const n = e.nbJoueurs;
  if (!coup || typeof coup.type !== 'string') throw interdit('coup illisible.');

  if (e.phase === 'pointer') {
    if (coup.type !== 'pointer') throw interdit('il faut pointer une carte.');
    const main = e.mains[e.actif];
    if (!Number.isInteger(coup.index) || coup.index < 0 || coup.index >= main.length) {
      throw interdit('cette carte n’existe pas dans la main.');
    }
    e.indexPointe = coup.index;
    e.cartePiochee = e.pioches[e.actif].pop();
    e.phase = 'choisir';
    return e;
  }

  if (e.phase === 'choisir') {
    if (coup.type !== 'poser') throw interdit('il faut poser une carte.');
    if (coup.garde !== 'pioche' && coup.garde !== 'pointee') {
      throw interdit('il faut garder la pioche ou la carte pointée.');
    }
    if (!Number.isInteger(coup.case) || coup.case < 0 || coup.case >= NB_CASES) {
      throw interdit('cette case n’existe pas.');
    }
    const p = e.actif;
    const pointee = e.mains[p][e.indexPointe];
    const gardee = coup.garde === 'pioche' ? e.cartePiochee : pointee;
    const autre = coup.garde === 'pioche' ? pointee : e.cartePiochee;
    e.mains[p].splice(e.indexPointe, 1);
    e.defausses[p].push(autre);
    e.cases[coup.case].cartes.push({ joueur: p, rang: gardee });
    e.tour++;
    debutTour(e);
    return e;
  }

  if (e.phase === 'echange') {
    const p = e.actif;
    if (coup.type === 'echanger') {
      const caseJeu = Number.isInteger(coup.case) ? e.cases[coup.case] : undefined;
      const carte = caseJeu && Number.isInteger(coup.index) ? caseJeu.cartes[coup.index] : undefined;
      if (!carte || carte.joueur !== p) throw interdit('ce n’est pas une de tes cartes posées.');
      e.defausses[p].push(carte.rang);
      carte.rang = e.secretes[p];
      e.secretes[p] = null;
    } else if (coup.type !== 'passer') {
      throw interdit('il faut échanger ou passer.');
    }
    e.echangeIdx++;
    if (e.echangeIdx >= n) {
      e.phase = 'revelation';
      e.actif = null;
    } else {
      e.actif = e.ordre[e.echangeIdx];
    }
    return e;
  }

  if (e.phase === 'revelation') {
    if (coup.type !== 'reveler') throw interdit('il faut retourner la case suivante.');
    const caseJeu = e.cases[e.revelees];
    const resultat = calculerCase(caseJeu, n);
    e.resultats.push(resultat);
    if (resultat.gagnant !== null) e.scores[resultat.gagnant] += caseJeu.valeur;
    e.revelees++;
    if (e.revelees >= NB_CASES) e.phase = e.manche + 1 >= NB_MANCHES ? 'fin' : 'finManche';
    return e;
  }

  if (e.phase === 'finManche') {
    if (coup.type !== 'mancheSuivante') throw interdit('il faut lancer la manche suivante.');
    e.manche++;
    e.premier = (e.premier + 1) % n;
    distribuer(e, rng);
    return e;
  }

  throw interdit('la partie est terminée.');
}

/** Joueurs en tête au score (plusieurs en cas d'égalité : victoire partagée). */
export function gagnants(e) {
  const max = Math.max(...e.scores);
  const liste = [];
  e.scores.forEach((s, p) => {
    if (s === max) liste.push(p);
  });
  return liste;
}

/**
 * Ce qu'un joueur a le droit de voir. Tout le reste est remplacé par null.
 * C'est la seule porte d'entrée pour montrer l'état à un joueur :
 * le jeu en ligne devra envoyer cette vue, jamais l'état complet.
 * joueur = -1 : vue d'un spectateur (aucune information privée).
 */
export function vueJoueur(etat, joueur) {
  const v = structuredClone(etat);
  for (let p = 0; p < v.nbJoueurs; p++) {
    v.pioches[p] = v.pioches[p].map(() => null);
    if (p !== joueur) {
      v.mains[p] = v.mains[p].map(() => null);
      v.secretes[p] = v.secretes[p] === null ? null : 'cachee';
      if (!v.defausseVisible) v.defausses[p] = v.defausses[p].map(() => null);
    }
  }
  if (v.actif !== joueur) v.cartePiochee = v.cartePiochee === null ? null : 'cachee';
  v.cases.forEach((caseJeu, i) => {
    const retournee = i < v.revelees;
    if (!retournee && !caseJeu.visible) caseJeu.valeur = null;
    if (!retournee) {
      caseJeu.cartes.forEach((carte) => {
        if (carte.joueur !== joueur) carte.rang = null;
      });
    }
  });
  return v;
}
