# Treize — plan

Validé le 2026-11-20. Un jalon = une session. On demande avant de lancer le jalon suivant.

| Jalon | Résultat jouable | Coût estimé | État |
|---|---|---|---|
| 1. Reprise + règles solides | La V1 tourne hors de Claude, 4 cases, règles séparées de l'affichage et testées | 3 % | fait (v0.1) |
| 2. Table Treize | Nouveau design (piste 2), table animée, solo contre bots, passe-l'appareil conservé | 9 % | fait (v0.2) |
| 3. En ligne | Salon privé avec code, chacun sur son appareil (sans serveur, P2P) | 4 % | fait (v0.3) |
| 3 bis. Hébergement | La page est en ligne : jouable depuis les téléphones | 1 % | fait (GitHub Pages, 2026-11-21) |
| 4. Confort | Appli installable, sauvegarde de partie, simulateur d'équilibrage | 6 % | fait (v0.4) |

Les coûts sont en % de la limite hebdo Pro (ordre de grandeur).

## Jalon 2 : Table Treize

- Cartes en couleur pleine (1 à 13), cases à deux faces, logo A, dos B.
- Table : main en éventail en bas, 4 cases au centre, adversaires autour.
- Animations : cartes qui glissent, révélation case par case.
- Bots : au hasard, puis « gourmand ».
- Écran « Règles » avec la fiche règles express.

## Jalon 3 : En ligne

- Salon privé avec code à 4 lettres.
- Choix du propriétaire le 2026-11-20 : sans serveur, d'appareil à appareil (PeerJS). Supabase est abandonné pour l'instant.
- L'appareil de l'hôte fait l'arbitre (`src/net/arbitre.js`) ; les invités ne reçoivent que leur vue.
- Limites acceptées : la partie est perdue si l'hôte ferme la page ; un hôte qui modifie sa page peut voir les cartes.
- Mise en ligne (hébergement à choisir : GitHub Pages, Vercel ou Netlify).

## Jalon 4 : Confort

- Appli installable (PWA), sauvegarde automatique de la partie.
- `scripts/simuler.js` : des milliers de parties automatiques pour les questions d'équilibrage.
- `docs/playtest.md` : checklist de test avec de vrais joueurs.
