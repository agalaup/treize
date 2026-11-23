// Sauvegarde automatique de la partie locale (solo ou passe-l'appareil).
// Tout reste dans le navigateur de l'appareil : rien n'est envoyé ailleurs.
// Les parties en ligne ne sont pas sauvegardées (l'état vit chez l'hôte).

const CLE = 'treize-partie';
const VERSION = 1;
const PHASES = ['pointer', 'choisir', 'echange', 'revelation', 'finManche'];

function valide(s) {
  if (!s || s.version !== VERSION || !s.cfg || !s.etat) return false;
  const { cfg, etat } = s;
  const n = etat.nbJoueurs;
  return (
    Number.isInteger(n) && n >= 2 && n <= 4 && cfg.n === n &&
    Array.isArray(cfg.noms) && cfg.noms.length === 4 && cfg.noms.every((x) => typeof x === 'string') &&
    Array.isArray(cfg.types) && cfg.types.length === 4 && cfg.types.every((t) => t === 'humain' || t === 'bot') &&
    PHASES.includes(etat.phase) &&
    Array.isArray(etat.mains) && etat.mains.length === n &&
    Array.isArray(etat.scores) && etat.scores.length === n &&
    Array.isArray(etat.cases)
  );
}

/** Rend la partie sauvegardée ({ cfg, etat }) ou null. Ne plante jamais. */
export function lirePartie() {
  try {
    const s = JSON.parse(localStorage.getItem(CLE));
    return valide(s) ? { cfg: s.cfg, etat: s.etat } : null;
  } catch {
    return null;
  }
}

/** Garde la partie en cours. Une partie finie n'est pas gardée. */
export function ecrirePartie(cfg, etat) {
  try {
    if (!etat || etat.phase === 'fin') {
      localStorage.removeItem(CLE);
      return;
    }
    const c = { n: cfg.n, noms: cfg.noms, types: cfg.types, defausseVisible: cfg.defausseVisible };
    localStorage.setItem(CLE, JSON.stringify({ version: VERSION, cfg: c, etat }));
  } catch {
    // Stockage plein ou interdit (navigation privée) : on joue sans sauvegarde.
  }
}

export function effacerPartie() {
  try {
    localStorage.removeItem(CLE);
  } catch {
    // rien à faire
  }
}
