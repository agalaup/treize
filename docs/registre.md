# Treize — registre

## Décisions

Voir le tableau daté dans `docs/conception.md`.

## À faire par le propriétaire

- Renommer la conversation d'origine : `🎲 Treize — Idées (passé en Code)`.
- Renommer la session Claude Code : `🎲 Treize — Studio`.
- Choisir un dossier définitif pour le projet.
- Confirmer en jouant les valeurs par défaut : qui pointe, départage des égalités, 3 manches.

## En attente

- Jalon 3, lancé le 2026-11-20. Fait : `src/logic/salon.js` (salon privé sans réseau : code à 4 lettres, hôte, tour vérifié, vue par joueur) et `tests/salon.test.js` (12 tests). Reste : serveur, écrans en ligne, mise en ligne.
- Serveur : le propriétaire a choisi « sans serveur (P2P) » le 2026-11-20. Fait en v0.3 (`src/net/arbitre.js`, `src/net/p2p.js`, écrans dans `src/ui/app.js`).
- Encore en attente du propriétaire :
  1. Dossier définitif du projet (le dossier actuel disparaît avec la session).
  2. Hébergement de la page : GitHub Pages, Vercel ou Netlify, et oui écrit avant la mise en ligne. Sans hébergement, le mode en ligne ne marche qu'entre onglets du même ordinateur.
- Jalon 3, non vérifié à l'écran : fin de partie vue par un invité, échange en ligne, erreurs « salon introuvable » et « salon complet », partie à 3 ou 4 appareils, deux réseaux différents (4G contre Wi-Fi), largeur 1440 px.
- À améliorer : la connexion perdue est reconnue par le texte du message ; un code d'erreur serait plus sûr.
- Contexte de la session chef à 66 % le 2026-11-20 : reprendre le jalon 3 après `/fresh`.

## Plus tard

Voir `docs/idees-plus-tard.md`.

## Mémoire du projet

- Code d'origine : `import/index.html` (V1, ne pas modifier).
- Règles : `src/logic/treize.js`, fonctions pures, sans affichage ni hasard caché (le hasard passe par `rng`).
- Affichage : `src/main.js`, ne contient aucune règle.
- Piège : `vueJoueur` est la seule porte d'entrée pour montrer l'état à un joueur. Le jeu en ligne devra envoyer cette vue, jamais l'état complet.

- Piège pour le jeu en ligne : `jouer` ne vérifie pas QUI joue le coup. Le serveur devra comparer l'auteur du coup à `joueurAttendu(etat)` avant de l'appliquer.
- Tests : `tests/treize.test.js`, 104 tests. Deux sont lents (200 parties aléatoires), `npm test` prend environ 20 secondes.
- Relecture par `treize-relecteur` : faite avant la v0.2. Restent 3 défauts mineurs, à traiter au jalon 3 :
  - pendant l'écran de passage, « Quitter » et « Règles » ne répondent pas (table inerte) ;
  - `src/ui/app.js` décide lui-même quelles cartes sont échangeables ou pointables, au lieu de partir de `coupsPossibles(vue)` ;
  - le contraste n'a été mesuré que pour la case « +2 ».
- Équilibrage, premier chiffre : un bot qui concentre ses grosses cartes sur une seule case perd contre le hasard (73 victoires contre 302 sur 400 parties à 2). Tout miser sur une case n'est donc pas trop fort. Le bot actuel répartit ses cartes et gagne plus de 9 parties sur 10 contre le hasard.
- Plugin Context Mode : il réécrit chaque consigne d'agent, qu'il faut alors renvoyer une deuxième fois à l'identique. Garder les consignes d'agent courtes.

- Mise en ligne (2026-11-21) : dépôt public `agalaup/treize`, choix du propriétaire « tout le code ». Jeu servi sur https://agalaup.github.io/treize/. Chaque envoi sur `main` relance les tests, le build et la publication (`.github/workflows/pages.yml`).
- Le connecteur GitHub de l'appli ne peut pas créer de dépôt (403). Le dépôt a été créé par le navigateur de l'appli, à la demande du propriétaire.

- Vie privée (décidé le 2026-11-22, fait le 2026-11-23) : à la demande du propriétaire, le dépôt public a été supprimé puis recréé sans historique. Le dossier `import/` (notes personnelles) n'est plus publié : il reste sur l'ordinateur, dans `F:\Treize\import`, et il est dans `.gitignore`. C'est la seule exception à la règle « jamais de suppression d'historique », décidée par le propriétaire. L'ancien historique (v0.0 à v0.2) n'existe plus en ligne ; le dépôt repart de la v0.3.
- Jalon 4 (2026-11-23) : la sauvegarde vit dans `src/ui/sauvegarde.js` (clé `treize-partie` du navigateur, version 1 : changer le numéro si la forme de l'état change). Le service worker est `public/sw.js` : changer `CACHE` pour forcer l'oubli des vieilles copies. Icônes refaites par `npm run icones`.
- Simulateur, premier relevé : à 2 joueurs entre bots « gourmand », 1 case sur 4 reste vide. À comparer avec de vrais joueurs (`docs/playtest.md`).
- Avant de publier : ne jamais mettre de prénom réel, d'adresse ou de chemin de l'ordinateur dans un fichier suivi par git.

## Résultat

| Date | Demande | Résultat | Version |
|---|---|---|---|
| 2026-11-20 | Créer le projet et reprendre la V1 | Projet créé, règles séparées et testées, 4 cases, 3 manches | v0.0, v0.1 |
| 2026-11-20 | Créer une équipe (agents, sous-sessions) | 4 agents dans `.claude/agents/`, 3 sous-sessions prévues, périmètres écrits | v0.1 |
| 2026-11-20 | Jalon 2 : table Treize | Nouveau design, table animée, bots, écran Règles, relecture faite | v0.2 |
| 2026-11-20 | Jalon 3 : jeu en ligne sans serveur | Salon privé avec code, arbitre chez l'hôte, essai réel entre deux onglets | v0.3 |
| 2026-11-21 | Mettre le jeu en ligne | Dépôt public et page GitHub Pages | v0.3 |
| 2026-11-23 | Jalon 4 : confort | Sauvegarde automatique, appli installable, simulateur, fiche de playtest | v0.4 |
| 2026-11-23 | Retirer les notes personnelles du dépôt public | Dépôt supprimé puis recréé sans historique, `import/` non publié, page remise en ligne | v0.3 |
