import { describe, it, expect } from 'vitest';
import {
  creerRng,
  nouvellePartie,
  jouer,
  coupsPossibles,
  joueurAttendu,
  vueJoueur,
  gagnants,
} from '../src/logic/treize.js';
import { choisirCoup, NIVEAUX } from '../src/logic/bots.js';

// Joue une partie entière. `niveaux[j]` est le niveau du joueur j.
function jouerPartie(graine, niveaux, surCoup) {
  const rng = creerRng(graine);
  let e = nouvellePartie({ nbJoueurs: niveaux.length }, rng);
  let garde = 0;
  while (e.phase !== 'fin') {
    if (++garde > 1000) throw new Error('Partie sans fin');
    const j = joueurAttendu(e);
    let coup;
    if (j === null) {
      coup = coupsPossibles(e)[0];
    } else {
      const vue = vueJoueur(e, j);
      coup = choisirCoup(vue, j, niveaux[j], rng);
      if (surCoup) surCoup(e, vue, j, coup);
    }
    e = jouer(e, coup, rng);
  }
  return e;
}

describe('bots', () => {
  it('propose deux niveaux', () => {
    expect(NIVEAUX).toEqual(['hasard', 'gourmand']);
  });

  for (const niveau of NIVEAUX) {
    for (const n of [2, 3, 4]) {
      it(`le bot ${niveau} ne joue que des coups autorisés à ${n} joueurs`, () => {
        for (let g = 0; g < 20; g++) {
          jouerPartie(g, new Array(n).fill(niveau), (etat, vue, j, coup) => {
            expect(coupsPossibles(etat)).toContainEqual(coup);
          });
        }
      });
    }
  }

  it('le bot gourmand garde la plus grosse des deux cartes', () => {
    let vus = 0;
    for (let g = 0; g < 20; g++) {
      jouerPartie(g, ['gourmand', 'gourmand'], (etat, vue, j, coup) => {
        if (coup.type !== 'poser') return;
        const pointee = etat.mains[j][etat.indexPointe];
        const plusGrosse = etat.cartePiochee >= pointee ? 'pioche' : 'pointee';
        expect(coup.garde).toBe(plusGrosse);
        vus++;
      });
    }
    expect(vus).toBeGreaterThan(0);
  });

  it('le bot gourmand échange sa carte secrète seulement si elle est meilleure', () => {
    let echanges = 0;
    for (let g = 0; g < 40; g++) {
      jouerPartie(g, ['gourmand', 'gourmand'], (etat, vue, j, coup) => {
        if (etat.phase !== 'echange') return;
        const posees = etat.cases.flatMap((c) => c.cartes.filter((x) => x.joueur === j).map((x) => x.rang));
        const plusPetite = Math.min(...posees);
        if (coup.type === 'echanger') {
          expect(etat.secretes[j]).toBeGreaterThan(plusPetite);
          expect(etat.cases[coup.case].cartes[coup.index].rang).toBe(plusPetite);
          echanges++;
        } else {
          expect(etat.secretes[j]).toBeLessThan(plusPetite);
        }
      });
    }
    expect(echanges).toBeGreaterThan(0);
  });

  it('le bot ne lit que sa vue : il joue pareil si on lui cache tout le reste', () => {
    // Deux états qui ne diffèrent que par les cartes cachées de l'adversaire donnent la même vue,
    // donc le même coup : le bot n'a aucun moyen de tricher.
    const e = nouvellePartie({ nbJoueurs: 2 }, creerRng(7));
    const j = joueurAttendu(e);
    const vue = vueJoueur(e, j);
    const autre = structuredClone(e);
    const adversaire = 1 - j;
    autre.pioches[adversaire].reverse();
    expect(vueJoueur(autre, j)).toEqual(vue);
    expect(choisirCoup(vueJoueur(autre, j), j, 'gourmand', creerRng(1))).toEqual(
      choisirCoup(vue, j, 'gourmand', creerRng(1)),
    );
  });

  it('le bot gourmand bat nettement le bot au hasard', () => {
    let victoires = 0;
    const parties = 100;
    for (let g = 0; g < parties; g++) {
      const fin = jouerPartie(g, ['gourmand', 'hasard']);
      const w = gagnants(fin);
      if (w.length === 1 && w[0] === 0) victoires++;
    }
    expect(victoires / parties).toBeGreaterThan(0.8);
  });
});
