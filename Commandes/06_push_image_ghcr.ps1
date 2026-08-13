# >>> CE SCRIPT N'EST PAS LE CHEMIN NORMAL. <<<
# L'image est construite et poussee par GitHub Actions.
# Ne garder ceci que pour un depannage local.

# =====================================================================
#  PUSH DE L'IMAGE FRONT VERS ghcr.io
# =====================================================================
#  Pre-requis :
#    - image construite en local : .\03_docker_image_locale.ps1
#    - $env:GHCR_TOKEN pose (.\00_env_ovh.ps1)
#
#     .\06_push_image_ghcr.ps1 -Tag depannage
# =====================================================================

param(
    [string]$Tag = "dev"
)

$ErrorActionPreference = "Stop"

$GhcrUser = "barns05"

if (-not $env:GHCR_TOKEN) {
    Write-Host "Token GitHub absent. Lancer d'abord .\00_env_ovh.ps1" -ForegroundColor Yellow
    throw "Variable d'environnement GHCR_TOKEN manquante."
}

$Reg = "ghcr.io/$GhcrUser"

Write-Host "=== Login ghcr.io ($GhcrUser) ===" -ForegroundColor Cyan
$env:GHCR_TOKEN | docker login ghcr.io -u $GhcrUser --password-stdin
if ($LASTEXITCODE -ne 0) { throw "Echec du login ghcr.io" }

Write-Host "=== Push : alryck-front ===" -ForegroundColor Cyan
docker tag  alryck-front:dev "$Reg/alryck-front:$Tag"
docker push "$Reg/alryck-front:$Tag"
if ($LASTEXITCODE -ne 0) { throw "Echec du push" }

Write-Host ""
Write-Host "Image poussee (PRIVEE par defaut) : $Reg/alryck-front:$Tag" -ForegroundColor Green
