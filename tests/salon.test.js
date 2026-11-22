import { describe, it, expect } from 'vitest';
import { creerRng, coupsPossibles, joueurAttendu } from '../src/logic/treize.js';
import {
  creerCode,
  codeValide,
  creerSalon,
  rejoindre,
  quitter,
  demarrer,
  jouerCoup,
  vueSalon,
} from '../src/logic/salon.js';

const A = { id: 'secret-a', nom: 'Alex' };
const B = { id: 'secret-b', nom: 'Léa' };
const C = { id: 'secret-c', nom: 'Sam' };

function salonLance(joueurs = [A, B], graine = 1) {
  let s = creerSalon('ABCD', joueurs[0]);
  for (const j of joueurs.slice(1)) s = rejoindre(s, j);
  return demarrer(s, joueurs[0].id, {}, creerRng(graine));
}

describe('salon', () => {
  it('crée des codes de 4 lettres sans I, L ni O', () => {
    const rng = creerRng(3);
    for (let i = 0; i < 200; i++) {
      const code = creerCode(rng);
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
      expect(codeValide(code)).toBe(true);
    }
    expect(codeValide('ABC')).toBe(false);
    expect(codeValide('ABCO')).toBe(false);
    expect(codeValide(1234)).toBe(false);
  });

  it('accueille jusqu’à 4 joueurs et refuse le cinquième', () => {
    let s = creerSalon('ABCD', A);
    s = rejoindre(s, B);
    s = rejoindre(s, C);
    s = rejoindre(s, { id: 'd', nom: 'Zoé' });
    expect(s.joueurs).toHaveLength(4);
    expect(() => rejoindre(s, { id: 'e', nom: 'Max' })).toThrow(/complet/);
  });

  it('rejoindre deux fois ne crée pas de doublon', () => {
    let s = rejoindre(creerSalon('ABCD', A), B);
    expect(rejoindre(s, B)).toBe(s);
  });

  it('nettoie les noms : espaces, longueur, nom vide', () => {
    let s = creerSalon('ABCD', { id: 'a', nom: '   ' });
    s = rejoindre(s, { id: 'b', nom: '  Un   nom   beaucoup trop long pour la table ' });
    expect(s.joueurs[0].nom).toBe('Joueur 1');
    expect(s.joueurs[1].nom).toHaveLength(16);
  });

  it('seul l’hôte lance la partie, avec au moins 2 joueurs', () => {
    const seul = creerSalon('ABCD', A);
    expect(() => demarrer(seul, A.id)).toThrow(/au moins 2/);
    const s = rejoindre(seul, B);
    expect(() => demarrer(s, B.id)).toThrow(/hôte/);
    expect(demarrer(s, A.id, {}, creerRng(1)).phase).toBe('partie');
  });

  it('on ne rejoint pas et on ne quitte pas une partie commencée', () => {
    const s = salonLance();
    expect(() => rejoindre(s, C)).toThrow(/déjà commencé/);
    expect(() => quitter(s, B.id)).toThrow(/en cours/);
    expect(rejoindre(s, B)).toBe(s); // un joueur déjà assis peut revenir
  });

  it('quand l’hôte quitte l’attente, le suivant devient l’hôte', () => {
    const s = quitter(rejoindre(creerSalon('ABCD', A), B), A.id);
    expect(s.hote).toBe(B.id);
    expect(s.joueurs).toHaveLength(1);
  });

  it('refuse le coup d’un joueur dont ce n’est pas le tour', () => {
    const s = salonLance();
    const attendu = joueurAttendu(s.etat);
    const fautif = s.joueurs[1 - attendu].id;
    const coup = coupsPossibles(s.etat)[0];
    expect(() => jouerCoup(s, fautif, coup)).toThrow(/pas ton tour/);
    expect(() => jouerCoup(s, 'inconnu', coup)).toThrow(/pas dans ce salon/);
    expect(jouerCoup(s, s.joueurs[attendu].id, coup).etat.phase).toBe('choisir');
  });

  it('ne modifie jamais le salon reçu', () => {
    const s = salonLance();
    const copie = structuredClone(s);
    jouerCoup(s, s.joueurs[joueurAttendu(s.etat)].id, coupsPossibles(s.etat)[0]);
    expect(s).toEqual(copie);
  });

  it('la vue d’un joueur ne contient ni les identifiants ni les cartes des autres', () => {
    const s = salonLance([A, B, C]);
    const vue = vueSalon(s, B.id);
    const texte = JSON.stringify(vue);
    expect(texte).not.toContain('secret-');
    expect(vue.siege).toBe(1);
    expect(vue.siegeHote).toBe(0);
    expect(vue.joueurs.map((j) => j.nom)).toEqual(['Alex', 'Léa', 'Sam']);
    expect(vue.vue.mains[1].every((c) => typeof c === 'number')).toBe(true);
    expect(vue.vue.mains[0].every((c) => c === null)).toBe(true);
    expect(vue.vue.mains[2].every((c) => c === null)).toBe(true);
  });

  it('un inconnu reçoit une vue de spectateur', () => {
    const vue = vueSalon(salonLance(), 'inconnu');
    expect(vue.siege).toBe(-1);
    expect(vue.vue.mains.flat().every((c) => c === null)).toBe(true);
  });

  it('une partie entière se joue par le salon, puis l’hôte peut rejouer', () => {
    const rng = creerRng(9);
    let s = salonLance([A, B, C], 9);
    let garde = 0;
    while (s.etat.phase !== 'fin') {
      if (++garde > 1000) throw new Error('Partie sans fin');
      const attendu = joueurAttendu(s.etat);
      const id = s.joueurs[attendu === null ? 0 : attendu].id;
      const coups = coupsPossibles(s.etat);
      s = jouerCoup(s, id, coups[Math.floor(rng() * coups.length)], rng);
    }
    expect(() => demarrer(s, B.id)).toThrow(/hôte/);
    const suite = demarrer(s, A.id, {}, rng);
    expect(suite.etat.manche).toBe(0);
    expect(suite.etat.scores).toEqual([0, 0, 0]);
  });
});
