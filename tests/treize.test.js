import { describe, it, expect } from 'vitest';
import {
  VALEURS_CASES,
  NB_CASES,
  NB_MANCHES,
  TAILLE_MAIN,
  creerRng,
  melanger,
  nouvellePartie,
  calculerCase,
  coupsPossibles,
  joueurAttendu,
  jouer,
  gagnants,
  vueJoueur,
} from '../src/logic/treize.js';

// ---------- outils ----------

const clone = (x) => structuredClone(x);

/** Joue un coup au hasard parmi les coups possibles. */
function coupAuHasard(e, rng) {
  const coups = coupsPossibles(e);
  return coups[Math.floor(rng() * coups.length)];
}

/** Avance (coups au hasard) jusqu'à ce que le prédicat soit vrai. */
function avancerJusqua(e, predicat, rng, limite = 5000) {
  let n = 0;
  while (!predicat(e)) {
    if (n++ > limite) throw new Error('trop de coups : la partie ne converge pas');
    e = jouer(e, coupAuHasard(e, rng), rng);
  }
  return e;
}

/** Toutes les cartes (rangs) possédées par un joueur, où qu'elles soient. */
function cartesDuJoueur(e, p) {
  const l = [...e.mains[p], ...e.pioches[p], ...e.defausses[p]];
  for (const c of e.cases) for (const carte of c.cartes) if (carte.joueur === p) l.push(carte.rang);
  if (e.cartePiochee !== null && e.actif === p) l.push(e.cartePiochee);
  if (e.secretes[p] !== null) l.push(e.secretes[p]);
  return l;
}

function verifierInvariant(e) {
  for (let p = 0; p < e.nbJoueurs; p++) {
    const cartes = cartesDuJoueur(e, p);
    expect(cartes.length).toBe(13);
    expect([...cartes].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  }
}

/** État en phase 'pointer' au tour 0. */
const debut = (n = 2, graine = 1, options = {}) =>
  nouvellePartie({ nbJoueurs: n, ...options }, creerRng(graine));

/** Joue les tours (pointer index 0, garder pioche ou pointee, case 0) jusqu'à la phase demandée. */
function jusquaEchange(e, garde = 'pioche') {
  while (e.phase === 'pointer' || e.phase === 'choisir') {
    if (e.phase === 'pointer') e = jouer(e, { type: 'pointer', index: 0 });
    else e = jouer(e, { type: 'poser', garde, case: 0 });
  }
  return e;
}

function jusquaRevelation(e, rng = creerRng(7)) {
  e = jusquaEchange(e);
  while (e.phase === 'echange') e = jouer(e, { type: 'passer' });
  return e;
}

// ---------- hasard ----------

describe('hasard reproductible', () => {
  it('creerRng donne la même suite pour la même graine', () => {
    const a = creerRng(42);
    const b = creerRng(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  it('creerRng reste dans [0, 1[', () => {
    const r = creerRng(5);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('melanger renvoie une permutation et ne modifie pas la liste d’origine', () => {
    const l = [1, 2, 3, 4, 5, 6];
    const m = melanger(l, creerRng(3));
    expect(l).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...m].sort()).toEqual(l);
  });

  it('même graine, même distribution', () => {
    expect(debut(3, 99)).toEqual(debut(3, 99));
  });
});

// ---------- distribution ----------

describe('distribution', () => {
  for (const n of [2, 3, 4]) {
    describe(`${n} joueurs`, () => {
      it('crée 4 cases de valeurs 1, 1, 2, 3', () => {
        for (let graine = 0; graine < 20; graine++) {
          const e = debut(n, graine);
          expect(e.cases).toHaveLength(4);
          expect(NB_CASES).toBe(4);
          expect(e.cases.map((c) => c.valeur).sort()).toEqual([...VALEURS_CASES].sort());
          expect(e.cases.map((c) => c.valeur).sort((a, b) => a - b)).toEqual([1, 1, 2, 3]);
        }
      });

      it('montre exactement une case, et elle vaut 1', () => {
        for (let graine = 0; graine < 20; graine++) {
          const e = debut(n, graine);
          const visibles = e.cases.filter((c) => c.visible);
          expect(visibles).toHaveLength(1);
          expect(visibles[0].valeur).toBe(1);
        }
      });

      it('donne 6 cartes en main et 7 en pioche à chaque joueur', () => {
        const e = debut(n, 4);
        expect(e.mains).toHaveLength(n);
        expect(e.pioches).toHaveLength(n);
        expect(TAILLE_MAIN).toBe(6);
        for (let p = 0; p < n; p++) {
          expect(e.mains[p]).toHaveLength(6);
          expect(e.pioches[p]).toHaveLength(7);
        }
      });

      it('fait de chaque famille les rangs 1 à 13 sans doublon', () => {
        for (let graine = 0; graine < 10; graine++) {
          const e = debut(n, graine);
          for (let p = 0; p < n; p++) {
            const tout = [...e.mains[p], ...e.pioches[p]].sort((a, b) => a - b);
            expect(tout).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
          }
        }
      });

      it('démarre en phase pointer, cases vides, scores à zéro, manche 0', () => {
        const e = debut(n, 2);
        expect(e.phase).toBe('pointer');
        expect(e.manche).toBe(0);
        expect(e.scores).toEqual(new Array(n).fill(0));
        expect(e.cases.every((c) => c.cartes.length === 0)).toBe(true);
        expect(e.defausses.every((d) => d.length === 0)).toBe(true);
        expect(e.secretes.every((s) => s === null)).toBe(true);
      });

      it('mélange les familles : la distribution dépend de la graine', () => {
        const a = debut(n, 1);
        const b = debut(n, 2);
        expect(JSON.stringify(a.mains)).not.toBe(JSON.stringify(b.mains));
      });
    });
  }

  it('refuse 1 joueur', () => {
    expect(() => nouvellePartie({ nbJoueurs: 1 }, creerRng(1))).toThrow();
  });

  it('refuse 5 joueurs', () => {
    expect(() => nouvellePartie({ nbJoueurs: 5 }, creerRng(1))).toThrow();
  });

  it('refuse 0, un nombre négatif, un décimal et un texte', () => {
    for (const nbJoueurs of [0, -2, 2.5, '3']) {
      expect(() => nouvellePartie({ nbJoueurs }, creerRng(1))).toThrow();
    }
  });

  it('prend 2 joueurs par défaut et défausse visible par défaut', () => {
    const e = nouvellePartie({}, creerRng(1));
    expect(e.nbJoueurs).toBe(2);
    expect(e.defausseVisible).toBe(true);
  });

  it('respecte l’option defausseVisible', () => {
    expect(nouvellePartie({ defausseVisible: false }, creerRng(1)).defausseVisible).toBe(false);
  });
});

// ---------- tour ----------

describe('tour', () => {
  it('le pointeur est le joueur suivant dans l’ordre, pour tous les tours (2, 3, 4 joueurs)', () => {
    for (const n of [2, 3, 4]) {
      let e = debut(n, 5);
      const rng = creerRng(5);
      for (let tour = 0; tour < n * TAILLE_MAIN; tour++) {
        expect(e.phase).toBe('pointer');
        expect(e.tour).toBe(tour);
        const posActif = e.ordre.indexOf(e.actif);
        expect(e.actif).toBe(e.ordre[tour % n]);
        expect(e.pointeur).toBe(e.ordre[(posActif + 1) % n]);
        expect(e.pointeur).not.toBe(e.actif);
        expect(joueurAttendu(e)).toBe(e.pointeur);
        e = jouer(e, coupAuHasard(e, rng), rng);
        expect(e.phase).toBe('choisir');
        expect(joueurAttendu(e)).toBe(e.actif);
        e = jouer(e, coupAuHasard(e, rng), rng);
      }
    }
  });

  it('à 2 joueurs, le pointeur est l’adversaire', () => {
    const e = debut(2, 1);
    expect(e.pointeur).toBe(1 - e.actif);
  });

  it('les joueurs jouent chacun leur tour dans l’ordre', () => {
    let e = debut(3, 8);
    const vus = [];
    for (let i = 0; i < 6; i++) {
      vus.push(e.actif);
      e = jouer(e, { type: 'pointer', index: 0 });
      e = jouer(e, { type: 'poser', garde: 'pioche', case: 0 });
    }
    expect(vus).toEqual([0, 1, 2, 0, 1, 2]);
  });

  it('pointer fait piocher une carte (la pioche perd sa dernière carte)', () => {
    const e = debut(2, 3);
    const p = e.actif;
    const derniere = e.pioches[p].at(-1);
    const f = jouer(e, { type: 'pointer', index: 2 });
    expect(f.phase).toBe('choisir');
    expect(f.indexPointe).toBe(2);
    expect(f.cartePiochee).toBe(derniere);
    expect(f.pioches[p]).toHaveLength(6);
    expect(f.mains[p]).toHaveLength(6);
  });

  it('garder « pioche » pose la carte piochée et défausse la carte pointée', () => {
    const e = debut(2, 3);
    const p = e.actif;
    const pointee = e.mains[p][3];
    const piochee = e.pioches[p].at(-1);
    let f = jouer(e, { type: 'pointer', index: 3 });
    f = jouer(f, { type: 'poser', garde: 'pioche', case: 2 });
    expect(f.cases[2].cartes).toEqual([{ joueur: p, rang: piochee }]);
    expect(f.defausses[p]).toEqual([pointee]);
  });

  it('garder « pointee » pose la carte pointée et défausse la carte piochée', () => {
    const e = debut(2, 3);
    const p = e.actif;
    const pointee = e.mains[p][3];
    const piochee = e.pioches[p].at(-1);
    let f = jouer(e, { type: 'pointer', index: 3 });
    f = jouer(f, { type: 'poser', garde: 'pointee', case: 1 });
    expect(f.cases[1].cartes).toEqual([{ joueur: p, rang: pointee }]);
    expect(f.defausses[p]).toEqual([piochee]);
  });

  it('la carte pointée quitte toujours la main, quel que soit le choix', () => {
    for (const garde of ['pioche', 'pointee']) {
      for (let index = 0; index < 6; index++) {
        const e = debut(2, 11);
        const p = e.actif;
        const avant = [...e.mains[p]];
        let f = jouer(e, { type: 'pointer', index });
        f = jouer(f, { type: 'poser', garde, case: 0 });
        const attendu = avant.filter((_, i) => i !== index);
        expect(f.mains[p]).toEqual(attendu);
      }
    }
  });

  it('la main perd exactement 1 carte par tour du joueur', () => {
    let e = debut(2, 6);
    const p = e.actif;
    let taille = e.mains[p].length;
    const rng = creerRng(6);
    for (let t = 0; t < 12; t++) {
      const estSonTour = e.actif === p;
      e = jouer(e, coupAuHasard(e, rng), rng);
      e = jouer(e, coupAuHasard(e, rng), rng);
      if (estSonTour) taille--;
      expect(e.mains[p]).toHaveLength(taille);
    }
  });

  it('la carte posée est rattachée au joueur actif et à la case choisie', () => {
    let e = debut(3, 2);
    const p = e.actif;
    e = jouer(e, { type: 'pointer', index: 0 });
    e = jouer(e, { type: 'poser', garde: 'pioche', case: 3 });
    expect(e.cases[3].cartes).toHaveLength(1);
    expect(e.cases[3].cartes[0].joueur).toBe(p);
    expect(e.tour).toBe(1);
  });
});

// ---------- fin de la pose, carte secrète ----------

describe('après 6 tours chacun', () => {
  for (const n of [2, 3, 4]) {
    it(`${n} joueurs : phase echange, 1 carte secrète par joueur, mains et pioches vides`, () => {
      const e = jusquaEchange(debut(n, 12));
      expect(e.phase).toBe('echange');
      expect(e.tour).toBe(n * TAILLE_MAIN);
      for (let p = 0; p < n; p++) {
        expect(e.mains[p]).toHaveLength(0);
        expect(e.pioches[p]).toHaveLength(0);
        expect(e.secretes[p]).toBeTypeOf('number');
        expect(e.defausses[p]).toHaveLength(6);
      }
      expect(e.cartePiochee).toBe(null);
      expect(e.cases.reduce((s, c) => s + c.cartes.length, 0)).toBe(n * 6);
    });
  }

  it('la phase echange ne commence pas avant le dernier tour', () => {
    let e = debut(2, 12);
    const rng = creerRng(1);
    for (let i = 0; i < 2 * 6 - 1; i++) {
      e = jouer(e, coupAuHasard(e, rng), rng);
      e = jouer(e, coupAuHasard(e, rng), rng);
      expect(e.phase).toBe('pointer');
    }
  });
});

// ---------- échange ----------

describe('échange', () => {
  it('le premier à échanger est le premier de l’ordre, puis chacun son tour', () => {
    let e = jusquaEchange(debut(3, 4));
    const vus = [];
    while (e.phase === 'echange') {
      vus.push(e.actif);
      expect(joueurAttendu(e)).toBe(e.actif);
      e = jouer(e, { type: 'passer' });
    }
    expect(vus).toEqual([0, 1, 2]);
    expect(e.phase).toBe('revelation');
    expect(joueurAttendu(e)).toBe(null);
  });

  it('échanger remplace la carte posée par la secrète et envoie l’ancienne à la défausse', () => {
    const e = jusquaEchange(debut(2, 21));
    const p = e.actif;
    const secrete = e.secretes[p];
    const place = e.cases.flatMap((c, ci) => c.cartes.map((k, i) => ({ ci, i, k }))).find((x) => x.k.joueur === p);
    const ancienne = place.k.rang;
    const defausseAvant = [...e.defausses[p]];
    const f = jouer(e, { type: 'echanger', case: place.ci, index: place.i });
    expect(f.cases[place.ci].cartes[place.i]).toEqual({ joueur: p, rang: secrete });
    expect(f.defausses[p]).toEqual([...defausseAvant, ancienne]);
    expect(f.secretes[p]).toBe(null);
    expect(f.actif).toBe(f.ordre[1]);
  });

  it('passer ne change rien sauf le joueur actif', () => {
    const e = jusquaEchange(debut(2, 21));
    const f = jouer(e, { type: 'passer' });
    expect(f.cases).toEqual(e.cases);
    expect(f.defausses).toEqual(e.defausses);
    expect(f.secretes).toEqual(e.secretes);
    expect(f.mains).toEqual(e.mains);
    expect(f.actif).toBe(e.ordre[1]);
  });

  it('impossible d’échanger la carte d’un autre joueur', () => {
    const e = jusquaEchange(debut(2, 21));
    const autre = e.cases
      .flatMap((c, ci) => c.cartes.map((k, i) => ({ ci, i, k })))
      .find((x) => x.k.joueur !== e.actif);
    expect(() => jouer(e, { type: 'echanger', case: autre.ci, index: autre.i })).toThrow(/Coup interdit/);
  });

  it('impossible d’échanger une carte qui n’existe pas', () => {
    const e = jusquaEchange(debut(2, 21));
    expect(() => jouer(e, { type: 'echanger', case: 0, index: 99 })).toThrow();
    expect(() => jouer(e, { type: 'echanger', case: 9, index: 0 })).toThrow();
    expect(() => jouer(e, { type: 'echanger', case: -1, index: 0 })).toThrow();
    expect(() => jouer(e, { type: 'echanger', case: 0, index: -1 })).toThrow();
  });

  it('coupsPossibles en échange ne propose que passer et les cartes du joueur actif', () => {
    const e = jusquaEchange(debut(3, 2));
    const coups = coupsPossibles(e);
    expect(coups.filter((c) => c.type === 'passer')).toHaveLength(1);
    const echanges = coups.filter((c) => c.type === 'echanger');
    expect(echanges).toHaveLength(6);
    for (const c of echanges) expect(e.cases[c.case].cartes[c.index].joueur).toBe(e.actif);
  });

  it('un échange conserve les 13 cartes du joueur', () => {
    let e = jusquaEchange(debut(2, 9));
    const p = e.actif;
    const coup = coupsPossibles(e).find((c) => c.type === 'echanger');
    e = jouer(e, coup);
    expect(cartesDuJoueur(e, p)).toHaveLength(13);
    verifierInvariant(e);
  });
});

// ---------- calculerCase ----------

describe('calculerCase', () => {
  const caseDe = (...cartes) => ({ valeur: 1, visible: false, cartes: cartes.map(([joueur, rang]) => ({ joueur, rang })) });

  it('la plus haute somme gagne', () => {
    const r = calculerCase(caseDe([0, 5], [0, 3], [1, 7]), 2);
    expect(r.sommes).toEqual([8, 7]);
    expect(r.gagnant).toBe(0);
    expect(r.departage).toBe(false);
    expect(r.egalite).toBe(false);
    expect(r.vide).toBe(false);
  });

  it('une somme plus haute gagne même avec une plus petite carte haute', () => {
    const r = calculerCase(caseDe([0, 6], [0, 7], [1, 12]), 2);
    expect(r.gagnant).toBe(0);
    expect(r.departage).toBe(false);
  });

  it('égalité de somme : la plus haute carte départage', () => {
    const r = calculerCase(caseDe([0, 10], [1, 4], [1, 6]), 2);
    expect(r.sommes).toEqual([10, 10]);
    expect(r.gagnant).toBe(0);
    expect(r.departage).toBe(true);
    expect(r.egalite).toBe(false);
  });

  it('égalité de somme : la plus haute carte départage dans l’autre sens', () => {
    const r = calculerCase(caseDe([0, 4], [0, 6], [1, 10]), 2);
    expect(r.gagnant).toBe(1);
    expect(r.departage).toBe(true);
  });

  it('égalité parfaite : personne ne gagne', () => {
    const r = calculerCase(caseDe([0, 5], [0, 5], [1, 5], [1, 5]), 2);
    expect(r.gagnant).toBe(null);
    expect(r.egalite).toBe(true);
    expect(r.departage).toBe(false);
    expect(r.vide).toBe(false);
  });

  it('égalité parfaite avec une seule carte chacun', () => {
    const r = calculerCase(caseDe([0, 7], [1, 7]), 2);
    expect(r.gagnant).toBe(null);
    expect(r.egalite).toBe(true);
  });

  it('case vide : personne ne gagne, vide = true', () => {
    const r = calculerCase(caseDe(), 3);
    expect(r.vide).toBe(true);
    expect(r.gagnant).toBe(null);
    expect(r.egalite).toBe(false);
    expect(r.sommes).toEqual([0, 0, 0]);
  });

  it('un seul joueur sur la case : il gagne', () => {
    const r = calculerCase(caseDe([2, 1]), 3);
    expect(r.gagnant).toBe(2);
    expect(r.vide).toBe(false);
  });

  it('3 joueurs : le troisième peut gagner', () => {
    const r = calculerCase(caseDe([0, 3], [1, 4], [2, 9]), 3);
    expect(r.sommes).toEqual([3, 4, 9]);
    expect(r.gagnant).toBe(2);
  });

  it('3 joueurs : égalité de somme à deux, le troisième plus bas ne compte pas', () => {
    const r = calculerCase(caseDe([0, 10], [1, 4], [1, 6], [2, 9]), 3);
    expect(r.sommes).toEqual([10, 10, 9]);
    expect(r.gagnant).toBe(0);
    expect(r.departage).toBe(true);
  });

  it('3 joueurs : égalité à trois sur la somme, la plus haute carte départage', () => {
    const r = calculerCase(caseDe([0, 9], [1, 5], [1, 4], [2, 3], [2, 3], [2, 3]), 3);
    expect(r.sommes).toEqual([9, 9, 9]);
    expect(r.gagnant).toBe(0);
    expect(r.departage).toBe(true);
  });

  it('4 joueurs : égalité entre deux finalistes sur la plus haute carte, un troisième à égalité de somme est battu', () => {
    const r = calculerCase(caseDe([0, 9], [0, 1], [1, 9], [1, 1], [2, 5], [2, 5], [3, 2]), 4);
    expect(r.sommes).toEqual([10, 10, 10, 2]);
    expect(r.gagnant).toBe(null);
    expect(r.egalite).toBe(true);
  });

  it('4 joueurs : le quatrième gagne seul', () => {
    const r = calculerCase(caseDe([0, 1], [1, 2], [2, 3], [3, 13]), 4);
    expect(r.gagnant).toBe(3);
  });

  it('4 joueurs : la somme la plus haute gagne même si les autres sont à égalité', () => {
    const r = calculerCase(caseDe([0, 4], [1, 4], [2, 4], [3, 5]), 4);
    expect(r.gagnant).toBe(3);
    expect(r.departage).toBe(false);
  });

  it('ne modifie pas la case reçue', () => {
    const c = caseDe([0, 5], [1, 7]);
    const avant = clone(c);
    calculerCase(c, 2);
    expect(c).toEqual(avant);
  });
});

// ---------- révélation ----------

describe('révélation', () => {
  it('révèle une case par coup, dans l’ordre, et ajoute les points case par case', () => {
    let e = jusquaRevelation(debut(2, 31));
    expect(e.phase).toBe('revelation');
    expect(coupsPossibles(e)).toEqual([{ type: 'reveler' }]);
    const scores = [...e.scores];
    for (let i = 0; i < 4; i++) {
      const attendu = calculerCase(e.cases[i], 2);
      e = jouer(e, { type: 'reveler' });
      expect(e.revelees).toBe(i + 1);
      expect(e.resultats).toHaveLength(i + 1);
      expect(e.resultats[i]).toEqual(attendu);
      if (attendu.gagnant !== null) scores[attendu.gagnant] += e.cases[i].valeur;
      expect(e.scores).toEqual(scores);
    }
  });

  it('une case sans gagnant ne donne aucun point', () => {
    // Construit une partie où la case 0 est un ex aequo parfait : 12 cartes, mêmes rangs des deux côtés.
    let e = debut(2, 31);
    e = jusquaEchange(e);
    e = jouer(e, { type: 'passer' });
    e = jouer(e, { type: 'passer' });
    // On force la case 0 en ex aequo sur une copie de l'état (l'état est un simple objet).
    e = clone(e);
    e.cases[0].cartes = [
      { joueur: 0, rang: 5 },
      { joueur: 1, rang: 5 },
    ];
    const avant = [...e.scores];
    const f = jouer(e, { type: 'reveler' });
    expect(f.resultats[0].egalite).toBe(true);
    expect(f.scores).toEqual(avant);
  });

  it('une case vide ne donne aucun point', () => {
    let e = clone(jusquaRevelation(debut(3, 31)));
    e.cases[0].cartes = [];
    const avant = [...e.scores];
    const f = jouer(e, { type: 'reveler' });
    expect(f.resultats[0].vide).toBe(true);
    expect(f.scores).toEqual(avant);
  });

  it('le total distribué par manche ne dépasse jamais 7', () => {
    for (const n of [2, 3, 4]) {
      for (let graine = 0; graine < 15; graine++) {
        const rng = creerRng(graine * 10 + n);
        let e = avancerJusqua(debut(n, graine), (x) => x.phase === 'revelation', rng);
        const avant = e.scores.reduce((a, b) => a + b, 0);
        e = avancerJusqua(e, (x) => x.phase === 'finManche' || x.phase === 'fin', rng);
        const apres = e.scores.reduce((a, b) => a + b, 0);
        expect(apres - avant).toBeLessThanOrEqual(7);
        expect(apres - avant).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('à la fin de la révélation, la phase est finManche (manches 1 et 2) ou fin (manche 3)', () => {
    const rng = creerRng(13);
    let e = debut(2, 13);
    for (let m = 0; m < NB_MANCHES; m++) {
      e = avancerJusqua(e, (x) => x.phase === 'finManche' || x.phase === 'fin', rng);
      expect(e.phase).toBe(m < NB_MANCHES - 1 ? 'finManche' : 'fin');
      if (e.phase === 'finManche') e = jouer(e, { type: 'mancheSuivante' }, rng);
    }
  });
});

// ---------- manches ----------

describe('manches', () => {
  it('3 manches puis phase fin', () => {
    const rng = creerRng(77);
    let e = debut(3, 77);
    let manchesVues = 1;
    while (e.phase !== 'fin') {
      e = jouer(e, coupAuHasard(e, rng), rng);
      if (e.phase === 'pointer' && e.tour === 0 && e.manche + 1 > manchesVues) manchesVues = e.manche + 1;
    }
    expect(NB_MANCHES).toBe(3);
    expect(manchesVues).toBe(3);
    expect(e.manche).toBe(2);
    expect(coupsPossibles(e)).toEqual([]);
    expect(joueurAttendu(e)).toBe(null);
  });

  it('mancheSuivante redistribue une manche neuve et garde les scores', () => {
    const rng = creerRng(5);
    let e = avancerJusqua(debut(2, 5), (x) => x.phase === 'finManche', rng);
    const scores = [...e.scores];
    const f = jouer(e, { type: 'mancheSuivante' }, rng);
    expect(f.manche).toBe(1);
    expect(f.phase).toBe('pointer');
    expect(f.scores).toEqual(scores);
    expect(f.tour).toBe(0);
    expect(f.revelees).toBe(0);
    expect(f.resultats).toEqual([]);
    for (let p = 0; p < 2; p++) {
      expect(f.mains[p]).toHaveLength(6);
      expect(f.pioches[p]).toHaveLength(7);
      expect(f.defausses[p]).toHaveLength(0);
      expect(f.secretes[p]).toBe(null);
    }
    expect(f.cases.every((c) => c.cartes.length === 0)).toBe(true);
    expect(f.cases.filter((c) => c.visible)).toHaveLength(1);
    expect(f.cases.map((c) => c.valeur).sort((a, b) => a - b)).toEqual([1, 1, 2, 3]);
  });

  for (const n of [2, 3, 4]) {
    it(`le premier joueur change à chaque manche (${n} joueurs)`, () => {
      const rng = creerRng(n);
      let e = debut(n, n);
      const premiers = [];
      let actifs = [];
      for (let m = 0; m < NB_MANCHES; m++) {
        premiers.push(e.ordre[0]);
        actifs.push(e.actif);
        expect(e.ordre).toHaveLength(n);
        expect([...e.ordre].sort()).toEqual([...Array(n).keys()]);
        e = avancerJusqua(e, (x) => x.phase === 'finManche' || x.phase === 'fin', rng);
        if (e.phase === 'finManche') e = jouer(e, { type: 'mancheSuivante' }, rng);
      }
      expect(premiers).toEqual([0, 1 % n, 2 % n]);
      expect(actifs).toEqual(premiers);
      expect(new Set(premiers).size).toBe(Math.min(n, 3));
    });
  }

  describe('gagnants', () => {
    it('renvoie le meilleur total', () => {
      expect(gagnants({ scores: [3, 7, 5] })).toEqual([1]);
    });
    it('gère l’égalité : victoire partagée', () => {
      expect(gagnants({ scores: [6, 6, 2] })).toEqual([0, 1]);
      expect(gagnants({ scores: [4, 4, 4, 4] })).toEqual([0, 1, 2, 3]);
    });
    it('tout le monde à zéro : tout le monde en tête', () => {
      expect(gagnants({ scores: [0, 0] })).toEqual([0, 1]);
    });
    it('fonctionne sur une partie terminée', () => {
      const rng = creerRng(3);
      const e = avancerJusqua(debut(4, 3), (x) => x.phase === 'fin', rng);
      const g = gagnants(e);
      expect(g.length).toBeGreaterThanOrEqual(1);
      const max = Math.max(...e.scores);
      for (const p of g) expect(e.scores[p]).toBe(max);
    });
  });
});

// ---------- coups interdits ----------

describe('coups interdits', () => {
  const interdit = /Coup interdit/;

  const coupsHorsPhase = {
    pointer: [
      { type: 'poser', garde: 'pioche', case: 0 },
      { type: 'echanger', case: 0, index: 0 },
      { type: 'passer' },
      { type: 'reveler' },
      { type: 'mancheSuivante' },
    ],
    choisir: [
      { type: 'pointer', index: 0 },
      { type: 'echanger', case: 0, index: 0 },
      { type: 'passer' },
      { type: 'reveler' },
      { type: 'mancheSuivante' },
    ],
    echange: [
      { type: 'pointer', index: 0 },
      { type: 'poser', garde: 'pioche', case: 0 },
      { type: 'reveler' },
      { type: 'mancheSuivante' },
    ],
    revelation: [
      { type: 'pointer', index: 0 },
      { type: 'poser', garde: 'pioche', case: 0 },
      { type: 'echanger', case: 0, index: 0 },
      { type: 'passer' },
      { type: 'mancheSuivante' },
    ],
    finManche: [
      { type: 'pointer', index: 0 },
      { type: 'poser', garde: 'pioche', case: 0 },
      { type: 'echanger', case: 0, index: 0 },
      { type: 'passer' },
      { type: 'reveler' },
    ],
    fin: [
      { type: 'pointer', index: 0 },
      { type: 'poser', garde: 'pioche', case: 0 },
      { type: 'echanger', case: 0, index: 0 },
      { type: 'passer' },
      { type: 'reveler' },
      { type: 'mancheSuivante' },
    ],
  };

  const rng = creerRng(123);
  const etats = {};
  etats.pointer = debut(2, 123);
  etats.choisir = jouer(etats.pointer, { type: 'pointer', index: 0 });
  etats.echange = jusquaEchange(debut(2, 123));
  etats.revelation = jusquaRevelation(debut(2, 123));
  etats.finManche = avancerJusqua(debut(2, 123), (x) => x.phase === 'finManche', creerRng(1));
  etats.fin = avancerJusqua(debut(2, 123), (x) => x.phase === 'fin', creerRng(1));

  for (const [phase, coups] of Object.entries(coupsHorsPhase)) {
    it(`la phase ${phase} refuse les coups des autres phases`, () => {
      expect(etats[phase].phase).toBe(phase);
      for (const coup of coups) {
        expect(() => jouer(etats[phase], coup), JSON.stringify(coup)).toThrow(interdit);
      }
    });
  }

  it('refuse un coup illisible', () => {
    for (const coup of [null, undefined, {}, { type: 3 }, 'pointer']) {
      expect(() => jouer(etats.pointer, coup)).toThrow(interdit);
    }
  });

  it('refuse un index de carte hors limites en phase pointer', () => {
    for (const index of [-1, 6, 7, 100, 1.5, NaN, '0', undefined, null]) {
      expect(() => jouer(etats.pointer, { type: 'pointer', index }), String(index)).toThrow(interdit);
    }
  });

  it('refuse une case hors limites en phase choisir', () => {
    for (const c of [-1, 4, 5, 100, 1.5, NaN, '0', undefined, null]) {
      expect(() => jouer(etats.choisir, { type: 'poser', garde: 'pioche', case: c }), String(c)).toThrow(interdit);
    }
  });

  it('refuse une valeur de garde inconnue', () => {
    for (const garde of ['main', 'autre', undefined, null, 0]) {
      expect(() => jouer(etats.choisir, { type: 'poser', garde, case: 0 })).toThrow(interdit);
    }
  });

  it('refuse un coup interdit en échange : type inconnu', () => {
    expect(() => jouer(etats.echange, { type: 'autre' })).toThrow(interdit);
  });

  it('l’index de carte pointée est borné par la taille réelle de la main (jusqu’au dernier tour)', () => {
    let e = debut(2, 55);
    // joue 5 tours du joueur 0 et du joueur 1 : les mains ont 1 carte restante
    for (let i = 0; i < 10; i++) {
      e = jouer(e, { type: 'pointer', index: 0 });
      e = jouer(e, { type: 'poser', garde: 'pioche', case: 0 });
    }
    expect(e.mains[e.actif]).toHaveLength(1);
    expect(() => jouer(e, { type: 'pointer', index: 1 })).toThrow(interdit);
    expect(() => jouer(e, { type: 'pointer', index: 0 })).not.toThrow();
  });

  it('un coup refusé ne modifie pas l’état reçu', () => {
    for (const phase of Object.keys(etats)) {
      const avant = clone(etats[phase]);
      for (const coup of coupsHorsPhase[phase]) {
        try {
          jouer(etats[phase], coup);
        } catch {
          /* attendu */
        }
      }
      expect(etats[phase]).toEqual(avant);
    }
  });

  it('jouer ne modifie jamais l’état reçu, pour tous les coups possibles à chaque étape', () => {
    for (const n of [2, 3, 4]) {
      const r = creerRng(n * 31);
      let e = debut(n, n * 31);
      let garde = 0;
      while (e.phase !== 'fin') {
        const avant = clone(e);
        for (const coup of coupsPossibles(e)) {
          const f = jouer(e, coup, creerRng(1));
          expect(f).not.toBe(e);
          expect(e).toEqual(avant);
        }
        e = jouer(e, coupAuHasard(e, r), r);
        if (garde++ > 5000) throw new Error('boucle');
      }
    }
  });

  it('chaque coup de coupsPossibles est accepté par jouer', () => {
    const r = creerRng(8);
    let e = debut(3, 8);
    while (e.phase !== 'fin') {
      for (const coup of coupsPossibles(e)) expect(() => jouer(e, coup, creerRng(2))).not.toThrow();
      e = jouer(e, coupAuHasard(e, r), r);
    }
  });
});

// ---------- vueJoueur ----------

describe('vueJoueur', () => {
  /** Vérifie toutes les fuites possibles de la vue `v` pour le joueur `j` construite depuis `e`. */
  function verifierVue(e, j) {
    const avant = clone(e);
    const v = vueJoueur(e, j);
    expect(e).toEqual(avant); // l'état source n'est pas modifié
    const n = e.nbJoueurs;

    for (let p = 0; p < n; p++) {
      // pioches : jamais visibles, mais la taille reste connue
      expect(v.pioches[p]).toHaveLength(e.pioches[p].length);
      expect(v.pioches[p].every((x) => x === null)).toBe(true);

      if (p === j) {
        expect(v.mains[p]).toEqual(e.mains[p]);
        expect(v.defausses[p]).toEqual(e.defausses[p]);
        expect(v.secretes[p]).toEqual(e.secretes[p]);
      } else {
        expect(v.mains[p]).toHaveLength(e.mains[p].length);
        expect(v.mains[p].every((x) => x === null)).toBe(true);
        expect(v.secretes[p] === null || v.secretes[p] === 'cachee').toBe(true);
        expect(v.secretes[p] === null).toBe(e.secretes[p] === null);
        if (e.defausseVisible) expect(v.defausses[p]).toEqual(e.defausses[p]);
        else {
          expect(v.defausses[p]).toHaveLength(e.defausses[p].length);
          expect(v.defausses[p].every((x) => x === null)).toBe(true);
        }
      }
    }

    // carte piochée : visible seulement pour le joueur actif
    if (e.cartePiochee !== null) {
      if (e.actif === j) expect(v.cartePiochee).toBe(e.cartePiochee);
      else expect(v.cartePiochee).not.toBe(e.cartePiochee);
      if (e.actif !== j) expect(v.cartePiochee).toBe('cachee');
    } else expect(v.cartePiochee).toBe(null);

    // cases
    e.cases.forEach((c, i) => {
      const retournee = i < e.revelees;
      const vc = v.cases[i];
      expect(vc.cartes).toHaveLength(c.cartes.length);
      expect(vc.visible).toBe(c.visible);
      if (retournee || c.visible) expect(vc.valeur).toBe(c.valeur);
      else expect(vc.valeur).toBe(null);
      c.cartes.forEach((carte, k) => {
        expect(vc.cartes[k].joueur).toBe(carte.joueur);
        if (retournee || carte.joueur === j) expect(vc.cartes[k].rang).toBe(carte.rang);
        else expect(vc.cartes[k].rang).toBe(null);
      });
    });

    // aucune valeur secrète ne traîne nulle part dans la vue : on vérifie sur le JSON
    // que chaque rang de carte privée absent de la vue n'apparaît pas à un endroit interdit.
    return v;
  }

  it('ne laisse fuiter aucune information privée, à chaque étape de parties aléatoires', () => {
    for (const defausseVisible of [true, false]) {
      for (const n of [2, 3, 4]) {
        const r = creerRng(n * 7 + (defausseVisible ? 1 : 0));
        let e = nouvellePartie({ nbJoueurs: n, defausseVisible }, r);
        let garde = 0;
        while (true) {
          for (let j = -1; j < n; j++) verifierVue(e, j);
          if (e.phase === 'fin') break;
          e = jouer(e, coupAuHasard(e, r), r);
          if (garde++ > 5000) throw new Error('boucle');
        }
      }
    }
  }, 60000);

  it('un spectateur (-1) ne voit aucune carte privée', () => {
    let e = debut(2, 3);
    e = jouer(e, { type: 'pointer', index: 1 });
    const v = vueJoueur(e, -1);
    expect(v.mains.flat().every((x) => x === null)).toBe(true);
    expect(v.cartePiochee).toBe('cachee');
    e = jouer(e, { type: 'poser', garde: 'pioche', case: 0 });
    const v2 = vueJoueur(e, -1);
    expect(v2.cases.flatMap((c) => c.cartes).every((c) => c.rang === null)).toBe(true);
  });

  it('le joueur voit ses propres cartes : main, carte piochée, cartes posées, défausse', () => {
    let e = debut(2, 3);
    const p = e.actif;
    e = jouer(e, { type: 'pointer', index: 2 });
    let v = vueJoueur(e, p);
    expect(v.mains[p]).toEqual(e.mains[p]);
    expect(v.cartePiochee).toBe(e.cartePiochee);
    e = jouer(e, { type: 'poser', garde: 'pioche', case: 1 });
    v = vueJoueur(e, p);
    expect(v.cases[1].cartes[0].rang).toBe(e.cases[1].cartes[0].rang);
    expect(v.defausses[p]).toEqual(e.defausses[p]);
  });

  it('le pointeur ne voit pas la carte piochée de l’actif', () => {
    let e = debut(2, 3);
    e = jouer(e, { type: 'pointer', index: 0 });
    const v = vueJoueur(e, e.pointeur);
    expect(v.cartePiochee).toBe('cachee');
    expect(JSON.stringify(v)).not.toContain(`"cartePiochee":${e.cartePiochee}`);
  });

  it('le joueur voit sa carte secrète mais pas celle des autres', () => {
    const e = jusquaEchange(debut(3, 6));
    const v = vueJoueur(e, 1);
    expect(v.secretes[1]).toBe(e.secretes[1]);
    expect(v.secretes[0]).toBe('cachee');
    expect(v.secretes[2]).toBe('cachee');
  });

  it('les cartes posées des autres restent cachées tant que la case n’est pas retournée', () => {
    let e = debut(2, 3);
    const posant = e.actif;
    e = jouer(e, { type: 'pointer', index: 0 });
    e = jouer(e, { type: 'poser', garde: 'pointee', case: 0 });
    const autre = 1 - posant;
    expect(vueJoueur(e, autre).cases[0].cartes[0].rang).toBe(null);
    expect(vueJoueur(e, posant).cases[0].cartes[0].rang).not.toBe(null);
  });

  it('la valeur des cases cachées est masquée ; la case visible garde sa valeur', () => {
    const e = debut(2, 3);
    const v = vueJoueur(e, 0);
    e.cases.forEach((c, i) => {
      if (c.visible) expect(v.cases[i].valeur).toBe(1);
      else expect(v.cases[i].valeur).toBe(null);
    });
    expect(v.cases.filter((c) => c.valeur !== null)).toHaveLength(1);
  });

  it('une case retournée montre sa valeur et toutes ses cartes', () => {
    let e = jusquaRevelation(debut(3, 14));
    e = jouer(e, { type: 'reveler' });
    e = jouer(e, { type: 'reveler' });
    for (let j = -1; j < 3; j++) {
      const v = vueJoueur(e, j);
      for (let i = 0; i < 2; i++) {
        expect(v.cases[i].valeur).toBe(e.cases[i].valeur);
        expect(v.cases[i].cartes).toEqual(e.cases[i].cartes);
      }
    }
    // les cases non retournées restent masquées pour les autres
    const v = vueJoueur(e, 0);
    for (let i = 2; i < 4; i++) {
      for (const carte of v.cases[i].cartes) if (carte.joueur !== 0) expect(carte.rang).toBe(null);
    }
  });

  it('les défausses des autres sont cachées quand defausseVisible est false, visibles sinon', () => {
    for (const defausseVisible of [true, false]) {
      let e = nouvellePartie({ nbJoueurs: 2, defausseVisible }, creerRng(2));
      e = jouer(e, { type: 'pointer', index: 0 });
      e = jouer(e, { type: 'poser', garde: 'pioche', case: 0 });
      const poseur = e.ordre[0];
      const regardeur = 1 - poseur;
      const v = vueJoueur(e, regardeur);
      expect(v.defausses[poseur]).toHaveLength(1);
      if (defausseVisible) expect(v.defausses[poseur][0]).toBe(e.defausses[poseur][0]);
      else expect(v.defausses[poseur][0]).toBe(null);
      // sa propre défausse reste visible dans tous les cas
      expect(vueJoueur(e, poseur).defausses[poseur]).toEqual(e.defausses[poseur]);
    }
  });

  it('la vue est une copie : la modifier ne change pas l’état', () => {
    const e = debut(2, 3);
    const avant = clone(e);
    const v = vueJoueur(e, 0);
    v.mains[0].push(99);
    v.cases[0].cartes.push({ joueur: 0, rang: 1 });
    expect(e).toEqual(avant);
  });

  it('les scores et la phase restent visibles pour tous', () => {
    const e = jusquaRevelation(debut(2, 3));
    const v = vueJoueur(e, -1);
    expect(v.scores).toEqual(e.scores);
    expect(v.phase).toBe(e.phase);
    expect(v.manche).toBe(e.manche);
  });
});

// ---------- parties complètes ----------

describe('200 parties aléatoires', () => {
  it('toutes se terminent et chaque joueur garde exactement 13 cartes à tout moment', () => {
    for (let i = 0; i < 200; i++) {
      const n = 2 + (i % 3);
      const rng = creerRng(1000 + i);
      let e = nouvellePartie({ nbJoueurs: n, defausseVisible: i % 2 === 0 }, rng);
      let pas = 0;
      verifierInvariant(e);
      while (e.phase !== 'fin') {
        const coups = coupsPossibles(e);
        expect(coups.length, `partie ${i} phase ${e.phase}`).toBeGreaterThan(0);
        e = jouer(e, coups[Math.floor(rng() * coups.length)], rng);
        verifierInvariant(e);
        if (++pas > 2000) throw new Error(`partie ${i} : ne se termine pas`);
      }
      expect(e.manche).toBe(NB_MANCHES - 1);
      expect(e.scores.every((s) => Number.isInteger(s) && s >= 0)).toBe(true);
      expect(e.scores.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(7 * NB_MANCHES);
      expect(gagnants(e).length).toBeGreaterThanOrEqual(1);
      expect(coupsPossibles(e)).toEqual([]);
      expect(() => jouer(e, { type: 'reveler' })).toThrow(/Coup interdit/);
    }
  }, 120000);

  it('la même graine rejoue exactement la même partie', () => {
    const jouerTout = (graine) => {
      const rng = creerRng(graine);
      let e = nouvellePartie({ nbJoueurs: 3 }, rng);
      while (e.phase !== 'fin') e = jouer(e, coupAuHasard(e, rng), rng);
      return e;
    };
    expect(jouerTout(5)).toEqual(jouerTout(5));
  });
});
