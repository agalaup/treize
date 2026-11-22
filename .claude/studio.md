# Treize — calibrage du studio

Validé le 2026-11-20. À revoir à la fin de chaque jalon.

## Taille

Moyenne : le jalon 3 ajoute un serveur (Supabase). Jusque-là, une seule session suffit.

## Équipe

Demandée par le propriétaire le 2026-11-20 (« crée-toi une équipe, sous-sessions, agents »).

### Session chef

`🎲 Treize — Studio`. Elle reçoit les demandes, écrit le contrat commun (l'API du moteur), confie le travail, relit, fusionne, crée les versions. Elle ne publie rien sans le oui écrit du propriétaire.

### Agents (dans `.claude/agents/`)

| Agent | Rôle | Fichiers | Modèle |
|---|---|---|---|
| `treize-regles` | Moteur de règles, bots, simulateur | `src/logic/**`, `scripts/simuler.js` | Sonnet |
| `treize-interface` | Table de jeu, cartes, animations | `index.html`, `src/main.js`, `src/ui/**`, `src/*.css`, `public/**` | Sonnet |
| `treize-testeur` | Tests des règles et des parcours | `tests/**` | Sonnet |
| `treize-relecteur` | Relecture unique avant chaque version, lecture seule | aucun | Opus |

Un fichier appartient à un seul agent. Les fichiers partagés (`package.json`, config Vite, `.claude/**`, `docs/**`, `CHANGELOG.md`) sont réservés au chef.

Façon de travailler : le chef écrit ou valide d'abord le contrat (ce que le moteur expose), puis lance en parallèle les agents dont les fichiers ne se croisent pas. Le relecteur passe une seule fois, à la fin.

### Sous-sessions par domaine

Une sous-session a sa copie de travail (worktree) et sa branche. Elle commite en local et ne pousse jamais. Le chef fusionne.

| Sous-session | Jalon | Domaine | Voie |
|---|---|---|---|
| `🎲 Treize — Interface` | 2 | Table animée, identité piste 2 | Standard |
| `🎲 Treize — Règles` | 2 et 4 | Bots, puis simulateur d'équilibrage | Standard |
| `🎲 Treize — En ligne` | 3 | Salon privé, Supabase, mise en ligne | Complète |

Elles ne s'ouvrent qu'après le feu vert du jalon, et une fois le projet dans un dossier définitif (le dossier actuel disparaît avec la session).

### Fiche de mission (modèle)

```
Mission : <objectif en une phrase>
Périmètre : <fichiers autorisés>
Voie et budget : <Express 1 % / Standard 3 % / Complète 6 %>
À lire : CLAUDE.md, .claude/studio.md, docs/conception.md, <autres>
Critères de fin : <ce qui doit marcher>, npm run check passe
Rapport attendu : ce qui est fait, comment tester, hashes de commit, points à trancher
```

## Modules

| Module | État | Raison |
|---|---|---|
| S1 Session chef | activé | Toujours |
| S2 Sous-sessions par domaine | activé | À partir du jalon 2, voir « Équipe » |
| S3 Périmètres | activé | Un fichier = un agent, voir « Équipe » |
| S4 Sessions légères | activé | Le chef confie, relit et rend compte |
| S5 Agents et relecteur unique | activé | 4 agents dans `.claude/agents/` |
| S6 Voies avec budget | activé | Express 1 %, Standard 3 %, Complète 6 % |
| P1 Cerveau | activé | Toujours |
| P2 Registre | activé | `docs/registre.md` |
| P3 Mémoire | activé | Une section du registre |
| P4 Ménage | plus tard | Quand une session dépasse 60 % de contexte |
| P5 Cockpit | inutile | Trop pour ce projet |
| P6 Conception découpée | inutile | `docs/conception.md` suffit |
| Q1 Copie « -2 » | inutile | Le design part de zéro |
| Q2 Contrôle complet | activé | `npm run check` avant chaque version |
| Q3 Données réelles | plus tard | Jalon 3 : sauvegarde, essai sur copie, oui écrit |
| Q4 Historique intouchable | activé | Toujours |
| Q5 Demander au lieu de deviner | activé | Toujours |
| O1 Économie de tokens | activé | Caveman, Context Mode, Token Optimizer installés |
| O3 Équipe produit | activé en partie | `/qa` de gstack ; `/review` avant le jalon 3 |
| O4 Travail en parallèle | inutile | Une seule tâche à la fois |

## Règles

- Voie Complète obligatoire dès que le travail touche serveur, base de données, comptes, secrets, clés ou `.env`.
- Aucune écriture en base, aucun déploiement, aucun pentest sans le oui écrit du propriétaire dans la conversation.
- Agents : autorisés pour ce projet depuis le 2026-11-20, avec le modèle le moins cher de leur niveau. Jamais un modèle plus cher que celui de la session chef.
- Jamais de `git reset --hard`, jamais de suppression d'historique.
