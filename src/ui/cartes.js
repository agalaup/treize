// Pièces visuelles de Treize : formes, cartes, dos, logo. Aucune règle du jeu ici.

export const FAMILLES = [
  { couleur: 'bleu', forme: 'rond' },
  { couleur: 'blanc', forme: 'carré' },
  { couleur: 'jaune', forme: 'triangle' },
  { couleur: 'brique', forme: 'losange' },
];

/** Échappe un texte avant de l'insérer dans la page (contenu ou attribut). */
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const DESSINS = [
  '<circle cx="10" cy="10" r="8.5"/>',
  '<rect x="2" y="2" width="16" height="16" rx="1.5"/>',
  '<polygon points="10,2 18.5,17.5 1.5,17.5"/>',
  '<polygon points="10,1.5 18.5,10 10,18.5 1.5,10"/>',
];

/** Petite forme d'une famille, dans la couleur de la famille (identité : couleur + forme). */
export function forme(p, extra = '') {
  return (
    '<svg class="forme f' + p + (extra ? ' ' + extra : '') + '" viewBox="0 0 20 20" aria-hidden="true" focusable="false">' +
    DESSINS[p] +
    '</svg>'
  );
}

function formeSimple(p) {
  return '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">' + DESSINS[p] + '</svg>';
}

const DOS =
  '<svg class="dos-formes" viewBox="0 0 40 40" aria-hidden="true" focusable="false">' +
  '<circle cx="10" cy="10" r="7" fill="#1F4FD8"/>' +
  '<rect x="23" y="3" width="14" height="14" rx="1.5" fill="#FFFFFF"/>' +
  '<polygon points="10,23 17.5,37 2.5,37" fill="#F2B705"/>' +
  '<polygon points="30,22.5 37.5,30 30,37.5 22.5,30" fill="#B84A2E"/>' +
  '</svg>';

/**
 * Une carte. rang : nombre (face visible) ou null / 'cachee' (dos).
 * opts : { bouton: bool, cls: 'a b', attrs: 'data-x="y"', label: texte d'accessibilité, style: 'css' }
 */
export function carte(rang, p, opts = {}) {
  const dos = rang === null || rang === 'cachee' || rang === undefined;
  const balise = opts.bouton ? 'button' : 'span';
  const classes = ['carte'];
  if (dos) classes.push('dos');
  else {
    classes.push('f' + p);
    if (rang >= 10) classes.push('deux');
  }
  if (opts.cls) classes.push(opts.cls);
  const label = opts.label || (dos ? 'carte cachée' : rang + ' ' + FAMILLES[p].couleur);
  const attrs =
    (opts.bouton ? ' type="button"' : ' role="img"') +
    ' aria-label="' + esc(label) + '"' +
    (opts.style ? ' style="' + opts.style + '"' : '') +
    (opts.attrs ? ' ' + opts.attrs : '');
  const interieur = dos
    ? DOS
    : '<i class="coin" aria-hidden="true"><em>' + rang + '</em>' + formeSimple(p) + '</i><b class="grand" aria-hidden="true">' + rang + '</b>';
  return '<' + balise + ' class="' + classes.join(' ') + '"' + attrs + '>' + interieur + '</' + balise + '>';
}

/** Logo : XIII écrit avec quatre cartes, une lettre par famille. */
export function logo() {
  const lettres = ['X', 'I', 'I', 'I'];
  return (
    '<div class="logo" role="img" aria-label="Treize">' +
    lettres.map((l, i) => '<span class="logo-carte f' + i + '" aria-hidden="true">' + l + '</span>').join('') +
    '</div>'
  );
}
