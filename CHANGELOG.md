# Treize — journal des versions

## v0.4 « confort » — 2026-11-23

- Sauvegarde automatique : une partie solo ou passe-l'appareil se retrouve avec « Reprendre la partie », même après avoir fermé la page. Tout reste sur l'appareil.
- Appli installable : le jeu s'ajoute à l'écran d'accueil du téléphone et s'ouvre sans réseau (solo et passe-l'appareil). Le jeu en ligne a toujours besoin du réseau.
- Simulateur d'équilibrage : `npm run simuler` joue des milliers de parties entre bots et donne les chiffres (victoires par siège, cases vides, égalités, échanges).
- Fiche de playtest : `docs/playtest.md`, à remplir pendant une vraie partie.
- Les parties en ligne ne sont pas sauvegardées.

## v0.3 « en ligne » — 2026-11-20

- Jeu en ligne entre amis, sans serveur : un joueur crée un salon, donne un code à 4 lettres, les autres le rejoignent, chacun joue sur son appareil.
- L'appareil de l'hôte fait l'arbitre : il vérifie chaque coup et n'envoie à chacun que ce qu'il a le droit de voir.
- Salle d'attente avec le code en grand et la liste des joueurs.
- Limites : si l'hôte ferme la page, la partie est perdue. Le jeu n'est pas encore hébergé : pour l'instant, le mode en ligne ne marche qu'entre onglets de cet ordinateur.
- Corrigé : « Quitter » répond pendant l'écran de passage.

## v0.2 « table Treize » — 2026-11-20

- Nouveau design : cartes en couleur pleine (bleu, blanc, jaune, brique), une forme par famille, cases grises et noires, logo XIII, police Outfit.
- Table de jeu : ta main en bas, les 4 cases au centre, les adversaires autour, cartes qui glissent, cases qui se retournent.
- Solo contre des bots : chaque siège est « Humain » ou « Bot ».
- Passe-l'appareil conservé quand il y a plusieurs humains.
- Écran « Règles » avec la fiche règles express.
- Relecture faite : 2 défauts importants corrigés (cartes d'un humain visibles pendant le tour d'un bot, double clic qui jouait deux coups).

## v0.1 « reprise » — 2026-11-20

- Le jeu tourne hors de Claude (`npm run dev`), sous son nouveau nom : Treize.
- Toujours 4 cases (+1, +1, +2, +3), quel que soit le nombre de joueurs.
- Une partie dure 3 manches, le meilleur total gagne. L'objectif en points disparaît.
- Les règles sont séparées de l'affichage (`src/logic/treize.js`) et testées.
- Coquille corrigée dans le rappel des règles.
- L'équipe est en place : 4 agents et 3 sous-sessions prévues (`.claude/studio.md`).

## v0.0 « départ » — 2026-11-20

- Le projet est créé : code d'origine dans `import/`, conception, plan et règles express dans `docs/`.
