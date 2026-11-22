# Treize — conception

Récap validé le 2026-11-20. Ancien titre de travail : « Les cases cachées ».

## Concept

Jeu de cartes avec des cases à points cachés. Chacun pour soi, bluff et stratégie, règles simples.

- Public : amis, à la maison ou à distance.
- Joueurs : 2 à 4, chacun pour soi.
- Durée : environ 15 minutes par manche, 3 manches par partie.

## Un tour

1. Le joueur suivant pointe à l'aveugle une carte de la main du joueur actif.
2. Le joueur actif pioche.
3. Il garde la pioche ou la carte pointée, et la pose face cachée sur une case.
4. L'autre carte va à sa défausse.

## Règles

1. Chaque joueur a une famille de 13 cartes (1 à 13) : 6 en main, 7 en pioche.
2. Il y a toujours 4 cases, quel que soit le nombre de joueurs : +1, +1, +2, +3.
3. Les cases sont posées au hasard, valeurs cachées, sauf une case +1 visible dès le départ.
4. La défausse est visible ou cachée, au choix avant la partie.
5. Qui pointe : le joueur suivant dans l'ordre du tour (à 2 joueurs, l'adversaire).
6. Après 6 tours chacun, la main est vide et il reste 1 carte de pioche : la carte secrète.
7. Avant la révélation, chaque joueur peut échanger sa carte secrète avec une de ses cartes déjà posées. L'ancienne carte va à la défausse.
8. Révélation : sur chaque case, on additionne les cartes de chaque famille. La plus grosse somme gagne les points de la case.
9. Égalité sur une case : la plus haute carte gagne, sinon personne ne marque.
10. Fin de partie : 3 manches, le meilleur total gagne. Égalité au total : victoire partagée.
11. Le premier joueur change à chaque manche.

## Matériel

- V1 : jeu de 52 cartes classique + 4 jokers comme cases.
- V2 : 4 familles de 13 cartes en couleur pleine + 4 cases à deux faces (+? d'un côté, valeur de l'autre ; la case visible a +1 des deux côtés).

## Décisions

| Date | Décision | État |
|---|---|---|
| avant 2026-11-20 | Garder la V1 (52 cartes) intacte, créer la V2 à part | décidé |
| avant 2026-11-20 | Cartes posées face cachée toute la partie | décidé |
| avant 2026-11-20 | Une case +1 montrée au départ | décidé |
| avant 2026-11-20 | Défausse visible ou cachée, au choix des joueurs | décidé |
| avant 2026-11-20 | Couleurs V2 : bleu, blanc, jaune, brique ; cases en gris et noir, plus foncées quand elles valent plus | décidé |
| avant 2026-11-20 | Style épuré : aplats, un grand chiffre, police Outfit, une forme par famille | décidé |
| 2026-11-20 | 4 cases toujours, quel que soit le nombre de joueurs (remplace « 2 cases par joueur ») | décidé |
| 2026-11-20 | Qui pointe : le joueur suivant | valeur par défaut, à confirmer en jouant |
| 2026-11-20 | Égalité : plus haute carte, sinon personne | valeur par défaut, à confirmer en jouant |
| 2026-11-20 | Fin : 3 manches, meilleur total | valeur par défaut, à confirmer en jouant |
| 2026-11-20 | Logo A (XIII en 4 cartes) et dos B (quatre formes) | valeur par défaut, à confirmer au jalon 2 |
| 2026-11-20 | Jeu en ligne : salon privé avec code, pas de parties publiques | décidé |

## Questions ouvertes

- Tout miser sur une seule case est-il trop fort ? Premier chiffre (2026-11-20) : non, un bot qui le fait perd contre le hasard. À confirmer avec le simulateur du jalon 4.
- Trop de hasard si on ne peut rien deviner des cases ? (variante : révéler une case par tour)
- À 4 joueurs, 24 cartes sur 4 cases : trop d'égalités ? Un joueur peut finir une manche à 0.
- Formulation exacte de la carte secrète.

## Variantes à tester

- Défausse visible contre cachée.
- 3 manches contre course à X points.
- Cases révélées une par tour.

## Identité

- Moodboard : https://claude.ai/artifact/ANQitgtamr4eGnHUP91zyD (piste 2 retenue).
- Couleurs : bleu `#1F4FD8`, blanc `#FFFFFF`, jaune `#F2B705`, brique `#B84A2E`, noir `#111111`, gris moyen `#8A8984`, gris clair `#BDBBB4`, table `#E4E2DB`, dos de carte `#2A2A28`.
- Police : Outfit, graisse 500.
- Formes : rond, carré, triangle, losange (une par famille).
