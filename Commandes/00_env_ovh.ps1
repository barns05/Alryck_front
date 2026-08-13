# =====================================================================
#  VARIABLES D'ENVIRONNEMENT POUR LE DEPLOIEMENT OVH (K8s + ghcr)
# =====================================================================
#  A lancer AVANT 06 et 08, dans le MEME terminal PowerShell :
#     .\00_env_ovh.ps1
#
#  A deposer une fois (les deux sont gitignores) :
#   - le kubeconfig du cluster (le MEME que pour le back et Consult) :
#       C:\Developpement\Alryck\New\Front\Alryck_front\kubeconfig.yml
#   - le token GitHub ghcr :
#       Commandes\.ghcr_token
#
#  Le front n'a AUCUN secret applicatif : ni base, ni cle, ni mot de passe.
#  C'est un paquet de fichiers statiques. Rien a poser cote Kubernetes en
#  dehors de l'acces aux images privees.
# =====================================================================

$RepoRoot = Split-Path $PSScriptRoot -Parent

$env:KUBECONFIG = Join-Path $RepoRoot "kubeconfig.yml"
if (Test-Path $env:KUBECONFIG) {
    Write-Host "KUBECONFIG = $env:KUBECONFIG" -ForegroundColor Green
} else {
    Write-Host "ATTENTION : $env:KUBECONFIG introuvable." -ForegroundColor Yellow
    Write-Host "  -> copier celui du back :" -ForegroundColor Yellow
    Write-Host "     Copy-Item C:\Developpement\Alryck\New\Back_git\Alryck_back\kubeconfig.yml $env:KUBECONFIG" -ForegroundColor Yellow
}

$tokenFile = Join-Path $PSScriptRoot ".ghcr_token"
if (Test-Path $tokenFile) {
    $env:GHCR_TOKEN = (Get-Content $tokenFile -Raw).Trim()
    Write-Host "GHCR_TOKEN charge depuis Commandes\.ghcr_token" -ForegroundColor Green
} else {
    $env:GHCR_TOKEN = Read-Host "Colle ton token GitHub (ghcr, write:packages)"
}

Write-Host ""
Write-Host "Variables pretes pour cette session. Enchaine avec :" -ForegroundColor Cyan
Write-Host "  .\08_helm_front.ps1 -Env dev -Tag <sha7>" -ForegroundColor Cyan
Write-Host "  .\09_verifier_deploiement.ps1 -Env dev" -ForegroundColor Cyan
