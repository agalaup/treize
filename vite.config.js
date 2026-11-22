import { defineConfig } from 'vite';

// Chemins relatifs : la page marche aussi bien à la racine d'un site
// que dans un sous-dossier (GitHub Pages sert le jeu sous /<nom-du-dépôt>/).
export default defineConfig({
  base: './',
});
