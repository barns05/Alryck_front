# =====================================================================
#  VERIFICATION DU DEPLOIEMENT DU FRONT
# =====================================================================
#     .\09_verifier_deploiement.ps1 -Env dev
# =====================================================================

param(
    [ValidateSet("dev","prod")]
    [string]$Env = "dev"
)

$ErrorActionPreference = "Continue"

$Ns      = "alryck-$Env"
$Release = "alryck-front-$Env"
if ($Env -eq "dev") {
    $Front = "https://app.alryck-dev.geo2i.com"
    $Api   = "https://api.alryck-dev.geo2i.com"
} else {
    $Front = "https://app.alryck.geo2i.com"
    $Api   = "https://api.alryck.geo2i.com"
}

$echecs = 0
function Etape($titre) { Write-Host "`n=== $titre ===" -ForegroundColor Cyan }
function Ok($m) { Write-Host "  OK    $m" -ForegroundColor Green }
function Ko($m) { Write-Host "  ECHEC $m" -ForegroundColor Red; $script:echecs++ }

Etape "Pods"
kubectl -n $Ns get pods -l app.kubernetes.io/instance=$Release

Etape "Certificat TLS"
kubectl -n $Ns get certificate -l app.kubernetes.io/instance=$Release
# READY=False signifie le plus souvent une resolution DNS qui n'a pas encore propage.

Etape "Service du front"
try {
    $reponse = Invoke-WebRequest $Front -TimeoutSec 15 -UseBasicParsing
    if ($reponse.StatusCode -eq 200) { Ok "le front repond" }
    else { Ko "le front renvoie $($reponse.StatusCode)" }
} catch { Ko "front injoignable : $($_.Exception.Message)" }

# Routage cote client : une adresse profonde doit rendre index.html et non un 404 nginx.
# C'est le try_files de nginx.conf qui l'assure, et c'est ce qui casse en premier si la
# configuration nginx n'a pas ete embarquee dans l'image.
try {
    $profond = Invoke-WebRequest "$Front/Evenements" -TimeoutSec 15 -UseBasicParsing
    if ($profond.StatusCode -eq 200) { Ok "routage cote client : une adresse profonde rend l'application" }
    else { Ko "adresse profonde : $($profond.StatusCode) - try_files absent de nginx.conf ?" }
} catch { Ko "adresse profonde en erreur : $($_.Exception.Message)" }

Etape "API visee par le bundle"
# L'adresse de l'API est figee a la construction : on verifie que celle de cet
# environnement repond, sinon le front s'affichera mais aucun ecran ne se remplira.
try {
    $pret = Invoke-RestMethod "$Api/readyz" -TimeoutSec 15
    if ($pret.status -eq "ready") { Ok "$Api repond" } else { Ko "$Api : reponse inattendue" }
} catch { Ko "$Api injoignable - le front s'affichera mais restera vide : $($_.Exception.Message)" }

Write-Host ""
if ($echecs -eq 0) {
    Write-Host "Tout est vert. Teste l'inscription sur $Front" -ForegroundColor Green
} else {
    Write-Host "$echecs controle(s) en echec." -ForegroundColor Red
    Write-Host "  Journaux : kubectl -n $Ns logs -l app.kubernetes.io/instance=$Release --tail=100" -ForegroundColor Yellow
    Write-Host "  Certificat : kubectl -n $Ns describe certificate -l app.kubernetes.io/instance=$Release" -ForegroundColor Yellow
}
