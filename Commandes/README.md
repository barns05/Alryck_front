# Commandes — front Alryck

Scripts PowerShell d'exploitation du **front uniquement**. Le back a les siens, dans son
dépôt : `C:\Developpement\Alryck\New\Back_git\Alryck_back\Commandes`.

Les deux se déploient **indépendamment** : deux images, deux charts, deux releases Helm, dans
le même namespace `alryck-<env>`. Livrer une correction de front ne redéploie pas l'API.

```powershell
cd C:\Developpement\Alryck\New\Front\Alryck_front\Commandes
.\00_env_ovh.ps1
```

## Local

| Script | Rôle |
|---|---|
| `01_build_local.ps1` | `npm run build` — **à lancer avant chaque push** |
| `02_run_local.ps1` | serveur de développement, port 5173 |
| `03_docker_image_locale.ps1` | construit l'image — dépannage seulement |

## En ligne

| Script | Fréquence |
|---|---|
| `00_env_ovh.ps1` | à chaque session de terminal |
| `06_push_image_ghcr.ps1` | dépannage seulement |
| `08_helm_front.ps1` | à chaque livraison |
| `09_verifier_deploiement.ps1` | après chaque livraison |

## Livrer

```powershell
.\01_build_local.ps1              # avant de pousser
git push                          # GitHub Actions construit et publie
.\00_env_ovh.ps1
.\08_helm_front.ps1 -Env dev -Tag a1b2c3d
.\09_verifier_deploiement.ps1 -Env dev
```

**Toujours passer `-Tag`.** Sans lui, Helm régénère des manifestes identiques — le tag `dev`
n'a pas changé de nom — ne voit aucune différence et **ne redéploie rien**, alors qu'une
nouvelle image existe bien sur ghcr. La commande réussit, rien ne bouge.

## Le point à ne pas rater

**L'adresse de l'API est figée à la construction de l'image**, pas au déploiement. Vite
substitue les `import.meta.env` dans le bundle : il n'y a plus de variable à lire à
l'exécution. Le workflow GitHub choisit l'adresse selon la branche — `develop` construit pour
`api.alryck-dev.geo2i.com`, `main` pour `api.alryck.geo2i.com`.

Conséquence : **déployer en production une image construite depuis `develop` ferait taper la
production sur la base de recette**, sans aucun signe visible à l'écran. Les écrans se
rempliraient normalement, avec les mauvaises données. Vérifie toujours de quelle branche vient
le SHA que tu déploies.

C'est aussi pourquoi `09_verifier_deploiement.ps1` interroge l'API de l'environnement : si
elle ne répond pas, le front s'affichera mais restera vide.

## Ce qui n'est pas dans le dépôt

| Fichier | Contenu |
|---|---|
| `..\kubeconfig.yml` | accès au cluster — le même que le back |
| `.ghcr_token` | jeton GitHub `write:packages` + `read:packages` |

Le front n'a **aucun secret applicatif** : ni base, ni clé, ni mot de passe. C'est un paquet de
fichiers statiques.
