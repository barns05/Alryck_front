# Front Alryck — ce qui a changé par rapport à la version Base44

Le code applicatif est **inchangé** : les 46 pages, les ~300 composants et les quelque huit
cents appels de données fonctionnent tels quels. Seule la plomberie a bougé.

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `src/api/base44Client.js` | **remplacé** : même interface que le SDK, mais parle au back .NET |
| `src/lib/AuthContext.jsx` | **réécrit** : même forme exposée, sans la plateforme managée |
| `src/pages/Login.jsx` | **nouveau** : l'authentification était auparavant déléguée à Base44 |
| `src/App.jsx` | route `/login` ajoutée ; liste des routes publiques complétée |
| `vite.config.js` | greffon Base44 retiré, alias `@` conservé |
| `package.json` | `@base44/sdk` et `@base44/vite-plugin` retirés |
| `.env.local` | `VITE_ALRYCK_API` — l'adresse du back |
| `src/lib/app-params.js` | supprimé : il ne servait qu'à porter l'identifiant d'application Base44 |

## Démarrage

```bash
npm install
npm run dev
```

Le back doit tourner en parallèle (`dotnet run --project src/Alryck.App`), et `VITE_ALRYCK_API`
pointer dessus. Au premier lancement, créer un compte via `/register` ou `/login`.

## Ce qui fonctionne, et ce qui ne fonctionne pas encore

**Fonctionne** : la connexion, le choix de l'entreprise quand le compte en a plusieurs, et
toutes les **lectures** des entités déjà projetées côté back — événements, clients, prospects,
types d'événement, lieux, prestataires.

**Ne fonctionne pas encore** :

- les **écritures** répondent `501` avec le code `compat.write_not_implemented`. C'est
  volontaire : elles passeront par des endpoints métier, pour que les règles s'appliquent côté
  serveur au lieu de rester dans le navigateur. Les écrans concernés afficheront une erreur
  explicite en attendant ;
- les entités dont la vue de projection n'est pas encore écrite renvoient une erreur claire
  (`compat.unknown_entity`) — il en reste une trentaine ;
- l'envoi de courriels et les appels au modèle passent désormais par le serveur : les endpoints
  existent côté client mais ne sont pas encore implémentés côté back ;
- le temps réel (`subscribe`) est dégradé en scrutation toutes les quinze secondes.

## Mesure d'usage

Chaque requête porte l'en-tête `X-Alryck-Screen`. Le serveur le journalise avec l'entité et
l'opération : c'est ce qui dira, écran par écran, ce qui passe encore par la couche de
compatibilité — et donc ce qu'il reste à basculer.

Pour l'alimenter, appeler `setCurrentScreen('NomDeLaPage')` depuis le routeur ou le layout.
Sans cela, tout est journalisé sous « inconnu », ce qui reste exploitable mais moins précis.
