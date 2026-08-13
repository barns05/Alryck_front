# =====================================================================
#  SERVEUR DE DEVELOPPEMENT
# =====================================================================
#  Sert le front sur http://localhost:5173, branche sur l'API definie
#  dans .env.local (par defaut https://localhost:7100).
#
#  Le back se lance depuis SON depot :
#    C:\Developpement\Alryck\New\Back_git\Alryck_back\Commandes\04_run_local.ps1
#
#     .\02_run_local.ps1
#     .\02_run_local.ps1 -Api https://api.alryck-dev.geo2i.com
# =====================================================================

param(
    # Vise l'API en ligne plutot que celle du poste. Pratique pour reproduire un
    # comportement observe en recette sans avoir a monter tout le back en local.
    [string]$Api = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

if (-not (Test-Path node_modules)) {
    Write-Host "node_modules absent : installation" -ForegroundColor Yellow
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "Echec de npm ci" }
}

if ($Api) {
    Write-Host "API visee : $Api" -ForegroundColor Cyan
    $env:VITE_ALRYCK_API = $Api
}

Write-Host "=== Serveur de developpement (http://localhost:5173) ===" -ForegroundColor Cyan
npm run dev
