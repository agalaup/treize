# Treize

Jeu de cartes à cases cachées, pour 2 à 4 joueurs. Bluff, stratégie, règles simples, 15 minutes par manche.

Chaque joueur a une famille de 13 cartes, de 1 à 13. Il les pose une à une, face cachée, sur 4 cases dont la valeur est cachée (+1, +1, +2, +3). À la révélation, la plus grosse somme gagne les points de chaque case. Après 3 manches, le meilleur total gagne.

## Jouer

**Jouer en ligne : https://agalaup.github.io/treize/**

- Seul contre des bots.
- À plusieurs sur un seul appareil, en se le passant.
- En ligne entre amis : un joueur crée un salon et donne son code à 4 lettres.

Les règles complètes tiennent sur une page : [docs/regles-express.md](docs/regles-express.md).

## Lancer le jeu sur son ordinateur

```
npm install
npm run dev
```

## Vérifier

```
npm run check
```

Lance les tests des règles puis construit le jeu.

## Équilibrage

```
npm run simuler -- --parties 2000 --joueurs 3
```

Joue des milliers de parties entre bots et affiche les chiffres. La fiche pour tester avec de vrais joueurs : [docs/playtest.md](docs/playtest.md).

## Comment c'est fait

- `src/logic/` : les règles, les bots et le salon. Fonctions pures, testées.
- `src/net/` : le jeu en ligne sans serveur. L'appareil de l'hôte fait l'arbitre et n'envoie à chacun que ses propres cartes.
- `src/ui/` : l'affichage. Il ne contient aucune règle.
