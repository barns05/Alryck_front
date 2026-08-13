# =====================================================================
#  DEPLOIEMENT DU FRONT ALRYCK VIA HELM
# =====================================================================
#  Deploie le chart helm\alryck-front en release alryck-front-<env>, dans
#  le namespace alryck-<env> - le MEME que le back, mais une release
#  Helm distincte : livrer une correction de front ne redeploie pas
#  l'API, et inversement.
#
#  PRE-REQUIS :
#   - helm et kubectl installes (winget install Helm.Helm Kubernetes.kubectl)
#   - $env:KUBECONFIG et $env:GHCR_TOKEN poses (.\00_env_ovh.ps1)
#   - l'image publiee par GitHub Actions (onglet Actions du depot front)
#
#  LIVRER = EPINGLER LE SHA COURT AFFICHE PAR LA CI :
#     .\08_helm_front.ps1 -Env dev -Tag a1b2c3d
#  Sans -Tag, Helm regenere des manifestes IDENTIQUES (le tag "dev" ne
#  change pas de nom) : il ne voit aucune difference et NE REDEPLOIE RIEN,
#  alors qu'une nouvelle image existe bien sur ghcr.
#
#  Voir ce qui changerait sans rien appliquer :
#     .\08_helm_front.ps1 -Env dev -Tag a1b2c3d -DryRun
#
#  Le front n'a ni migration ni secret : son deploiement est un simple
#  remplacement de pods. C'est aussi pour cela qu'il merite sa propre
#  release - il peut etre livre dix fois par jour sans risque.
# =====================================================================

param(
    [ValidateSet("dev","prod")]
    [string]$Env = "dev",

    # SHA court du commit affiche par GitHub Actions (recommande).
    [string]$Tag = "",

    [switch]$DryRun,

    [string]$Timeout = "5m"
)

$ErrorActionPreference = "Stop"

$GhcrUser = "barns05"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Chart    = Join-Path $RepoRoot "helm\alryck-front"
$Values   = Join-Path $Chart "values-$Env.yaml"
$Ns       = "alryck-$Env"
$Release  = "alryck-front-$Env"

function Require($cond, $msg) { if (-not $cond) { throw $msg } }
Require ($env:KUBECONFIG) 'Definis d''abord : $env:KUBECONFIG (lancer .\00_env_ovh.ps1)'
Require (Test-Path $Chart)  "Chart introuvable : $Chart"
Require (Test-Path $Values) "Fichier de valeurs absent : $Values"

if (-not $Tag) {
    Write-Host "ATTENTION : aucun -Tag fourni." -ForegroundColor Yellow
    Write-Host "  Le tag de values-$Env.yaml sera utilise. S'il n'a pas change de NOM," -ForegroundColor Yellow
    Write-Host "  Helm ne verra aucune difference et ne redeploiera pas la nouvelle image." -ForegroundColor Yellow
    Write-Host "  Utilise le SHA court affiche par la CI : -Tag a1b2c3d" -ForegroundColor Yellow
    Write-Host ""
}

if (-not $DryRun) {
    # Secret de pull, idempotent. Le back le pose aussi : le premier des deux qui passe
    # l'installe, et ce script reste utilisable seul, sans dependre de l'ordre.
    Require ($env:GHCR_TOKEN) 'Definis d''abord : $env:GHCR_TOKEN (lancer .\00_env_ovh.ps1)'

    kubectl create namespace $Ns --dry-run=client -o yaml | kubectl apply -f -
    kubectl -n $Ns create secret docker-registry ghcr-cred `
        --docker-server=ghcr.io --docker-username=$GhcrUser --docker-password=$env:GHCR_TOKEN `
        --dry-run=client -o yaml | kubectl apply -f -
}

Write-Host "=== Deploiement Helm : release $Release  ->  namespace $Ns ===" -ForegroundColor Magenta
if ($Tag)    { Write-Host "    image.tag = $Tag" -ForegroundColor Magenta }
if ($DryRun) { Write-Host "    MODE SIMULATION : rien ne sera applique" -ForegroundColor Yellow }

$helmArgs = @(
    "upgrade", "--install", $Release, $Chart, "-n", $Ns, "--create-namespace",
    "-f", $Values
)
if ($Tag)    { $helmArgs += @("--set", "image.tag=$Tag") }
if ($DryRun) { $helmArgs += @("--dry-run", "--debug") }
else         { $helmArgs += @("--wait", "--timeout", $Timeout) }

helm @helmArgs
if ($LASTEXITCODE -ne 0) { throw "Echec du helm upgrade --install" }

if ($DryRun) {
    Write-Host "`nSimulation terminee : rien n'a ete applique." -ForegroundColor Green
    return
}

Write-Host "`n=== Etat ===" -ForegroundColor Cyan
kubectl -n $Ns get pods,ingress,certificate -l app.kubernetes.io/instance=$Release

Write-Host "`n=== Image reellement deployee ===" -ForegroundColor Cyan
kubectl -n $Ns get deploy -l app.kubernetes.io/instance=$Release -o wide

Write-Host "`nDeploiement termine. Verification : .\09_verifier_deploiement.ps1 -Env $Env" -ForegroundColor Green
