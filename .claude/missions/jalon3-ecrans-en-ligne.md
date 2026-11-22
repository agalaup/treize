# Mission : écrans du jeu en ligne (jalon 3)

Agent : `treize-interface`. Voie : Standard. Dossier du projet : celui qui contient ce fichier (deux niveaux au-dessus).

## Objectif

Ajouter au jeu le mode « en ligne entre amis » : un joueur crée un salon et donne un code à 4 lettres, les autres le rejoignent, chacun joue sur son appareil. Le mode local (solo contre bots, passe-l'appareil) reste intact.

## À lire d'abord

- `.claude/agents/treize-interface.md`, `CLAUDE.md`.
- `src/ui/app.js`, `src/ui/cartes.js`, `src/style.css` : l'affichage actuel, à étendre sans le casser.
- `src/net/p2p.js` : la liaison entre appareils. Tu l'utilises, tu ne la modifies pas.
- `src/logic/salon.js`, fonction `vueSalon` : la forme de ce que tu reçois.
- `src/logic/treize.js` : `coupsPossibles`, `joueurAttendu`, `gagnants`, `NB_MANCHES` marchent aussi sur une vue.

## Le contrat réseau

```js
import { hebergerSalon, rejoindreSalon } from '../net/p2p.js';

const session = await hebergerSalon({ nom, surVue, surErreur });   // hôte
const session = await rejoindreSalon({ code, nom, surVue, surErreur }); // invité
// Les deux peuvent lever une erreur avec un message en français à afficher tel quel.

session.code                      // le code du salon
session.demarrer({ defausseVisible }) // hôte seulement, lance ou relance une partie
session.jouer(coup)               // même forme de coup que `jouer` du moteur
session.quitter()
```

`surVue(v)` est appelé à chaque changement, avec :

```js
v = {
  code,                 // 'ABCD'
  phase,                // 'attente' ou 'partie'
  siege,                // mon numéro de joueur
  siegeHote,            // numéro de l'hôte
  joueurs: [{ nom }],   // dans l'ordre des sièges
  vue,                  // null en attente ; sinon exactement ce que renvoie vueJoueur(etat, siege)
}
```

`surErreur(message)` : message court en français (coup refusé, connexion perdue).

## Ce qu'il faut faire

1. Accueil : deux boutons en plus, « Créer un salon » et « Rejoindre un salon », avec un champ pour son nom. Rejoindre demande le code (4 lettres, mis en majuscules).
2. Salle d'attente : le code en très grand, facile à lire et à dicter, la liste des joueurs avec leur couleur et leur forme, « En attente de l'hôte… » pour les invités. L'hôte choisit défausse visible ou cachée et lance avec « Lancer la partie » (désactivé à moins de 2 joueurs). Bouton « Quitter le salon ».
3. Partie en ligne : la même table que le mode local, dessinée depuis `v.vue`, vue du siège `v.siege`. Jamais d'écran de passage, jamais de bot. Quand ce n'est pas mon tour, le bandeau dit qui joue (« Léa choisit sa carte… »). Les actions communes (retourner une case, manche suivante) sont offertes à tout le monde. À la fin, « Rejouer » pour l'hôte seulement, « En attente de l'hôte… » pour les autres.
4. Un coup en ligne part avec `session.jouer(coup)` et rien d'autre : l'écran ne change que quand une nouvelle vue arrive. Désactive les boutons le temps d'attendre la vue, pour éviter les doubles envois.
5. Erreurs : affichées dans le bandeau d'erreur existant. « Connexion perdue » propose de revenir à l'accueil.
6. Corrige au passage ces deux défauts notés par le relecteur :
   - pendant l'écran de passage (mode local), « Quitter » ne répond pas : ajoute un bouton « Quitter » dans la boîte de passage ;
   - les cartes « pointables » et « échangeables » doivent venir de `coupsPossibles(vue)`, pas d'une règle recopiée dans l'affichage.

## Règles

- Périmètre : `index.html`, `src/main.js`, `src/ui/**`, `src/*.css`. Rien d'autre.
- Les noms reçus du réseau sont des données non fiables : toujours échappés avant d'entrer dans la page.
- Même identité visuelle que le reste du jeu. Téléphone d'abord, 375 px sans défilement horizontal, zones tactiles d'au moins 44 px.
- Garde les attributs `data-a` existants. Nouveaux : `creer`, `rejoindre`, `code` (champ), `monnom` (champ), `lancer`, `quitter-salon`.
- Pas de `npm install`, pas de commande git, aucun serveur à lancer (un serveur de dev tourne déjà sur le port 5173, n'y touche pas).
- Vérifie avec `npx vite build`, puis `npm test`.

## Rapport attendu

Court, en français simple : fichiers modifiés, résultat du build et des tests, ce que tu as vérifié dans le navigateur, ce que tu n'as pas pu vérifier.
