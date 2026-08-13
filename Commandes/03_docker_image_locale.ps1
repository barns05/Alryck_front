# >>> CE SCRIPT N'EST PAS LE CHEMIN NORMAL. <<<
# L'image est construite et poussee par GitHub Actions
# (.github/workflows/front-image.yml). Ne garder ceci que pour un depannage local.

# =====================================================================
#  CONSTRUCTION LOCALE DE L'IMAGE
# =====================================================================
#  L'ADRESSE DE L'API EST FIGEE ICI, a la construction : Vite substitue
#  les import.meta.env dans le bundle. Une image construite pour la
#  recette et deployee en production ferait taper la production sur la
#  base de recette, sans aucun signe visible a l'ecran.
#
#     .\03_docker_image_locale.ps1
#     .\03_docker_image_locale.ps1 -Api https://api.alryck.geo2i.com
# =====================================================================

param(
    [string]$Api = "https://api.alryck-dev.geo2i.com"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

Write-Host "=== Image front (API figee : $Api) ===" -ForegroundColor Cyan
docker build --build-arg VITE_ALRYCK_API=$Api -t alryck-front:dev .
if ($LASTEXITCODE -ne 0) { throw "Echec de la construction de l'image" }

Write-Host ""
Write-Host "Image alryck-front:dev construite." -ForegroundColor Green
Write-Host "Essai local :  docker run --rm -p 8080:8080 alryck-front:dev" -ForegroundColor Gray
