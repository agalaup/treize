// Salon privé de Treize : qui est à la table, qui a le droit de jouer, ce que chacun reçoit.
// Fonctions pures, sans réseau. Ce module est fait pour tourner du côté qui fait autorité
// (le serveur) : c'est lui qui garde l'état complet et qui n'envoie à chacun que sa vue.
//
// Un joueur est reconnu par un identifiant secret (`id`) que les autres ne reçoivent jamais.

import { nouvellePartie, jouer, joueurAttendu, vueJoueur } from './treize.js';

export const MIN_JOUEURS = 2;
export const MAX_JOUEURS = 4;
export const LONGUEUR_CODE = 4;
export const LONGUEUR_NOM = 16;

// Sans I, L et O : trop faciles à confondre avec 1 et 0 quand on dicte le code.
const LETTRES = 'ABCDEFGHJKMNPQRSTUVWXYZ';

function refus(message) {
  return new Error('Salon : ' + message);
}

function nettoyerNom(nom, numero) {
  const propre = String(nom ?? '').replace(/\s+/g, ' ').trim().slice(0, LONGUEUR_NOM);
  return propre || 'Joueur ' + numero;
}

function siegeDe(salon, id) {
  return salon.joueurs.findIndex((j) => j.id === id);
}

/** Code de salon à 4 lettres, facile à dicter. */
export function creerCode(rng = Math.random) {
  let code = '';
  for (let i = 0; i < LONGUEUR_CODE; i++) code += LETTRES[Math.floor(rng() * LETTRES.length)];
  return code;
}

/** Vrai si le texte a la forme d'un code de salon. */
export function codeValide(code) {
  return typeof code === 'string' && code.length === LONGUEUR_CODE && [...code].every((l) => LETTRES.includes(l));
}

/** Crée un salon en attente. L'hôte est le premier joueur. */
export function creerSalon(code, hote) {
  if (!codeValide(code)) throw refus('code invalide.');
  if (!hote || typeof hote.id !== 'string' || hote.id === '') throw refus('identifiant manquant.');
  return {
    code,
    phase: 'attente', // 'attente' puis 'partie'
    hote: hote.id,
    joueurs: [{ id: hote.id, nom: nettoyerNom(hote.nom, 1) }],
    etat: null,
  };
}

/** Ajoute un joueur. Rejoindre deux fois avec le même identifiant ne change rien. */
export function rejoindre(salon, joueur) {
  if (!joueur || typeof joueur.id !== 'string' || joueur.id === '') throw refus('identifiant manquant.');
  if (siegeDe(salon, joueur.id) >= 0) return salon;
  if (salon.phase !== 'attente') throw refus('la partie a déjà commencé.');
  if (salon.joueurs.length >= MAX_JOUEURS) throw refus('le salon est complet.');
  const s = structuredClone(salon);
  s.joueurs.push({ id: joueur.id, nom: nettoyerNom(joueur.nom, s.joueurs.length + 1) });
  return s;
}

/** Retire un joueur avant le début. Si l'hôte part, le joueur suivant devient l'hôte. */
export function quitter(salon, id) {
  if (salon.phase !== 'attente') throw refus('impossible de quitter une partie en cours.');
  if (siegeDe(salon, id) < 0) return salon;
  const s = structuredClone(salon);
  s.joueurs = s.joueurs.filter((j) => j.id !== id);
  if (s.hote === id) s.hote = s.joueurs.length ? s.joueurs[0].id : null;
  return s;
}

/** Lance la partie. Seul l'hôte peut le faire, avec 2 à 4 joueurs. Sert aussi à rejouer une partie finie. */
export function demarrer(salon, id, options = {}, rng = Math.random) {
  if (id !== salon.hote) throw refus('seul l’hôte peut lancer la partie.');
  if (salon.phase === 'partie' && salon.etat.phase !== 'fin') throw refus('la partie est en cours.');
  if (salon.joueurs.length < MIN_JOUEURS) throw refus('il faut au moins 2 joueurs.');
  const s = structuredClone(salon);
  s.phase = 'partie';
  s.etat = nouvellePartie(
    { nbJoueurs: s.joueurs.length, defausseVisible: options.defausseVisible !== false },
    rng,
  );
  return s;
}

/**
 * Applique le coup d'un joueur. Refuse le coup s'il ne vient pas du joueur attendu.
 * Les actions communes (retourner une case, manche suivante) sont ouvertes à tous les joueurs du salon.
 */
export function jouerCoup(salon, id, coup, rng = Math.random) {
  if (salon.phase !== 'partie') throw refus('la partie n’a pas commencé.');
  const siege = siegeDe(salon, id);
  if (siege < 0) throw refus('tu n’es pas dans ce salon.');
  const attendu = joueurAttendu(salon.etat);
  if (attendu !== null && attendu !== siege) throw refus('ce n’est pas ton tour.');
  const etat = jouer(salon.etat, coup, rng);
  const s = structuredClone(salon);
  s.etat = etat;
  return s;
}

/**
 * Ce qu'un joueur reçoit : jamais l'état complet, jamais l'identifiant des autres.
 * `id` inconnu : vue d'un spectateur (aucune information privée).
 */
export function vueSalon(salon, id) {
  const siege = siegeDe(salon, id);
  return {
    code: salon.code,
    phase: salon.phase,
    siege,
    siegeHote: siegeDe(salon, salon.hote),
    joueurs: salon.joueurs.map((j) => ({ nom: j.nom })),
    vue: salon.etat ? vueJoueur(salon.etat, siege) : null,
  };
}
