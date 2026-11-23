// Affichage de Treize. Aucune règle ici : l'état ne change que par `jouer`,
// et on dessine toujours depuis `vueJoueur(etat, joueur)`.
import {
  nouvellePartie,
  jouer,
  joueurAttendu,
  vueJoueur,
  gagnants,
  coupsPossibles,
  NB_MANCHES,
} from '../logic/treize.js';
import { LONGUEUR_NOM, LONGUEUR_CODE } from '../logic/salon.js';
import { hebergerSalon, rejoindreSalon } from '../net/p2p.js';
import { choisirCoup } from '../logic/bots.js';
import { esc, forme, carte, logo, FAMILLES } from './cartes.js';
import { ecranRegles } from './regles.js';

import { lirePartie, ecrirePartie, effacerPartie } from './sauvegarde.js';
const DELAI_BOT = 900;
const NOMS_PAR_DEFAUT = ['Toi', 'Léa', 'Sam', 'Noa'];

// Réglages de l'accueil
const cfg = {
  n: 2,
  noms: NOMS_PAR_DEFAUT.slice(),
  types: ['humain', 'bot', 'bot', 'bot'],
  defausseVisible: true,
  monNom: '',
  code: '',
};

// Jeu en ligne : null en mode local. Sinon { id, v (dernière vue du salon), session, envoi, perdu, minuteur }
let enligne = null;
let compteurSession = 0;
let enCours = false; // connexion en train de s'établir
let erreurEnLigne = false; // l'erreur affichée vient du mode en ligne (accueil)

// État de l'affichage
let racine = null;
let ecran = 'accueil'; // 'accueil' | 'salle' | 'table' | 'regles'
let ecranAvantRegles = 'accueil';
let etat = null; // état du moteur : jamais modifié ici, seulement remplacé par `jouer`
let tient = -1; // humain qui tient l'appareil (plusieurs humains)
let sel = { garde: null, caseSel: null, ech: null };
let erreur = '';
let minuteur = null;
let jeton = 0;
let nouveau = null; // dernière carte posée : { case, index, joueur } (pour l'animation)
let retournee = null; // dernière case retournée (pour l'animation)
let scoresAvant = null;

const reduit = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Aides ----------
const nomBrut = (p) => (enligne && enligne.v ? String((enligne.v.joueurs[p] || {}).nom ?? 'Joueur') : cfg.noms[p]);
const nom = (p) => esc(nomBrut(p));
const estBot = (p) => !enligne && cfg.types[p] === 'bot';
const estHumain = (p) => !!enligne || cfg.types[p] === 'humain';
const humains = () => {
  const h = [];
  for (let p = 0; p < cfg.n; p++) if (estHumain(p)) h.push(p);
  return h;
};
const reinitSel = () => {
  sel = { garde: null, caseSel: null, ech: null };
};

/** Un seul humain : sa vue, toujours. Plusieurs : passe-l'appareil. */
function porteVers() {
  if (!etat || humains().length < 2) return null;
  const att = joueurAttendu(etat);
  if (att !== null && estHumain(att) && att !== tient) return att;
  return null;
}

function viewerDe(porte) {
  const h = humains();
  if (h.length === 1) return h[0];
  if (h.length === 0) return -1;
  if (porte !== null) return -1;
  const att = joueurAttendu(etat);
  if (att === null) return -1;
  if (estHumain(att)) return att;
  // Plusieurs humains regardent pendant qu'un bot joue : vue spectateur, rien de privé.
  return -1;
}

function siegeBas(viewer) {
  if (viewer >= 0) return viewer;
  if (tient >= 0) return tient;
  const h = humains();
  return h.length ? h[0] : 0;
}

// ---------- Jeu ----------
function nouvelle() {
  clearTimeout(minuteur);
  jeton++;
  etat = nouvellePartie({ nbJoueurs: cfg.n, defausseVisible: cfg.defausseVisible });
  const h = humains();
  tient = h.length ? h[0] : -1;
  reinitSel();
  erreur = '';
  nouveau = null;
  retournee = null;
  scoresAvant = new Array(cfg.n).fill(0);
  ecran = 'table';
  ecrirePartie(cfg, etat);
}

/** Reprend la partie sauvegardée sur cet appareil. */
function reprendre() {
  const s = lirePartie();
  if (!s) return false;
  clearTimeout(minuteur);
  jeton++;
  cfg.n = s.cfg.n;
  cfg.noms = s.cfg.noms.slice();
  cfg.types = s.cfg.types.slice();
  cfg.defausseVisible = !!s.cfg.defausseVisible;
  etat = s.etat;
  const h = humains();
  // Plusieurs humains : personne ne tient l'appareil, l'écran de passage cache les cartes.
  tient = h.length === 1 ? h[0] : -1;
  reinitSel();
  erreur = '';
  nouveau = null;
  retournee = null;
  scoresAvant = etat.scores.slice();
  ecran = 'table';
  return true;
}

function appliquer(coup) {
  const avant = etat;
  try {
    etat = jouer(etat, coup);
  } catch (err) {
    erreur = err.message;
    rendre();
    return;
  }
  erreur = '';
  ecrirePartie(cfg, etat);
  reinitSel();
  nouveau = null;
  retournee = null;
  if (coup.type === 'poser') {
    const c = coup.case;
    const apres = etat.cases[c].cartes;
    if (apres.length > avant.cases[c].cartes.length) {
      nouveau = { case: c, index: apres.length - 1, joueur: avant.actif };
    }
  } else if (coup.type === 'reveler') {
    retournee = avant.revelees;
  }
  rendre();
}

function planifierBot() {
  clearTimeout(minuteur);
  jeton++;
  if (ecran !== 'table' || !etat || porteVers() !== null) return;
  const att = joueurAttendu(etat);
  if (att === null || !estBot(att)) return;
  const mon = jeton;
  minuteur = setTimeout(() => {
    if (mon !== jeton || ecran !== 'table') return;
    let coup;
    try {
      coup = choisirCoup(vueJoueur(etat, att), att, 'gourmand');
    } catch (err) {
      erreur = err.message;
      rendre();
      return;
    }
    appliquer(coup);
  }, DELAI_BOT);
}

// ---------- Accueil ----------
function rendreAccueil() {
  let h = '<main class="accueil">' + logo();
  h += '<p class="slogan">Pose tes cartes sur les bonnes cases.</p>';
  h += '<section class="panneau"><h2>Joueurs</h2>';
  h += '<div class="segment" role="group" aria-label="Nombre de joueurs">';
  for (let n = 2; n <= 4; n++) {
    h += '<button type="button" data-a="nb" data-n="' + n + '" aria-pressed="' + (cfg.n === n) + '">' + n + '</button>';
  }
  h += '</div><ul class="sieges">';
  for (let p = 0; p < cfg.n; p++) {
    h +=
      '<li class="siege">' + forme(p, 'grande') +
      '<label class="sr-only" for="nom' + p + '">Nom du joueur ' + (p + 1) + ' (' + FAMILLES[p].couleur + ', ' + FAMILLES[p].forme + ')</label>' +
      '<input id="nom' + p + '" class="champ" data-a="nom" data-i="' + p + '" maxlength="14" autocomplete="off" value="' + esc(cfg.noms[p]) + '">' +
      '<div class="segment petit" role="group" aria-label="Type du joueur ' + (p + 1) + '">' +
      '<button type="button" data-a="type" data-i="' + p + '" data-t="humain" aria-pressed="' + estHumain(p) + '">Humain</button>' +
      '<button type="button" data-a="type" data-i="' + p + '" data-t="bot" aria-pressed="' + estBot(p) + '">Bot</button>' +
      '</div></li>';
  }
  h += '</ul></section>';
  h += '<section class="panneau"><h2>Défausse</h2><div class="segment" role="group" aria-label="Défausse">';
  h += '<button type="button" data-a="defausse" data-v="1" aria-pressed="' + cfg.defausseVisible + '">Visible</button>';
  h += '<button type="button" data-a="defausse" data-v="0" aria-pressed="' + !cfg.defausseVisible + '">Cachée</button>';
  h += '</div></section>';
  h += '<p class="erreur" role="alert">' + (erreurEnLigne ? '' : esc(erreur)) + '</p>';
  h += '<div class="actions">';
  if (lirePartie()) h += '<button type="button" class="bouton primaire grand-bouton" data-a="reprendre">Reprendre la partie</button>';
  h += lirePartie()
    ? '<button type="button" class="bouton" data-a="jouer">Nouvelle partie</button>'
    : '<button type="button" class="bouton primaire grand-bouton" data-a="jouer">Jouer</button>';
  h += '<button type="button" class="bouton" data-a="regles">Règles</button></div>';
  const bloque = enCours ? ' disabled' : '';
  h += '<section class="panneau en-ligne"><h2>En ligne, entre amis</h2>';
  h += '<label class="etiq" for="monnom">Ton nom</label>';
  h += '<input id="monnom" class="champ" data-a="monnom" maxlength="' + LONGUEUR_NOM + '" autocomplete="off" placeholder="Ton nom" value="' + esc(cfg.monNom) + '">';
  h += '<button type="button" class="bouton primaire grand-bouton" data-a="creer"' + bloque + '>' + (enCours ? 'Connexion…' : 'Créer un salon') + '</button>';
  h += '<div class="rejoindre"><label class="sr-only" for="code">Code du salon (4 lettres)</label>';
  h += '<input id="code" class="champ champ-code" data-a="code" maxlength="' + LONGUEUR_CODE + '" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CODE" value="' + esc(cfg.code) + '">';
  h += '<button type="button" class="bouton" data-a="rejoindre"' + bloque + '>Rejoindre un salon</button></div>';
  h += '<p class="erreur" role="alert">' + (erreurEnLigne ? esc(erreur) : '') + '</p></section></main>';
  return h;
}

// ---------- Salle d'attente ----------
function rendreSalle() {
  const s = enligne.v;
  const hote = s.siege === s.siegeHote;
  const lettres = String(s.code).split('');
  let h = '<main class="salle"><section class="panneau centre"><h1 class="titre-salle">Salon</h1>';
  h += '<p class="aide">Donne ce code à tes amis</p>';
  h += '<p class="code" aria-label="Code du salon : ' + esc(lettres.join(', ')) + '">' + lettres.map((l) => '<span aria-hidden="true">' + esc(l) + '</span>').join('') + '</p></section>';
  h += '<section class="panneau"><h2>Joueurs (' + s.joueurs.length + ' sur 4)</h2><ul class="joueurs-salle">';
  s.joueurs.forEach((j, p) => {
    h += '<li class="joueur-salle">' + forme(p, 'grande') + '<span class="detail"><strong class="nom">' + esc(j.nom) + '</strong>' +
      '<small>' + FAMILLES[p].couleur + ', ' + FAMILLES[p].forme + '</small></span>' +
      (p === s.siege ? '<span class="type">Toi</span>' : '') + (p === s.siegeHote ? '<span class="role">Hôte</span>' : '') + '</li>';
  });
  h += '</ul></section>';
  if (hote) {
    h += '<section class="panneau"><h2>Défausse</h2><div class="segment" role="group" aria-label="Défausse">';
    h += '<button type="button" data-a="defausse" data-v="1" aria-pressed="' + cfg.defausseVisible + '">Visible</button>';
    h += '<button type="button" data-a="defausse" data-v="0" aria-pressed="' + !cfg.defausseVisible + '">Cachée</button></div></section>';
  }
  h += '<p class="erreur" role="alert">' + esc(erreur) + '</p>';
  h += '<div class="actions">';
  if (hote) {
    h += '<button type="button" class="bouton primaire grand-bouton" data-a="lancer"' + (s.joueurs.length < 2 ? ' disabled' : '') + '>Lancer la partie</button>';
  } else {
    h += '<p class="attente" role="status">En attente de l’hôte…</p>';
  }
  h += '<button type="button" class="bouton grand-bouton" data-a="quitter-salon">Quitter le salon</button></div></main>';
  return h + boitePerdue();
}

function boitePerdue() {
  if (!enligne || !enligne.perdu) return '';
  return '<div class="porte" role="alertdialog" aria-modal="true" aria-labelledby="titre-perdu"><div class="porte-boite">' +
    '<h2 id="titre-perdu">Connexion perdue</h2><p>' + esc(erreur) + '</p>' +
    '<button type="button" class="bouton primaire grand-bouton" data-a="quitter-salon">Retour à l’accueil</button></div></div>';
}

// ---------- Table ----------
function etiquetteRole(v, p) {
  if (v.phase === 'pointer') {
    if (p === v.pointeur) return 'Pointe';
    if (p === v.actif) return 'Joue';
  } else if (v.phase === 'choisir' && p === v.actif) return 'Joue';
  else if (v.phase === 'echange' && p === v.actif) return 'Échange';
  return '';
}

function puces(v, p) {
  if (!v.defausseVisible || !v.defausses[p].length) return '';
  return (
    '<span class="puces" aria-label="Cartes défaussées">' +
    v.defausses[p].map((r) => carte(r, p, { cls: 'puce' })).join('') +
    '</span>'
  );
}

function bandeau(v, p, moi) {
  const role = etiquetteRole(v, p);
  const bump = scoresAvant && v.scores[p] > scoresAvant[p];
  return (
    '<section class="bandeau' + (moi ? ' moi' : '') + (role ? ' actif' : '') + '" data-seat="' + p + '" aria-label="' + nom(p) + '">' +
    '<div class="ident">' + forme(p, 'moyenne') + '<strong class="nom">' + nom(p) + '</strong>' +
    (estBot(p) ? '<span class="type">Bot</span>' : '') +
    (role ? '<span class="role">' + role + '</span>' : '') + '</div>' +
    '<div class="chiffres"><span>Score <b class="' + (bump ? 'bump' : '') + '">' + v.scores[p] + '</b></span>' +
    '<span>Main <b>' + v.mains[p].length + '</b></span>' +
    '<span>Pioche <b>' + v.pioches[p].length + '</b></span>' +
    '<span>Défausse <b>' + v.defausses[p].length + '</b></span></div>' +
    puces(v, p) + '</section>'
  );
}

function enTete(v) {
  let h = '<header class="haut"><h1 class="manche">Manche ' + (v.manche + 1) + ' sur ' + NB_MANCHES + '</h1><ul class="scores">';
  for (let p = 0; p < v.nbJoueurs; p++) {
    const bump = scoresAvant && v.scores[p] > scoresAvant[p];
    h += '<li class="score">' + forme(p) + '<span>' + nom(p) + '</span><b class="' + (bump ? 'bump' : '') + '">' + v.scores[p] + '</b></li>';
  }
  h += '</ul><div class="outils"><button type="button" class="bouton petit" data-a="regles">Règles</button>';
  h += '<button type="button" class="bouton petit" data-a="' + (enligne ? 'quitter-salon' : 'quitter') + '">Quitter</button></div></header>';
  return h;
}

function valeurCase(c, revelee) {
  if (c.valeur === null) return '<span class="valeur vq' + '">+?</span>';
  return '<span class="valeur v' + c.valeur + (revelee ? ' retourne' : '') + '">+' + c.valeur + '</span>';
}

function caseHtml(v, ci, ctx) {
  const c = v.cases[ci];
  const revelee = ci < v.revelees;
  const r = v.resultats[ci];
  const choisie = ctx.peutCase && sel.caseSel === ci;
  const flip = retournee === ci;
  let h =
    '<article class="case' + (choisie ? ' choisie' : '') + (flip ? ' flip' : '') + '" data-case="' + ci + '">';
  const tete =
    '<span class="case-nom">Case ' + (ci + 1) + (choisie ? ' <em class="badge">choisie</em>' : '') + '</span>' + valeurCase(c, flip);
  h += ctx.peutCase
    ? '<button type="button" class="case-tete" data-a="case" data-i="' + ci + '" aria-pressed="' + choisie + '" aria-label="Poser sur la case ' + (ci + 1) + '">' + tete + '</button>'
    : '<div class="case-tete">' + tete + '</div>';

  let aDesCartes = false;
  for (let p = 0; p < v.nbJoueurs; p++) {
    const liste = [];
    c.cartes.forEach((x, idx) => {
      if (x.joueur === p) liste.push({ x, idx });
    });
    if (!liste.length) continue;
    aDesCartes = true;
    const gagnant = revelee && r && r.gagnant === p;
    const echangeable = liste.some((l) => ctx.echangeables.has(ci + ':' + l.idx));
    h += '<div class="groupe' + (gagnant ? ' gagnant' : '') + (echangeable ? ' ech' : '') + '">';
    h += '<span class="qui" title="' + nom(p) + '">' + forme(p) + '<span class="sr-only">' + nom(p) + '</span></span>';
    h += '<span class="pile' + (liste.some((l) => l.x.rang !== null) ? ' ouvert' : '') + '">';
    for (const { x, idx } of liste) {
      const estNouveau = nouveau && nouveau.case === ci && nouveau.index === idx;
      const attrs = estNouveau ? 'data-nouveau="1"' : '';
      if (ctx.echangeables.has(ci + ':' + idx)) {
        const on = sel.ech && sel.ech.case === ci && sel.ech.index === idx;
        h += carte(x.rang, p, {
          bouton: true, cls: 'mini' + (on ? ' choix' : ''),
          attrs: 'data-a="echanger" data-case="' + ci + '" data-index="' + idx + '" aria-pressed="' + !!on + '" ' + attrs,
          label: 'Échanger la carte ' + x.rang + ' ' + FAMILLES[p].couleur,
        });
      } else {
        h += carte(x.rang, p, { cls: 'mini', attrs });
      }
    }
    h += '</span>';
    if (revelee && r) {
      h += '<span class="info somme">= <b>' + r.sommes[p] + '</b>' + (gagnant ? ' <em class="badge fort">gagne</em>' : '') + '</span>';
    } else {
      h += '<span class="info">' + liste.length + (liste.length > 1 ? ' cartes' : ' carte') + '</span>';
    }
    h += '</div>';
  }
  if (!aDesCartes) h += '<p class="vide">Aucune carte</p>';
  if (revelee && r) {
    if (r.gagnant !== null) {
      h += '<p class="verdict gagne"><span class="qui">' + forme(r.gagnant) + '</span> ' + nom(r.gagnant) + ' gagne +' + c.valeur + (r.departage ? ' <small>(plus haute carte)</small>' : '') + '</p>';
    } else {
      h += '<p class="verdict">' + (r.vide ? 'Case vide' : 'Égalité : personne ne marque') + '</p>';
    }
  }
  return h + '</article>';
}

function eventail(v, bas, ctx) {
  const main = v.mains[bas];
  const n = main.length;
  const enChoix = v.phase === 'choisir' && v.actif === bas;
  let h = '<div class="eventail" data-seat-main="' + bas + '">';
  main.forEach((r, i) => {
    const mil = (n - 1) / 2;
    const rot = (i - mil) * 5;
    const dy = Math.pow(i - mil, 2) * 1.6;
    const style = '--rot:' + rot.toFixed(1) + 'deg;--dy:' + dy.toFixed(1) + 'px';
    if (enChoix && i === v.indexPointe) {
      const on = sel.garde === 'pointee';
      const off = sel.garde === 'pioche';
      const cls = 'pointee' + (on ? ' garde' : '') + (off ? ' rejete' : '');
      const badge = '<span class="etiquette">' + (on ? 'Je garde' : off ? 'Défausse' : 'Pointée') + '</span>';
      h += '<span class="slot">' + badge + carte(r, bas, ctx.peutGarder
        ? { bouton: true, cls, style, attrs: 'data-a="garde" data-garde="pointee" aria-pressed="' + on + '"', label: (r === null ? 'carte cachée' : r + ' ' + FAMILLES[bas].couleur) + ', carte pointée : garder' }
        : { cls, style, label: r === null ? 'carte pointée cachée' : r + ' ' + FAMILLES[bas].couleur + ', carte pointée' }) + '</span>';
    } else {
      h += carte(r, bas, { style });
    }
  });
  if (enChoix && v.cartePiochee !== null) {
    const on = sel.garde === 'pioche';
    const off = sel.garde === 'pointee';
    const cls = 'piochee' + (on ? ' garde' : '') + (off ? ' rejete' : '');
    const badge = '<span class="etiquette">' + (on ? 'Je garde' : off ? 'Défausse' : 'Piochée') + '</span>';
    h += '<span class="slot apart">' + badge + carte(v.cartePiochee, bas, ctx.peutGarder
      ? { bouton: true, cls, attrs: 'data-a="garde" data-garde="pioche" aria-pressed="' + on + '"', label: (v.cartePiochee === 'cachee' ? 'carte cachée' : v.cartePiochee + ' ' + FAMILLES[bas].couleur) + ', carte piochée : garder' }
      : { cls, label: v.cartePiochee === 'cachee' ? 'carte piochée cachée' : v.cartePiochee + ' ' + FAMILLES[bas].couleur + ', carte piochée' }) + '</span>';
  }
  return h + '</div>';
}

function consigne(v, ctx) {
  const att = ctx.att;
  if (erreur) return esc(erreur);
  switch (v.phase) {
    case 'pointer':
      if (ctx.humainJoue) return 'Pointe une carte de la main de ' + nom(v.actif);
      return nom(v.pointeur) + ' pointe une carte de la main de ' + nom(v.actif) + '…';
    case 'choisir':
      if (ctx.humainJoue) {
        if (!sel.garde && sel.caseSel === null) return 'Garde une carte, puis choisis une case';
        if (!sel.garde) return 'Garde une carte : la pointée ou la piochée';
        if (sel.caseSel === null) return 'Choisis une case pour ta carte';
        return 'Confirme ton coup';
      }
      return nom(att) + ' choisit sa carte et sa case…';
    case 'echange':
      if (ctx.humainJoue) return 'Dernier échange : touche une de tes cartes posées pour la remplacer par ta carte secrète, ou passe';
      return nom(att) + ' décide de son dernier échange…';
    case 'revelation':
      return v.revelees === 0 ? 'Tout le monde a joué. Retourne les cases une par une.' : 'Retourne la case ' + (v.revelees + 1);
    case 'finManche':
      return 'Manche terminée. Les scores sont à jour.';
    case 'fin': {
      const g = gagnants(v);
      return g.length === 1 ? 'Victoire de ' + nom(g[0]) : 'Victoire partagée : ' + g.map(nom).join(' et ');
    }
  }
  return '';
}

function zoneAction(v, ctx) {
  let h = '';
  if (v.phase === 'pointer' && ctx.humainJoue) {
    h += '<section class="zone"><h2>Main de ' + nom(v.actif) + '</h2><div class="dos-rangee">';
    v.mains[v.actif].forEach((_, i) => {
      h += ctx.pointables.has(i)
        ? carte(null, v.actif, {
            bouton: true, cls: 'pointable',
            attrs: 'data-a="pointer" data-index="' + i + '"',
            label: 'Pointer la carte cachée ' + (i + 1) + ' de ' + nomBrut(v.actif),
          })
        : carte(null, v.actif, { cls: 'pointable' });
    });
    h += '</div></section>';
  } else if (v.phase === 'choisir' && ctx.humainJoue) {
    const pret = sel.garde && sel.caseSel !== null;
    h += '<div class="actions"><button type="button" class="bouton primaire grand-bouton" data-a="valider"' + (pret ? '' : ' disabled') + '>Confirmer</button></div>';
  } else if (v.phase === 'echange' && ctx.humainJoue) {
    const secrete = v.secretes[ctx.bas];
    h += '<section class="zone secrete"><h2>Ta carte secrète</h2><div class="dos-rangee">' + carte(secrete, ctx.bas, { cls: 'moyenne' }) + '</div></section>';
    h += '<div class="actions"><button type="button" class="bouton primaire grand-bouton" data-a="valider"' + (sel.ech ? '' : ' disabled') + '>Échanger</button>';
    h += '<button type="button" class="bouton grand-bouton" data-a="passer">Passer</button></div>';
  } else if (v.phase === 'revelation') {
    h += '<div class="actions"><button type="button" class="bouton primaire grand-bouton" data-a="reveler">Retourner la case ' + (v.revelees + 1) + '</button></div>';
  } else if (v.phase === 'finManche') {
    h += '<div class="actions"><button type="button" class="bouton primaire grand-bouton" data-a="suivante">Manche suivante</button></div>';
  } else if (v.phase === 'fin') {
    const g = gagnants(v);
    h += '<section class="zone victoire"><h2>' + (g.length === 1 ? 'Victoire de ' + nom(g[0]) : 'Victoire partagée') + '</h2>';
    h += '<p class="gagnants">' + g.map((p) => forme(p, 'grande') + ' <strong>' + nom(p) + '</strong>').join(' ') + '</p>';
    h += '<ul class="final">' + v.scores.map((s, p) => '<li>' + forme(p) + ' ' + nom(p) + ' <b>' + s + '</b></li>').join('') + '</ul></section>';
    h += '<div class="actions">';
    if (!enligne) {
      h += '<button type="button" class="bouton primaire grand-bouton" data-a="rejouer">Rejouer</button>';
      h += '<button type="button" class="bouton grand-bouton" data-a="quitter">Accueil</button>';
    } else {
      if (ctx.hote) h += '<button type="button" class="bouton primaire grand-bouton" data-a="rejouer">Rejouer</button>';
      else h += '<p class="attente" role="status">En attente de l’hôte…</p>';
      h += '<button type="button" class="bouton grand-bouton" data-a="quitter-salon">Quitter le salon</button>';
    }
    h += '</div>';
  }
  return h;
}

function rendreTable() {
  // En ligne : la vue vient du salon, vue du siège. En local : vueJoueur(etat, viewer).
  const porte = enligne ? null : porteVers();
  const viewer = enligne ? enligne.v.siege : viewerDe(porte);
  const v = enligne ? enligne.v.vue : vueJoueur(etat, viewer);
  const bas = enligne ? viewer : siegeBas(viewer);
  const att = joueurAttendu(v);
  const humainJoue = porte === null && att !== null && estHumain(att) && att === viewer;
  // Ce qui est jouable vient du moteur, pas de l'affichage.
  const coups = humainJoue ? coupsPossibles(v) : [];
  const ctx = {
    att, bas, humainJoue,
    hote: !!enligne && enligne.v.siege === enligne.v.siegeHote,
    peutCase: coups.some((c) => c.type === 'poser'),
    peutGarder: coups.some((c) => c.type === 'poser'),
    pointables: new Set(coups.filter((c) => c.type === 'pointer').map((c) => c.index)),
    echangeables: new Set(coups.filter((c) => c.type === 'echanger').map((c) => c.case + ':' + c.index)),
  };
  const autres = [];
  for (let p = 0; p < v.nbJoueurs; p++) if (p !== bas) autres.push(p);

  const perdu = !!enligne && enligne.perdu;
  let h = '<div class="table"' + (porte !== null || perdu ? ' inert aria-hidden="true"' : '') + '>';
  h += enTete(v);
  h += '<div class="adversaires">' + autres.map((p) => bandeau(v, p, false)).join('') + '</div>';
  h += '<p class="consigne" role="status" aria-live="polite">' + consigne(v, ctx) + '</p>';
  h += '<section class="plateau" aria-label="Les quatre cases">';
  for (let i = 0; i < v.cases.length; i++) h += caseHtml(v, i, ctx);
  h += '</section>';
  h += zoneAction(v, ctx);
  h += '<section class="ma-zone">' + bandeau(v, bas, true) + eventail(v, bas, ctx) + '</section>';
  h += '</div>';

  if (porte !== null) {
    h +=
      '<div class="porte" role="dialog" aria-modal="true" aria-labelledby="titre-porte"><div class="porte-boite">' +
      forme(porte, 'enorme') +
      '<h2 id="titre-porte">Passe l’appareil à ' + nom(porte) + '</h2>' +
      '<p>Les autres joueurs ne regardent pas l’écran.</p>' +
      '<button type="button" class="bouton primaire grand-bouton" data-a="pret">C’est moi</button>' +
      '<button type="button" class="bouton" data-a="quitter">Quitter</button></div></div>';
  }
  h += boitePerdue();
  scoresAvant = v.scores.slice();
  return h;
}

// ---------- Rendu ----------
function cleFocus(el) {
  if (!el || !el.dataset || !el.dataset.a) return null;
  const d = el.dataset;
  return '[data-a="' + d.a + '"]' + ['i', 'n', 't', 'v', 'case', 'index', 'garde'].map((k) => (d[k] !== undefined ? '[data-' + k + '="' + d[k] + '"]' : '')).join('');
}

function rendre() {
  const actif = document.activeElement;
  const cle = actif && actif.tagName !== 'INPUT' ? cleFocus(actif) : null;
  const defile = window.scrollY;
  racine.innerHTML =
    ecran === 'accueil' ? rendreAccueil() : ecran === 'regles' ? ecranRegles() : ecran === 'salle' ? rendreSalle() : rendreTable();
  if (enligne && enligne.envoi && ecran === 'table') {
    // Un coup est parti : on attend la nouvelle vue avant de laisser rejouer.
    racine.querySelectorAll('.table button[data-a]').forEach((b) => {
      if (b.dataset.a !== 'regles' && b.dataset.a !== 'quitter-salon') b.disabled = true;
    });
  }
  if (ecran !== 'regles') window.scrollTo(0, defile);
  if ((ecran === 'table' || ecran === 'salle') && racine.querySelector('.porte')) {
    racine.querySelector('.porte button').focus();
  } else if (cle) {
    const el = racine.querySelector(cle);
    if (el && !el.disabled) el.focus({ preventScroll: true });
  }
  animer();
  planifierBot();
}

function animer() {
  if (reduit()) {
    nouveau = null;
    retournee = null;
    return;
  }
  if (nouveau) {
    const cible = racine.querySelector('[data-nouveau]');
    const origine = racine.querySelector('[data-seat="' + nouveau.joueur + '"]');
    if (cible && origine && cible.animate) {
      const a = cible.getBoundingClientRect();
      const o = origine.getBoundingClientRect();
      const dx = o.left + o.width / 2 - (a.left + a.width / 2);
      const dy = o.top + o.height / 2 - (a.top + a.height / 2);
      cible.animate(
        [
          { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.7)', opacity: 0.2, zIndex: 9 },
          { transform: 'none', opacity: 1, zIndex: 9 },
        ],
        { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
    }
  }
  nouveau = null;
  retournee = null;
}

// ---------- En ligne ----------
const vueValide = (x) =>
  x && typeof x === 'object' && Array.isArray(x.joueurs) && typeof x.siege === 'number' &&
  (x.phase === 'attente' || (x.phase === 'partie' && x.vue && Array.isArray(x.vue.cases) && Array.isArray(x.vue.scores) &&
    Array.isArray(x.vue.mains) && Array.isArray(x.vue.pioches) && Array.isArray(x.vue.defausses) && Array.isArray(x.vue.resultats)));

function animationsEntre(prev, vue) {
  nouveau = null;
  retournee = null;
  if (!prev || prev.manche !== vue.manche) return;
  vue.cases.forEach((c, i) => {
    const avant = prev.cases[i] ? prev.cases[i].cartes.length : 0;
    if (c.cartes.length > avant) nouveau = { case: i, index: c.cartes.length - 1, joueur: c.cartes[c.cartes.length - 1].joueur };
  });
  if (vue.revelees > prev.revelees) retournee = prev.revelees;
}

function surVueEnLigne(id, v) {
  if (!enligne || enligne.id !== id || !vueValide(v)) return;
  const prev = enligne.v && enligne.v.vue;
  const neuve = v.vue;
  const change = JSON.stringify(prev || null) !== JSON.stringify(neuve || null);
  enligne.v = v;
  enligne.envoi = false;
  clearTimeout(enligne.minuteur);
  enCours = false;
  if (!enligne.perdu) erreur = '';
  if (change) {
    reinitSel();
    if (neuve) animationsEntre(prev, neuve);
    if (prev && neuve && neuve.scores.some((x, p) => x < prev.scores[p])) scoresAvant = null;
  }
  const cible = v.phase === 'partie' ? 'table' : 'salle';
  if (ecran === 'regles') ecranAvantRegles = cible;
  else ecran = cible;
  rendre();
}

function surErreurEnLigne(id, message) {
  if (!enligne || enligne.id !== id) return;
  enligne.envoi = false;
  clearTimeout(enligne.minuteur);
  erreur = String(message);
  erreurEnLigne = true;
  if (/^connexion perdue/i.test(erreur)) enligne.perdu = true;
  else if (!enligne.v) {
    // Refusé avant d'être entré dans le salon (partie déjà commencée, salon complet…)
    try { enligne.session && enligne.session.quitter(); } catch { /* déjà fermé */ }
    enligne = null;
    enCours = false;
    ecran = 'accueil';
  }
  rendre();
}

async function entrerEnLigne(ouvrir) {
  if (enCours || enligne) return;
  enCours = true;
  erreur = '';
  erreurEnLigne = true;
  const id = ++compteurSession;
  const moi = { id, v: null, session: null, envoi: false, perdu: false, minuteur: null };
  enligne = moi;
  rendre();
  try {
    const session = await ouvrir({
      surVue: (v) => surVueEnLigne(id, v),
      surErreur: (m) => surErreurEnLigne(id, m),
    });
    if (enligne !== moi) {
      session.quitter();
      return;
    }
    moi.session = session;
    if (!moi.v) {
      moi.minuteur = setTimeout(() => {
        if (enligne !== moi || moi.v) return;
        surErreurEnLigne(id, 'Le salon ne répond pas.');
      }, 12000);
    }
  } catch (err) {
    if (enligne !== moi) return;
    enligne = null;
    enCours = false;
    ecran = 'accueil';
    erreur = err && err.message ? err.message : 'Connexion impossible.';
    rendre();
  }
}

function quitterSalon() {
  const e = enligne;
  enligne = null;
  enCours = false;
  if (e) {
    clearTimeout(e.minuteur);
    try { e.session && e.session.quitter(); } catch { /* déjà fermé */ }
  }
  ecran = 'accueil';
  etat = null;
  erreur = '';
  erreurEnLigne = false;
  reinitSel();
  nouveau = null;
  retournee = null;
  scoresAvant = null;
  rendre();
}

/** Envoie un coup : rien ne change à l'écran avant l'arrivée de la nouvelle vue. */
function envoyer(coup) {
  if (!enligne || !enligne.session || enligne.envoi) return;
  const e = enligne;
  e.envoi = true;
  erreur = '';
  clearTimeout(e.minuteur);
  e.minuteur = setTimeout(() => {
    if (enligne === e && e.envoi) {
      e.envoi = false;
      rendre();
    }
  }, 10000);
  try {
    e.session.jouer(coup);
  } catch (err) {
    e.envoi = false;
    erreur = err.message;
  }
  rendre();
}

// ---------- Actions ----------
const courant = () => (enligne ? (enligne.v && enligne.v.vue) || null : etat);

function humainAgit() {
  const c = courant();
  if (!c) return false;
  if (enligne) return !enligne.envoi && !enligne.perdu && joueurAttendu(c) === enligne.v.siege;
  if (porteVers() !== null) return false;
  const att = joueurAttendu(c);
  return att !== null && estHumain(att);
}

/** Actions communes (retourner une case, manche suivante) : ouvertes à tous. */
function communAgit() {
  if (enligne) return !enligne.envoi && !enligne.perdu && !!courant();
  return !!etat;
}

const jouerCoup = (coup) => (enligne ? envoyer(coup) : appliquer(coup));

const actions = {
  nb(d) {
    cfg.n = Number(d.n);
    rendre();
  },
  type(d) {
    cfg.types[Number(d.i)] = d.t;
    erreur = '';
    rendre();
  },
  defausse(d) {
    cfg.defausseVisible = d.v === '1';
    rendre();
  },
  jouer() {
    erreurEnLigne = false;
    for (let p = 0; p < cfg.n; p++) if (!cfg.noms[p].trim()) cfg.noms[p] = NOMS_PAR_DEFAUT[p];
    if (!humains().length) {
      erreur = 'Il faut au moins un joueur humain.';
      rendre();
      return;
    }
    nouvelle();
    rendre();
  },
  reprendre() {
    erreurEnLigne = false;
    if (!reprendre()) erreur = 'Aucune partie à reprendre.';
    rendre();
  },
  rejouer() {
    if (enligne) {
      const c = courant();
      if (enligne.v.siege !== enligne.v.siegeHote || !c || c.phase !== 'fin' || !enligne.session.demarrer) return;
      try {
        enligne.session.demarrer({ defausseVisible: c.defausseVisible });
      } catch (err) {
        erreur = err.message;
        rendre();
      }
      return;
    }
    nouvelle();
    rendre();
  },
  creer() {
    entrerEnLigne((o) => hebergerSalon({ nom: cfg.monNom.trim(), ...o }));
  },
  rejoindre() {
    const code = cfg.code.trim().toUpperCase();
    entrerEnLigne((o) => rejoindreSalon({ code, nom: cfg.monNom.trim(), ...o }));
  },
  lancer() {
    if (!enligne || !enligne.session || !enligne.session.demarrer || enligne.v.siege !== enligne.v.siegeHote) return;
    try {
      enligne.session.demarrer({ defausseVisible: cfg.defausseVisible });
    } catch (err) {
      erreur = err.message;
      rendre();
    }
  },
  'quitter-salon'() {
    quitterSalon();
  },
  regles() {
    ecranAvantRegles = ecran;
    ecran = 'regles';
    window.scrollTo(0, 0);
    rendre();
  },
  retour() {
    ecran = ecranAvantRegles;
    rendre();
  },
  quitter() {
    // La partie locale reste sauvegardée : « Reprendre la partie » la rouvre.
    ecran = 'accueil';
    etat = null;
    erreur = '';
    rendre();
  },
  pret() {
    const vers = porteVers();
    if (vers !== null) tient = vers;
    rendre();
  },
  pointer(d) {
    if (!humainAgit() || courant().phase !== 'pointer') return;
    jouerCoup({ type: 'pointer', index: Number(d.index) });
  },
  garde(d) {
    if (!humainAgit() || courant().phase !== 'choisir') return;
    sel.garde = d.garde;
    rendre();
  },
  case(d) {
    if (!humainAgit() || courant().phase !== 'choisir') return;
    sel.caseSel = Number(d.i);
    rendre();
  },
  echanger(d) {
    if (!humainAgit() || courant().phase !== 'echange') return;
    const c = Number(d.case);
    const i = Number(d.index);
    sel.ech = sel.ech && sel.ech.case === c && sel.ech.index === i ? null : { case: c, index: i };
    rendre();
  },
  valider() {
    if (!humainAgit()) return;
    const ph = courant().phase;
    if (ph === 'choisir' && sel.garde && sel.caseSel !== null) {
      jouerCoup({ type: 'poser', garde: sel.garde, case: sel.caseSel });
    } else if (ph === 'echange' && sel.ech) {
      jouerCoup({ type: 'echanger', case: sel.ech.case, index: sel.ech.index });
    }
  },
  passer() {
    if (!humainAgit() || courant().phase !== 'echange') return;
    jouerCoup({ type: 'passer' });
  },
  reveler() {
    if (communAgit() && courant().phase === 'revelation') jouerCoup({ type: 'reveler' });
  },
  suivante() {
    if (communAgit() && courant().phase === 'finManche') jouerCoup({ type: 'mancheSuivante' });
  },
};

export function demarrer(element) {
  racine = element;
  racine.addEventListener('click', (ev) => {
    // Le 2e clic d'un double clic tomberait sur le bouton apparu au même endroit : on l'ignore.
    if (ev.detail > 1) return;
    const b = ev.target.closest('[data-a]');
    if (!b || b.disabled) return;
    const f = actions[b.dataset.a];
    if (f) f(b.dataset);
  });
  racine.addEventListener('input', (ev) => {
    const t = ev.target;
    if (!t.dataset) return;
    if (t.dataset.a === 'nom') cfg.noms[Number(t.dataset.i)] = t.value;
    else if (t.dataset.a === 'monnom') cfg.monNom = t.value;
    else if (t.dataset.a === 'code') {
      t.value = t.value.toUpperCase().replace(/[^A-Z]/g, '');
      cfg.code = t.value;
    }
  });
  racine.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.dataset && ev.target.dataset.a === 'code') actions.rejoindre();
  });
  rendre();
}
