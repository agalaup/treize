// Simulateur d'équilibrage : joue des milliers de parties entre bots et compte.
// Lancer : npm run simuler -- --parties 2000 --joueurs 3 --niveaux gourmand,hasard,hasard --graine 1
// Options :
//   --parties N    nombre de parties (défaut 1000)
//   --joueurs N    2 à 4 (défaut 2)
//   --niveaux a,b  niveau de chaque siège : hasard ou gourmand (défaut : tous gourmand)
//   --graine N     même graine = mêmes parties (défaut 1)
import { pathToFileURL } from 'node:url';
import {
  creerRng,
  nouvellePartie,
  jouer,
  joueurAttendu,
  coupsPossibles,
  vueJoueur,
  gagnants,
  VALEURS_CASES,
} from '../src/logic/treize.js';
import { choisirCoup, NIVEAUX } from '../src/logic/bots.js';

function lireOptions(args) {
  const o = { parties: 1000, joueurs: 2, niveaux: null, graine: 1 };
  for (let i = 0; i < args.length; i += 2) {
    const cle = args[i].replace(/^--/, '');
    const val = args[i + 1];
    if (!(cle in o) || val === undefined) throw new Error('Option inconnue ou sans valeur : ' + args[i]);
    o[cle] = cle === 'niveaux' ? val.split(',') : Number(val);
  }
  if (!Number.isInteger(o.parties) || o.parties < 1) throw new Error('--parties : nombre entier positif');
  if (![2, 3, 4].includes(o.joueurs)) throw new Error('--joueurs : 2, 3 ou 4');
  if (!Number.isInteger(o.graine)) throw new Error('--graine : nombre entier');
  o.niveaux = o.niveaux || new Array(o.joueurs).fill('gourmand');
  if (o.niveaux.length !== o.joueurs) throw new Error('--niveaux : un niveau par joueur');
  for (const n of o.niveaux) if (!NIVEAUX.includes(n)) throw new Error('Niveau inconnu : ' + n + ' (' + NIVEAUX.join(', ') + ')');
  return o;
}

/** Joue une partie entière. Rend l'état final et ce qu'on a compté en route. */
export function jouerPartie(niveaux, rng) {
  const n = niveaux.length;
  let e = nouvellePartie({ nbJoueurs: n, defausseVisible: true }, rng);
  const premierManche1 = e.premier;
  const releve = { casesVides: 0, casesAEgalite: 0, casesAuDepartage: 0, echanges: 0, occasionsEchange: 0 };
  let garde = 0;
  while (e.phase !== 'fin') {
    if (++garde > 5000) throw new Error('Partie sans fin');
    const att = joueurAttendu(e);
    const coup = att === null ? coupsPossibles(e)[0] : choisirCoup(vueJoueur(e, att), att, niveaux[att], rng);
    if (e.phase === 'echange') {
      releve.occasionsEchange++;
      if (coup.type === 'echanger') releve.echanges++;
    }
    const avant = e;
    e = jouer(e, coup, rng);
    // Toutes les cases de la manche sont révélées : on relève les résultats avant la manche suivante.
    if (avant.phase === 'revelation' && e.phase !== 'revelation') {
      for (const r of e.resultats) {
        if (r.vide) releve.casesVides++;
        else if (r.gagnant === null) releve.casesAEgalite++;
        else if (r.departage) releve.casesAuDepartage++;
      }
    }
  }
  return { etat: e, premierManche1, releve };
}

function pct(a, b) {
  return b ? (100 * a / b).toFixed(1).padStart(5) + ' %' : '    —';
}

function principal() {
  const o = lireOptions(process.argv.slice(2));
  const rng = creerRng(o.graine);
  const n = o.joueurs;
  const victoires = new Array(n).fill(0); // victoire partagée = une part chacun
  const seul = new Array(n).fill(0);
  const points = new Array(n).fill(0);
  let partagees = 0;
  let premierGagne = 0;
  let vides = 0;
  let egalites = 0;
  let departages = 0;
  let echanges = 0;
  let occasions = 0;
  const debut = Date.now();
  for (let i = 0; i < o.parties; i++) {
    const { etat, premierManche1, releve } = jouerPartie(o.niveaux, rng);
    const g = gagnants(etat);
    if (g.length > 1) partagees++;
    else seul[g[0]]++;
    for (const p of g) victoires[p] += 1 / g.length;
    if (g.includes(premierManche1)) premierGagne += 1 / g.length;
    for (let p = 0; p < n; p++) points[p] += etat.scores[p];
    vides += releve.casesVides;
    egalites += releve.casesAEgalite;
    departages += releve.casesAuDepartage;
    echanges += releve.echanges;
    occasions += releve.occasionsEchange;
  }
  const casesJouees = o.parties * 3 * VALEURS_CASES.length;
  console.log('Treize, simulation : ' + o.parties + ' parties à ' + n + ' joueurs, graine ' + o.graine);
  console.log('');
  console.log('Siège  Niveau     Victoires   Seul en tête   Points par partie');
  for (let p = 0; p < n; p++) {
    console.log(
      '  ' + (p + 1) + '    ' + o.niveaux[p].padEnd(9) + '  ' + pct(victoires[p], o.parties) + '     ' +
      pct(seul[p], o.parties) + '        ' + (points[p] / o.parties).toFixed(2),
    );
  }
  console.log('');
  console.log('Victoires partagées            : ' + pct(partagees, o.parties));
  if (new Set(o.niveaux).size === 1) {
    console.log('Le premier joueur gagne        : ' + pct(premierGagne, o.parties) + '  (sans avantage : ' + (100 / n).toFixed(1) + ' %)');
  }
  console.log('Cases restées vides            : ' + pct(vides, casesJouees));
  console.log('Cases à égalité, sans gagnant  : ' + pct(egalites, casesJouees));
  console.log('Cases gagnées au départage     : ' + pct(departages, casesJouees));
  console.log('Carte secrète échangée         : ' + pct(echanges, occasions));
  console.log('Durée : ' + ((Date.now() - debut) / 1000).toFixed(1) + ' s');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    principal();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
