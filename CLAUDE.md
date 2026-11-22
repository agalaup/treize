# Treize

Jeu de cartes à cases cachées, 2 à 4 joueurs. Réponds en français simple.

Avant d'agir, lis `.claude/studio.md` (calibrage) et `docs/plan.md` (jalons).

## Règles toujours actives

- Les règles du jeu vivent dans `src/logic/` : fonctions pures, sans affichage. L'affichage ne contient aucune règle.
- `import/` est le code d'origine : ne jamais le modifier.
- `npm run check` doit passer avant chaque version.
- Un jalon terminé = un tag git `v0.X` + une entrée dans `CHANGELOG.md`.
- Si les règles changent, mets à jour `docs/regles-express.md` et `docs/conception.md`.
- Note chaque demande finie dans `docs/registre.md`.
- Jamais de `git reset --hard`, jamais de suppression d'historique.
- Serveur, base, secrets : voie Complète et oui écrit du propriétaire.
- Demande avant de lancer le jalon suivant.
