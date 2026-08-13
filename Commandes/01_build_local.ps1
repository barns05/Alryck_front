# =====================================================================
#  CONSTRUCTION DU BUNDLE (verification avant de pousser)
# =====================================================================
#  A lancer AVANT tout push : le build de production est plus strict que
#  le serveur de developpement. Un import mort ou une dependance retiree
#  passe inapercu sous " npm run dev " et casse " npm run build ".
#  Le decouvrir ici coute deux minutes, dans GitHub Actions dix.
#
#     .\01_build_local.ps1
#     .\01_build_local.ps1 -Propre     supprime node_modules et repart du verrou
# =====================================================================

param(
    [switch]$Propre
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

# La version de Node est epinglee dans package.json (volta) : Vite 6 exige Node >= 18.
Write-Host "=== Node $(node -v) / npm $(npm -v) ===" -ForegroundColor Cyan
$versionNode = (node -v) -replace '^v(\d+)\..*', '$1'
if ([int]$versionNode -lt 18) {
    throw "Node $versionNode est trop ancien : Vite 6 exige Node 18 minimum."
}

if ($Propre) {
    Write-Host "=== Suppression de node_modules ===" -ForegroundColor Yellow
    if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
    # npm ci et non npm install : il installe exactement le contenu du verrou, sans le
    # reecrire. C'est ce que fait la CI, donc c'est ce qu'il faut reproduire ici.
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "Echec de npm ci" }
}

Write-Host "=== Build de production ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Echec du build" }

$poids = (Get-ChildItem dist -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host ""
Write-Host ("Build reussi. dist/ pese {0:N1} Mo." -f $poids) -ForegroundColor Green
