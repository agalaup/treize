# Treize — fiche de playtest

À remplir pendant une vraie partie avec de vrais joueurs. Une fiche par séance.

## Avant de jouer

- Date : ...
- Nombre de joueurs : 2 / 3 / 4
- Mode : passe-l'appareil / en ligne / contre des bots
- Appareils : téléphone, tablette, ordinateur ?
- Les joueurs connaissent-ils déjà le jeu ? oui / non

## Règle d'or

Ne rien expliquer pendant les 5 premières minutes. Regarde et note où les joueurs bloquent. Une explication donnée à l'oral cache un défaut du jeu.

## Compréhension (premières minutes)

- [ ] Les joueurs lancent une partie sans aide.
- [ ] Ils comprennent quoi faire à leur premier tour sans lire les règles.
- [ ] Ils comprennent pourquoi un autre joueur pointe une carte de leur main.
- [ ] Ils comprennent que la valeur des cases est cachée, sauf une.
- [ ] Ils comprennent la carte secrète et l'échange de fin de manche.
- [ ] À la révélation, ils comprennent qui gagne chaque case et pourquoi.
- [ ] L'écran « Règles » répond à leurs questions.

Questions posées à voix haute (les noter mot pour mot) :

- ...

## Plaisir

- [ ] Quelqu'un a bluffé ou cru à un bluff.
- [ ] Il y a eu une surprise à la révélation (rire, cri, « oh non »).
- [ ] Personne ne décroche pendant le tour des autres.
- [ ] Le joueur en retard après la manche 1 y croit encore.
- [ ] Les joueurs veulent refaire une partie.

Durée d'une manche : ... min. Durée de la partie : ... min. Visé : 15 minutes par manche au plus.

## Règles à confirmer

Ces valeurs ont été choisies par défaut. Les joueurs doivent les confirmer.

| Règle | Valeur actuelle | Ça marche ? | Remarque |
|---|---|---|---|
| Qui pointe | le joueur suivant | | |
| Égalité sur une case | la plus grosse carte gagne, sinon personne | | |
| Nombre de manches | 3 | | |
| Cartes en main | 6, plus 7 dans la pioche | | |
| Carte secrète | 1 échange possible en fin de manche | | |
| Défausse | visible (réglable) | | |

## Équilibrage : ce que dit le simulateur

Chiffres à comparer avec les vraies parties (`npm run simuler`, bots « gourmand », 400 parties, graine 1) :

- À 2 joueurs, environ 1 case sur 4 reste vide et 6 % finissent à égalité sans gagnant.
- Le premier joueur ne gagne pas plus souvent que l'autre (47 % contre 53 %).
- La carte secrète est échangée 2 fois sur 3.
- Une partie sur 16 finit en victoire partagée.

À vérifier avec de vrais joueurs :

- [ ] Y a-t-il aussi des cases vides ? Est-ce frustrant ou tendu ?
- [ ] Les joueurs trouvent-ils une stratégie qui gagne à tous les coups ?
- [ ] Commencer est-il un avantage ou un handicap ?
- [ ] La case « +3 » décide-t-elle de tout ?

## Confort

- [ ] Les cartes et les chiffres se lisent sur un téléphone.
- [ ] Les boutons se touchent sans erreur.
- [ ] Passe-l'appareil : personne ne voit les cartes d'un autre.
- [ ] Recharger la page puis « Reprendre la partie » retrouve la partie.
- [ ] Le jeu s'installe sur l'écran d'accueil du téléphone.
- [ ] Une fois installé, le jeu s'ouvre sans réseau (solo et passe-l'appareil).

## En ligne

- [ ] Créer un salon et donner le code prend moins d'une minute.
- [ ] Un téléphone en 4G et un autre en Wi-Fi arrivent à jouer ensemble.
- [ ] Partie à 3 ou 4 appareils jusqu'au bout.
- [ ] Un joueur qui perd la connexion comprend ce qui se passe.

## Bilan de la séance

- Le meilleur moment : ...
- Le pire moment : ...
- 3 choses à changer, par ordre d'importance :
  1. ...
  2. ...
  3. ...

Reporter les idées dans `docs/idees-plus-tard.md` et les bugs dans `docs/registre.md`.
