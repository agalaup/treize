import { describe, it, expect } from 'vitest';
import { creerRng, coupsPossibles } from '../src/logic/treize.js';
import { creerArbitre, TAILLE_MAX_MESSAGE } from '../src/net/arbitre.js';

function arbitreA2() {
  const a = creerArbitre({ code: 'ABCD', hote: { id: 'hote', nom: 'Alex' }, rng: creerRng(4) });
  expect(a.recevoir('invite', { t: 'rejoindre', nom: 'Léa' })).toEqual({ ok: true });
  return a;
}

describe('arbitre', () => {
  it('fait entrer un invité et lance la partie sur ordre de l’hôte seulement', () => {
    const a = arbitreA2();
    expect(a.ids()).toEqual(['hote', 'invite']);
    expect(a.recevoir('invite', { t: 'demarrer' }).ok).toBe(false);
    expect(a.recevoir('hote', { t: 'demarrer' })).toEqual({ ok: true });
    expect(a.vuePour('invite').phase).toBe('partie');
  });

  it('refuse les messages illisibles, inconnus ou trop longs, sans planter', () => {
    const a = arbitreA2();
    for (const mauvais of [null, 'coup', 42, {}, { t: 7 }, { t: 'tricher' }, { t: 'coup' }, { t: 'coup', coup: 'x' }]) {
      expect(a.recevoir('invite', mauvais).ok).toBe(false);
    }
    expect(a.recevoir('', { t: 'rejoindre' }).ok).toBe(false);
    expect(a.recevoir('invite', { t: 'rejoindre', nom: 'x'.repeat(TAILLE_MAX_MESSAGE) }).ok).toBe(false);
    expect(a.ids()).toEqual(['hote', 'invite']);
  });

  it('refuse le coup de celui dont ce n’est pas le tour, accepte celui du bon joueur', () => {
    const a = arbitreA2();
    a.recevoir('hote', { t: 'demarrer' });
    const vue = a.vuePour('hote').vue;
    const ids = a.ids();
    const attendu = vue.phase === 'pointer' ? vue.pointeur : vue.actif;
    const coup = coupsPossibles(vue)[0];
    const r = a.recevoir(ids[1 - attendu], { t: 'coup', coup });
    expect(r.ok).toBe(false);
    expect(r.erreur).toMatch(/pas ton tour/);
    expect(a.recevoir(ids[attendu], { t: 'coup', coup })).toEqual({ ok: true });
  });

  it('n’envoie à l’invité ni les cartes de l’hôte ni son identifiant', () => {
    const a = arbitreA2();
    a.recevoir('hote', { t: 'demarrer' });
    const vue = a.vuePour('invite');
    expect(JSON.stringify(vue)).not.toContain('hote');
    expect(vue.vue.mains[0].every((c) => c === null)).toBe(true);
    expect(vue.vue.mains[1].every((c) => typeof c === 'number')).toBe(true);
  });
});
