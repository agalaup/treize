// Écran Règles : met en page le texte de docs/regles-express.md (une seule source).
import texte from '../../docs/regles-express.md?raw';
import { esc } from './cartes.js';

function enLigne(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** Petit convertisseur : titres, paragraphes, listes à puces ou numérotées, gras. */
function markdown(src) {
  const sortie = [];
  let liste = null;
  const fermer = () => {
    if (liste) sortie.push('</' + liste + '>');
    liste = null;
  };
  for (const brut of src.split(/\r?\n/)) {
    const l = brut.trim();
    let m;
    if (!l) {
      fermer();
    } else if ((m = l.match(/^(#{1,3})\s+(.*)$/))) {
      fermer();
      const niveau = m[1].length;
      sortie.push('<h' + niveau + '>' + enLigne(m[2]) + '</h' + niveau + '>');
    } else if ((m = l.match(/^[-*]\s+(.*)$/))) {
      if (liste !== 'ul') {
        fermer();
        sortie.push('<ul>');
        liste = 'ul';
      }
      sortie.push('<li>' + enLigne(m[1]) + '</li>');
    } else if ((m = l.match(/^\d+\.\s+(.*)$/))) {
      if (liste !== 'ol') {
        fermer();
        sortie.push('<ol>');
        liste = 'ol';
      }
      sortie.push('<li>' + enLigne(m[1]) + '</li>');
    } else {
      fermer();
      sortie.push('<p>' + enLigne(l) + '</p>');
    }
  }
  fermer();
  return sortie.join('\n');
}

export function ecranRegles() {
  return (
    '<main class="regles">' +
    '<div class="regles-haut"><button type="button" class="bouton" data-a="retour">Retour</button></div>' +
    '<article class="regles-texte">' + markdown(texte) + '</article>' +
    '<div class="regles-bas"><button type="button" class="bouton primaire" data-a="retour">Retour</button></div>' +
    '</main>'
  );
}
